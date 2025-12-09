# agenda/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import Musician, Event, Availability
from .serializers import (
    MusicianSerializer, 
    EventListSerializer, 
    EventDetailSerializer,
    EventCreateSerializer,
    AvailabilitySerializer
)
from .permissions import IsLeaderOrReadOnly


class MusicianViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para músicos (apenas leitura).
    Lista todos os músicos ativos da banda.
    """
    queryset = Musician.objects.filter(is_active=True).select_related('user').all()
    serializer_class = MusicianSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        GET /musicians/me/
        Retorna o perfil do músico logado
        """
        try:
            musician = request.user.musician_profile
            serializer = self.get_serializer(musician)
            return Response(serializer.data)
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_404_NOT_FOUND
            )


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet completo para eventos.
    
    Fluxo:
    1. Sara/Arthur criam proposta (POST /events/)
    2. Sistema cria availabilities para todos os músicos
    3. Roberto aprova/rejeita (POST /events/{id}/approve/ ou reject/)
    4. Músicos marcam disponibilidade
    """
    queryset = Event.objects.prefetch_related(
        'availabilities__musician__user'
    ).select_related('created_by', 'approved_by').all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Escolhe serializer baseado na action"""
        if self.action == 'list':
            return EventListSerializer
        elif self.action == 'create':
            return EventCreateSerializer
        return EventDetailSerializer
    
    def get_queryset(self):
        """
        Filtra eventos baseado em query params:
        - ?status=proposed,approved
        - ?my_proposals=true (eventos que eu criei)
        - ?pending_approval=true (eventos aguardando aprovação - apenas líderes)
        """
        queryset = super().get_queryset()
        
        # Filtro por status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            statuses = status_filter.split(',')
            queryset = queryset.filter(status__in=statuses)
        
        # Minhas propostas
        if self.request.query_params.get('my_proposals') == 'true':
            queryset = queryset.filter(created_by=self.request.user)
        
        # Pendentes de aprovação (apenas para líderes)
        if self.request.query_params.get('pending_approval') == 'true':
            try:
                musician = self.request.user.musician_profile
                if musician.is_leader():
                    queryset = queryset.filter(status='proposed')
            except Musician.DoesNotExist:
                queryset = queryset.none()
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Salva evento e cria availabilities para todos os músicos.
        Status inicial: 'proposed'
        """
        event = serializer.save(
            created_by=self.request.user,
            status='proposed'
        )
        
        # Criar availabilities para todos os músicos ativos
        musicians = Musician.objects.filter(is_active=True)
        availabilities = [
            Availability(musician=musician, event=event, response='pending')
            for musician in musicians
        ]
        Availability.objects.bulk_create(availabilities)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        POST /events/{id}/approve/
        Apenas líderes podem aprovar eventos propostos.
        """
        event = self.get_object()
        
        # Verifica se usuário é líder
        try:
            musician = request.user.musician_profile
            if not musician.is_leader():
                return Response(
                    {'detail': 'Apenas líderes podem aprovar eventos.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Tenta aprovar
        if event.approve(request.user):
            serializer = EventDetailSerializer(event, context={'request': request})
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'Evento não pode ser aprovado. Status atual: ' + event.get_status_display()},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        POST /events/{id}/reject/
        Body: { "reason": "motivo da rejeição" }
        Apenas líderes podem rejeitar eventos propostos.
        """
        event = self.get_object()
        
        # Verifica se usuário é líder
        try:
            musician = request.user.musician_profile
            if not musician.is_leader():
                return Response(
                    {'detail': 'Apenas líderes podem rejeitar eventos.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Pega o motivo
        reason = request.data.get('reason', '')
        
        # Tenta rejeitar
        if event.reject(request.user, reason):
            serializer = EventDetailSerializer(event, context={'request': request})
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'Evento não pode ser rejeitado. Status atual: ' + event.get_status_display()},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def set_availability(self, request, pk=None):
        """
        POST /events/{id}/set_availability/
        Body: { "response": "available|unavailable|maybe|pending", "notes": "..." }
        Marca disponibilidade do músico logado para o evento.
        """
        event = self.get_object()
        
        # Pega músico logado
        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Valida response
        response_value = request.data.get('response', 'pending')
        valid_responses = ['pending', 'available', 'unavailable', 'maybe']
        
        if response_value not in valid_responses:
            return Response(
                {'detail': f'Response inválido. Opções: {", ".join(valid_responses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cria ou atualiza a disponibilidade
        availability, created = Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                'response': response_value,
                'notes': request.data.get('notes', '')
            }
        )
        
        serializer = AvailabilitySerializer(availability)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def my_events(self, request):
        """
        GET /events/my_events/
        Retorna eventos onde o usuário logado tem availability (qualquer status)
        """
        try:
            musician = request.user.musician_profile
            events = Event.objects.filter(
                availabilities__musician=musician
            ).distinct().prefetch_related('availabilities__musician__user')
            
            serializer = self.get_serializer(events, many=True)
            return Response(serializer.data)
        except Musician.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def pending_my_response(self, request):
        """
        GET /events/pending_my_response/
        Retorna eventos onde o músico ainda não respondeu disponibilidade
        """
        try:
            musician = request.user.musician_profile
            events = Event.objects.filter(
                availabilities__musician=musician,
                availabilities__response='pending'
            ).prefetch_related('availabilities__musician__user')
            
            serializer = EventListSerializer(events, many=True, context={'request': request})
            return Response(serializer.data)
        except Musician.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)


class AvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet para disponibilidades.
    Usuários só podem ver/editar suas próprias disponibilidades.
    """
    serializer_class = AvailabilitySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra para mostrar apenas disponibilidades do músico logado"""
        try:
            musician = self.request.user.musician_profile
            queryset = Availability.objects.filter(
                musician=musician
            ).select_related('musician__user', 'event')
            
            # Filtro por status da resposta
            response_filter = self.request.query_params.get('response')
            if response_filter:
                queryset = queryset.filter(response=response_filter)
            
            # Filtro por status do evento
            event_status = self.request.query_params.get('event_status')
            if event_status:
                queryset = queryset.filter(event__status=event_status)
            
            return queryset
        except Musician.DoesNotExist:
            return Availability.objects.none()
    
    def perform_create(self, serializer):
        """Força o musician a ser o usuário logado"""
        try:
            musician = self.request.user.musician_profile
            serializer.save(musician=musician)
        except Musician.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})
    
    def perform_update(self, serializer):
        """Permite apenas atualizar a própria availability"""
        try:
            musician = self.request.user.musician_profile
            # Verifica se a availability pertence ao músico
            if serializer.instance.musician != musician:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Você não pode editar disponibilidades de outros músicos.')
            serializer.save()
        except Musician.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})