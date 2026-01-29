from django.db import transaction
from django.db.models import Count
from rest_framework import status, viewsets, mixins
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal, InvalidOperation

from agenda.models import Musician
from agenda.validators import sanitize_string
from .models import Gig, GigApplication
from .serializers import GigSerializer, GigApplicationSerializer


class GigViewSet(viewsets.ModelViewSet):
    """Endpoints para publicar e gerenciar oportunidades do marketplace."""
    serializer_class = GigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = (
            Gig.objects.all()
            .select_related('created_by')
            .prefetch_related('applications__musician__user')
            .annotate(applications_total=Count('applications'))
        )

        status_filter = self.request.query_params.get('status')
        mine = self.request.query_params.get('mine')

        if status_filter:
            qs = qs.filter(status=status_filter)

        if mine in ('true', '1', 'yes'):
            qs = qs.filter(created_by=self.request.user)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        validated = serializer.validated_data

        if not user.is_staff:
            try:
                musician = user.musician_profile
            except Musician.DoesNotExist:
                raise PermissionDenied('Apenas músicos podem publicar vagas.')

        contact_name = validated.get('contact_name') or user.get_full_name() or user.username
        contact_email = validated.get('contact_email') or user.email

        serializer.save(
            created_by=user,
            contact_name=contact_name,
            contact_email=contact_email,
        )

    def perform_update(self, serializer):
        gig = self.get_object()
        if gig.created_by != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Apenas quem publicou a vaga pode editar.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.created_by != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('Apenas quem publicou a vaga pode excluir.')
        instance.delete()

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Músico freelancer se candidata a uma vaga."""
        gig = self.get_object()
        musician = getattr(request.user, 'musician_profile', None)

        if not musician:
            return Response({'detail': 'Apenas músicos podem se candidatar.'}, status=status.HTTP_400_BAD_REQUEST)

        if gig.status in ['hired', 'closed', 'cancelled']:
            return Response({'detail': 'Esta vaga não aceita mais candidaturas.'}, status=status.HTTP_400_BAD_REQUEST)

        cover_letter = sanitize_string(request.data.get('cover_letter', ''), max_length=2000, allow_empty=True) or ''
        expected_fee = request.data.get('expected_fee')
        if expected_fee in [None, '']:
            expected_fee = None
        else:
            try:
                expected_fee = Decimal(str(expected_fee))
            except (InvalidOperation, TypeError):
                return Response({'detail': 'Valor esperado inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            if expected_fee < 0:
                return Response({'detail': 'Valor esperado não pode ser negativo.'}, status=status.HTTP_400_BAD_REQUEST)

        if GigApplication.objects.filter(gig=gig, musician=musician).exists():
            return Response({'detail': 'Você já se candidatou para esta vaga.'}, status=status.HTTP_400_BAD_REQUEST)

        application = GigApplication.objects.create(
            gig=gig,
            musician=musician,
            cover_letter=cover_letter,
            expected_fee=expected_fee,
            status='pending',
        )

        if gig.status == 'open':
            gig.status = 'in_review'
            gig.save(update_fields=['status', 'updated_at'])

        serializer = GigApplicationSerializer(application)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def applications(self, request, pk=None):
        """Lista candidaturas - somente para quem criou a vaga."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response({'detail': 'Acesso restrito ao criador da vaga.'}, status=status.HTTP_403_FORBIDDEN)

        applications = gig.applications.select_related('musician__user').all()
        serializer = GigApplicationSerializer(applications, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def hire(self, request, pk=None):
        """Contrata um músico para a vaga, rejeitando os demais."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response({'detail': 'Apenas quem publicou a vaga pode contratar.'}, status=status.HTTP_403_FORBIDDEN)

        application_id = request.data.get('application_id')
        try:
            application = gig.applications.get(id=application_id)
        except GigApplication.DoesNotExist:
            return Response({'detail': 'Candidatura não encontrada para esta vaga.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            gig.applications.exclude(id=application_id).update(status='rejected')
            application.status = 'hired'
            application.save(update_fields=['status'])
            gig.status = 'hired'
            gig.save(update_fields=['status', 'updated_at'])

        serializer = GigSerializer(gig, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Fecha a vaga sem contratação (ex: cancelamento)."""
        gig = self.get_object()
        if gig.created_by != request.user and not request.user.is_staff:
            return Response({'detail': 'Apenas quem publicou a vaga pode fechar.'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status') or 'closed'
        if new_status not in ['closed', 'cancelled']:
            return Response({'detail': 'Status inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        gig.status = new_status
        gig.save(update_fields=['status', 'updated_at'])
        serializer = GigSerializer(gig, context={'request': request})
        return Response(serializer.data)


class GigApplicationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Minhas candidaturas como músico freelancer."""
    serializer_class = GigApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        musician = getattr(self.request.user, 'musician_profile', None)
        if not musician:
            return GigApplication.objects.none()

        return (
            GigApplication.objects.filter(musician=musician)
            .select_related('gig', 'musician__user')
            .order_by('-created_at')
        )
