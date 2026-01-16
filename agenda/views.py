# agenda/views.py
import logging
from io import BytesIO
from uuid import uuid4
from datetime import timedelta, datetime, time, date

from django.db import models, transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError, features

logger = logging.getLogger(__name__)
from rest_framework.exceptions import ValidationError, PermissionDenied

from .throttles import CreateEventRateThrottle, PreviewConflictsRateThrottle, BurstRateThrottle

from .models import (
    Musician,
    Event,
    Availability,
    LeaderAvailability,
    EventLog,
    EventInstrument,
    Organization,
    Membership,
    MusicianRating,
    Connection,
    MusicianBadge,
)
from .serializers import (
    MusicianSerializer,
    MusicianUpdateSerializer,
    EventListSerializer,
    EventDetailSerializer,
    EventCreateSerializer,
    AvailabilitySerializer,
    LeaderAvailabilitySerializer,
    MusicianRatingSerializer,
    RatingSubmitSerializer,
    ConnectionSerializer,
    MusicianBadgeSerializer,
)
from .permissions import IsOwnerOrReadOnly
from .utils import get_user_organization, split_availability_with_events, award_badges_for_musician


class MusicianViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para músicos (apenas leitura).
    Lista todos os músicos ativos da plataforma.
    """
    serializer_class = MusicianSerializer
    permission_classes = [IsAuthenticated]
    
    def _scope_queryset(self, queryset):
        if self.request.user.is_staff:
            return queryset

        return queryset

    def get_queryset(self):
        queryset = Musician.objects.filter(is_active=True).select_related('user')
        queryset = self._scope_queryset(queryset)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__username__icontains=search) |
                Q(instagram__icontains=search) |
                Q(bio__icontains=search)
            )
        return queryset
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """
        GET /musicians/me/
        Retorna ou atualiza o perfil do músico logado
        """
        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.method.lower() == 'patch':
            serializer = MusicianUpdateSerializer(
                musician,
                data=request.data,
                partial=True,
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            output = MusicianSerializer(musician, context={'request': request})
            return Response(output.data)

        serializer = self.get_serializer(musician)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def instruments(self, request):
        """
        GET /musicians/instruments/
        Retorna lista de instrumentos únicos dos músicos cadastrados
        com contagem de músicos por instrumento
        """
        instrument_labels = {
            'vocal': 'Vocal',
            'guitar': 'Guitarra',
            'acoustic_guitar': 'Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'piano': 'Piano',
            'synth': 'Sintetizador',
            'percussion': 'Percussão',
            'cajon': 'Cajón',
            'violin': 'Violino',
            'viola': 'Viola',
            'cello': 'Violoncelo',
            'double_bass': 'Contrabaixo acústico',
            'saxophone': 'Saxofone',
            'trumpet': 'Trompete',
            'trombone': 'Trombone',
            'flute': 'Flauta',
            'clarinet': 'Clarinete',
            'harmonica': 'Gaita',
            'ukulele': 'Ukulele',
            'banjo': 'Banjo',
            'mandolin': 'Bandolim',
            'dj': 'DJ',
            'producer': 'Produtor(a)',
            'other': 'Outro',
        }

        # Busca instrumentos únicos com contagem
        instruments_data = (
            self._scope_queryset(Musician.objects.filter(is_active=True))
            .exclude(instrument__isnull=True)
            .exclude(instrument='')
            .values('instrument')
            .annotate(count=Count('id'))
            .order_by('instrument')
        )

        result = []
        for item in instruments_data:
            instrument = item['instrument']
            result.append({
                'value': instrument,
                'label': instrument_labels.get(instrument, instrument.capitalize()),
                'count': item['count']
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def with_availability(self, request):
        """
        GET /musicians/with_availability/
        Retorna músicos que possuem disponibilidades públicas futuras
        """
        from .models import LeaderAvailability
        from django.utils import timezone

        # IDs de músicos com disponibilidades públicas futuras
        availability_qs = LeaderAvailability.objects.filter(
            is_active=True,
            is_public=True,
            date__gte=timezone.now().date()
        )
        if not request.user.is_staff:
            try:
                request.user.musician_profile
            except Musician.DoesNotExist:
                return Response([])

        musician_ids = availability_qs.values_list('leader_id', flat=True).distinct()

        queryset = self.get_queryset().filter(id__in=musician_ids)

        # Filtro por instrumento
        instrument = request.query_params.get('instrument')
        if instrument:
            queryset = queryset.filter(instrument=instrument)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class EventViewSet(viewsets.ModelViewSet):
    """
    ViewSet completo para eventos.

    Fluxo:
    1. Músico cria proposta (POST /events/)
    2. Sistema cria availabilities para todos os músicos convidados
    3. Músicos marcam disponibilidade e confirmam o evento ao aceitar
    """
    queryset = Event.objects.prefetch_related(
        'availabilities__musician__user',
        'logs__performed_by'
    ).select_related('created_by', 'approved_by').all()
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        Permissões customizadas por action:
        - update/delete: apenas criador
        - outras: apenas autenticado
        """
        if self.action in ['update', 'partial_update', 'destroy', 'cancel']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]
        return [IsAuthenticated()]

    def get_throttles(self):
        """
        Throttles customizados por action:
        - create: limite de criação de eventos
        - preview_conflicts: limite de chamadas de preview
        - approve/reject: limite burst para ações sensíveis
        """
        if self.action == 'create':
            return [CreateEventRateThrottle()]
        if self.action == 'preview_conflicts':
            return [PreviewConflictsRateThrottle()]
        if self.action in ['approve', 'reject', 'cancel']:
            return [BurstRateThrottle()]
        return super().get_throttles()

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
        - ?pending_approval=true (eventos aguardando resposta do músico convidado)
        - ?search=termo (busca em título e local)
        - ?past=true (eventos passados)
        - ?upcoming=true (eventos futuros)
        """
        queryset = super().get_queryset()

        # Adiciona anotações para contagem de disponibilidades (otimização N+1)
        queryset = queryset.annotate(
            avail_pending=Count('availabilities', filter=Q(availabilities__response='pending')),
            avail_available=Count('availabilities', filter=Q(availabilities__response='available')),
            avail_unavailable=Count('availabilities', filter=Q(availabilities__response='unavailable')),
            avail_maybe=Count('availabilities', filter=Q(availabilities__response='maybe')),
            avail_total=Count('availabilities'),
        )

        # Exibe eventos onde o usuário participa (criador ou availability)
        if not self.request.user.is_staff:
            try:
                musician = self.request.user.musician_profile
                queryset = queryset.filter(
                    models.Q(created_by=self.request.user) |
                    models.Q(availabilities__musician=musician)
                ).distinct()
            except Musician.DoesNotExist:
                queryset = queryset.filter(created_by=self.request.user)

        # Filtro por status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            statuses = status_filter.split(',')
            # Valida que status está em choices válidos
            valid_statuses = [choice[0] for choice in Event.STATUS_CHOICES]
            statuses = [s for s in statuses if s in valid_statuses]
            if statuses:
                queryset = queryset.filter(status__in=statuses)

        # Minhas propostas
        if self.request.query_params.get('my_proposals') == 'true':
            queryset = queryset.filter(created_by=self.request.user)

        # Pendentes de convite (eventos propostos onde o músico tem availability pendente)
        if self.request.query_params.get('pending_approval') == 'true':
            try:
                musician = self.request.user.musician_profile
                queryset = queryset.filter(
                    status__in=['proposed', 'confirmed', 'approved'],
                    availabilities__musician=musician,
                    availabilities__response='pending'
                ).distinct()
            except Musician.DoesNotExist:
                return Event.objects.none()

        # Busca por título ou local
        search = self.request.query_params.get('search')
        if search:
            # Limita tamanho da query para prevenir DoS
            if len(search) > 100:
                raise ValidationError({'search': 'Busca não pode ter mais de 100 caracteres.'})
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(location__icontains=search)
            )

        # Eventos passados
        if self.request.query_params.get('past') == 'true':
            queryset = queryset.filter(event_date__lt=timezone.now().date())

        # Eventos futuros (padrão)
        if self.request.query_params.get('upcoming') == 'true':
            queryset = queryset.filter(event_date__gte=timezone.now().date())

        return queryset

    @action(detail=False, methods=['post'])
    def preview_conflicts(self, request):
        """
        POST /events/preview_conflicts/
        Body: { "event_date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM" }
        Retorna eventos que conflitam com o período (incluindo buffer de 40 minutos).
        """
        data = request.data
        try:
            event_date = date.fromisoformat(data.get('event_date'))
            start_time_value = time.fromisoformat(data.get('start_time'))
            end_time_value = time.fromisoformat(data.get('end_time'))
        except Exception:
            return Response({'detail': 'Formato inválido de data/horário.'}, status=status.HTTP_400_BAD_REQUEST)

        # Constrói datetime com detecção de cruzar meia-noite
        start_dt = timezone.make_aware(datetime.combine(event_date, start_time_value))
        if end_time_value <= start_time_value:
            end_dt = timezone.make_aware(datetime.combine(event_date + timedelta(days=1), end_time_value))
        else:
            end_dt = timezone.make_aware(datetime.combine(event_date, end_time_value))

        buffer = timedelta(minutes=40)
        # Adiciona anotações para otimizar N+1
        conflicts = Event.objects.filter(
            status__in=['proposed', 'approved', 'confirmed'],
            start_datetime__lt=end_dt + buffer,
            end_datetime__gt=start_dt - buffer
        ).select_related('created_by', 'approved_by').annotate(
            avail_pending=Count('availabilities', filter=Q(availabilities__response='pending')),
            avail_available=Count('availabilities', filter=Q(availabilities__response='available')),
            avail_unavailable=Count('availabilities', filter=Q(availabilities__response='unavailable')),
            avail_maybe=Count('availabilities', filter=Q(availabilities__response='maybe')),
            avail_total=Count('availabilities'),
        )

        if not request.user.is_staff:
            try:
                musician = request.user.musician_profile
                conflicts = conflicts.filter(
                    Q(created_by=request.user) |
                    Q(availabilities__musician=musician)
                ).distinct()
            except Musician.DoesNotExist:
                conflicts = conflicts.filter(created_by=request.user)

        serializer = EventListSerializer(conflicts, many=True, context={'request': request})
        return Response({
            'has_conflicts': conflicts.exists(),
            'count': conflicts.count(),
            'buffer_minutes': 40,
            'conflicts': serializer.data
        })
    
    def perform_create(self, serializer):
        """
        Cria evento e disponibilidades para músicos convidados.

        Novo fluxo:
        - is_solo=True: evento confirmado automaticamente, apenas criador participa
        - is_solo=False: evento fica 'proposed' até algum convidado aceitar
        - Sem convidados: evento é confirmado automaticamente
        """
        org = get_user_organization(self.request.user)

        is_solo = serializer.validated_data.get('is_solo', False)
        invited_musicians_ids = serializer.validated_data.pop('invited_musicians', [])
        required_instruments = serializer.validated_data.pop('required_instruments', [])

        if invited_musicians_ids:
            invited_musicians_ids = list(dict.fromkeys(invited_musicians_ids))

        # Transação atômica para garantir consistência
        with transaction.atomic():
            # Evento solo: confirmado automaticamente
            # Evento com convidados: aguarda confirmação dos músicos
            if is_solo:
                event = serializer.save(
                    created_by=self.request.user,
                    organization=org,
                    status='confirmed',
                    approved_by=self.request.user,
                    approved_at=timezone.now(),
                )
                self._log_event(event, 'created', 'Show solo confirmado automaticamente.')
            else:
                event = serializer.save(
                    created_by=self.request.user,
                    organization=org,
                    status='proposed',
                )
                self._log_event(event, 'created', 'Evento criado aguardando confirmação dos músicos convidados.')

            if required_instruments:
                self._save_required_instruments(event, required_instruments)

            # Buscar músico do criador
            try:
                creator_musician = self.request.user.musician_profile
            except Musician.DoesNotExist:
                creator_musician = None

            now = timezone.now()

            # Criar availability do criador (sempre 'available')
            if creator_musician:
                Availability.objects.update_or_create(
                    musician=creator_musician,
                    event=event,
                    defaults={
                        'response': 'available',
                        'notes': 'Evento criado por mim',
                        'responded_at': now,
                    }
                )

            # Se não for solo, criar availability para músicos convidados
            if not is_solo and invited_musicians_ids:
                invited_musicians = Musician.objects.filter(
                    id__in=invited_musicians_ids,
                    is_active=True
                ).exclude(user=self.request.user)  # Exclui o criador (já adicionado acima)

                for musician in invited_musicians:
                    Availability.objects.update_or_create(
                        musician=musician,
                        event=event,
                        defaults={
                            'response': 'pending',
                            'notes': '',
                            'responded_at': None,
                        }
                    )

            if not is_solo:
                self._check_and_confirm_event(event)

    def perform_destroy(self, instance):
        """
        Apenas o criador pode deletar o evento de forma definitiva.
        """
        request_user = getattr(self, 'request', None).user if hasattr(self, 'request') else None
        if request_user and instance.created_by and instance.created_by != request_user:
            raise PermissionDenied('Apenas o criador pode deletar este evento.')

        super().perform_destroy(instance)

    def _split_availability_with_events(self, availability, events):
        """
        Divide uma disponibilidade removendo os intervalos ocupados por eventos.
        Delega para função utilitária em utils.py.
        """
        return split_availability_with_events(availability, events, LeaderAvailability)

    def _save_required_instruments(self, event, required_instruments):
        if not required_instruments:
            return

        objs = []
        for item in required_instruments:
            instrument = (item.get('instrument') or '').strip()
            quantity = item.get('quantity', 1)
            if not instrument:
                continue
            objs.append(EventInstrument(
                event=event,
                instrument=instrument,
                quantity=quantity,
            ))

        if objs:
            EventInstrument.objects.bulk_create(objs)

    def _log_event(self, event, action, description):
        """Cria registro de histórico do evento"""
        EventLog.objects.create(
            event=event,
            performed_by=getattr(self.request, 'user', None) if hasattr(self, 'request') else None,
            action=action,
            description=description
        )

    def _can_user_rate_event(self, event, user):
        """
        Verifica se o usuário pode avaliar os músicos do evento.
        Apenas o criador do evento pode avaliar e somente após a data do evento.
        """
        if not event.created_by or event.created_by != user:
            return False, 'Apenas o criador do evento pode avaliar os músicos.', status.HTTP_403_FORBIDDEN

        event_end = event.end_datetime
        if not event_end and event.event_date and event.end_time:
            event_end = timezone.make_aware(datetime.combine(event.event_date, event.end_time))

        if event_end and event_end >= timezone.now():
            return False, 'Avaliações são liberadas apenas após o término do evento.', status.HTTP_400_BAD_REQUEST

        already_rated = MusicianRating.objects.filter(event=event, rated_by=user).exists()
        if already_rated:
            return False, 'Você já enviou avaliações para este evento.', status.HTTP_400_BAD_REQUEST

        return True, '', status.HTTP_200_OK

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        POST /events/{id}/approve/
        Compat: confirma participação do músico convidado.
        """
        event = self.get_object()

        if event.status == 'cancelled':
            return Response(
                {'detail': 'Evento cancelado não pode ser confirmado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Garante que o músico foi convidado para o evento
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {'detail': 'Apenas músicos convidados podem confirmar este evento.'},
                status=status.HTTP_403_FORBIDDEN
            )

        availability, created = Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                'response': 'available',
                'notes': 'Confirmado via convite',
                'responded_at': timezone.now(),
            }
        )

        if created or availability.response == 'available':
            approver_name = request.user.get_full_name() or request.user.username
            self._log_event(event, 'availability', f'Convite confirmado por {approver_name}.')

        self._check_and_confirm_event(event, confirmed_by=request.user)
        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """
        POST /events/{id}/reject/
        Body: { "reason": "motivo da rejeição" }
        Compat: recusa participação do músico convidado.
        """
        event = self.get_object()

        if event.status == 'cancelled':
            return Response(
                {'detail': 'Evento cancelado não pode ser recusado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Garante que o músico foi convidado para o evento
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {'detail': 'Apenas músicos convidados podem recusar este evento.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Pega o motivo
        reason = request.data.get('reason', '')

        Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                'response': 'unavailable',
                'notes': reason or 'Convite recusado',
                'responded_at': timezone.now(),
            }
        )

        self._log_event(
            event,
            'availability',
            f'Convite recusado por {musician.user.get_full_name() or musician.user.username}. Motivo: {reason or "Não informado."}'
        )
        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsOwnerOrReadOnly])
    def cancel(self, request, pk=None):
        """
        POST /events/{id}/cancel/
        Cancela um evento (apenas o criador pode cancelar).
        Muda o status para 'cancelled'.
        """
        event = self.get_object()

        # Apenas o criador pode cancelar
        if event.created_by != request.user:
            return Response(
                {'detail': 'Apenas o criador pode cancelar este evento.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verifica se o evento pode ser cancelado
        if event.status == 'cancelled':
            return Response(
                {'detail': 'Evento já está cancelado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Cancela o evento
        event.status = 'cancelled'
        event.save()
        self._log_event(event, 'cancelled', 'Evento cancelado pelo criador.')

        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_availability(self, request, pk=None):
        """
        POST /events/{id}/set_availability/
        Body: { "response": "available|unavailable|maybe|pending", "notes": "..." }
        Marca disponibilidade do músico logado para o evento.

        Quando um convidado aceitar (available), o evento muda para 'confirmed'.
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

        # Apenas músicos convidados podem responder disponibilidade
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {'detail': 'Você não foi convidado para este evento.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Valida response
        response_value = request.data.get('response', 'pending')
        valid_responses = ['pending', 'available', 'unavailable', 'maybe']

        if response_value not in valid_responses:
            return Response(
                {'detail': f'Response inválido. Opções: {", ".join(valid_responses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Captura estado anterior para log
        previous = Availability.objects.filter(musician=musician, event=event).first()

        # Cria ou atualiza a disponibilidade
        availability, created = Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={
                'response': response_value,
                'notes': request.data.get('notes', ''),
                'responded_at': timezone.now() if response_value != 'pending' else None,
            }
        )

        # Registra log apenas se houve mudança e resposta não é pendente
        if response_value != 'pending':
            prev_response = previous.response if previous else None
            prev_notes = previous.notes if previous else ''
            response_labels = {
                'available': 'Disponível',
                'unavailable': 'Indisponível',
                'maybe': 'Talvez',
                'pending': 'Pendente',
            }
            response_label = response_labels.get(response_value, response_value)
            if created or prev_response != response_value or prev_notes != request.data.get('notes', ''):
                self._log_event(
                    event,
                    'availability',
                    f'{musician.user.get_full_name() or musician.user.username} marcou disponibilidade: {response_label}'
                )

        # Verifica se algum convidado aceitou e confirma o evento
        if response_value == 'available':
            self._check_and_confirm_event(event, confirmed_by=request.user)

        serializer = AvailabilitySerializer(availability)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _check_and_confirm_event(self, event, confirmed_by=None):
        """
        Confirma o evento quando algum convidado aceita.
        Se não houver convidados, confirma quando o criador está disponível.
        Usa select_for_update para evitar race conditions.
        """
        # Usa transação com lock para evitar race condition
        with transaction.atomic():
            # Re-busca o evento com lock exclusivo
            locked_event = Event.objects.select_for_update().get(pk=event.pk)

            # Verifica se já foi confirmado (por outra requisição concorrente)
            if locked_event.status == 'confirmed':
                return
            if locked_event.status in ['cancelled', 'rejected']:
                return

            all_availabilities = locked_event.availabilities.all()

            # Convidados = todos exceto o criador
            invitee_availabilities = all_availabilities
            if locked_event.created_by_id:
                invitee_availabilities = invitee_availabilities.exclude(
                    musician__user=locked_event.created_by
                )

            if invitee_availabilities.exists():
                has_confirmation = invitee_availabilities.filter(response='available').exists()
                if not has_confirmation:
                    return
            else:
                # Sem convidados: confirma apenas se o criador está disponível
                creator_available = all_availabilities.filter(
                    musician__user=locked_event.created_by,
                    response='available'
                ).exists()
                if not creator_available:
                    return

            locked_event.status = 'confirmed'
            if confirmed_by and not locked_event.approved_by:
                locked_event.approved_by = confirmed_by
                locked_event.approved_at = timezone.now()
            elif not locked_event.approved_by and locked_event.created_by:
                locked_event.approved_by = locked_event.created_by
                locked_event.approved_at = timezone.now()

            locked_event.save()

            approver = locked_event.approved_by
            approver_name = None
            if approver:
                approver_name = approver.get_full_name() or approver.username

            description = (
                f'Evento confirmado por {approver_name}.'
                if approver_name
                else 'Evento confirmado.'
            )
            self._log_event(locked_event, 'approved', description)

    @action(detail=True, methods=['get'])
    def can_rate(self, request, pk=None):
        """
        GET /events/{id}/can_rate/
        Retorna se o usuário atual pode avaliar os músicos do evento.
        """
        event = self.get_object()
        can_rate, reason, _ = self._can_user_rate_event(event, request.user)

        return Response({
            'can_rate': can_rate,
            'reason': reason
        })

    @action(detail=True, methods=['post'])
    def submit_ratings(self, request, pk=None):
        """
        POST /events/{id}/submit_ratings/
        Body: { "ratings": [{ "musician_id": 1, "rating": 5, "comment": "..." }] }
        Permite ao criador do evento avaliar os músicos após a data do evento.
        """
        event = self.get_object()
        can_rate, reason, status_code = self._can_user_rate_event(event, request.user)

        if not can_rate:
            return Response(
                {'detail': reason, 'can_rate': False},
                status=status_code
            )

        serializer = RatingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ratings_data = serializer.validated_data['ratings']

        allowed_musician_ids = set(event.availabilities.values_list('musician_id', flat=True))
        if not allowed_musician_ids:
            return Response(
                {'detail': 'Evento não possui músicos associados para avaliação.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        seen_ids = set()
        normalized_ratings = []

        for item in ratings_data:
            musician_id_raw = item.get('musician_id')
            rating_raw = item.get('rating')

            try:
                musician_id = int(musician_id_raw)
            except (TypeError, ValueError):
                return Response(
                    {'detail': f'ID de músico inválido: {musician_id_raw}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                rating_value = int(rating_raw)
            except (TypeError, ValueError):
                return Response(
                    {'detail': f'Nota inválida para o músico {musician_id}.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if rating_value < 1 or rating_value > 5:
                return Response(
                    {'detail': f'Nota do músico {musician_id} deve estar entre 1 e 5.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if musician_id in seen_ids:
                return Response(
                    {'detail': 'Não é permitido avaliar o mesmo músico mais de uma vez.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if musician_id not in allowed_musician_ids:
                return Response(
                    {'detail': f'Músico {musician_id} não faz parte do evento.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            seen_ids.add(musician_id)
            normalized_ratings.append({
                'musician_id': musician_id,
                'rating': rating_value,
                'comment': (item.get('comment') or '').strip() or None,
            })

        musicians_map = {
            m.id: m for m in Musician.objects.filter(id__in=seen_ids)
        }
        missing_musicians = seen_ids - set(musicians_map.keys())

        if missing_musicians:
            missing_list = ', '.join(map(str, sorted(missing_musicians)))
            return Response(
                {'detail': f'Músicos não encontrados: {missing_list}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_ratings = []
        with transaction.atomic():
            for item in normalized_ratings:
                musician = musicians_map[item['musician_id']]
                rating_obj = MusicianRating.objects.create(
                    event=event,
                    musician=musician,
                    rated_by=request.user,
                    rating=item['rating'],
                    comment=item['comment']
                )
                created_ratings.append(rating_obj)

        output_serializer = MusicianRatingSerializer(created_ratings, many=True, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)
    
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
            ).distinct()

            org = get_user_organization(request.user)
            if org:
                events = events.filter(organization=org)

            events = events.select_related('created_by', 'approved_by').prefetch_related(
                'availabilities__musician__user'
            ).annotate(
                avail_pending=Count('availabilities', filter=Q(availabilities__response='pending')),
                avail_available=Count('availabilities', filter=Q(availabilities__response='available')),
                avail_unavailable=Count('availabilities', filter=Q(availabilities__response='unavailable')),
                avail_maybe=Count('availabilities', filter=Q(availabilities__response='maybe')),
                avail_total=Count('availabilities'),
            )

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
            ).distinct()

            org = get_user_organization(request.user)
            if org:
                events = events.filter(organization=org)

            events = events.select_related('created_by', 'approved_by').prefetch_related(
                'availabilities__musician__user'
            ).annotate(
                avail_pending=Count('availabilities', filter=Q(availabilities__response='pending')),
                avail_available=Count('availabilities', filter=Q(availabilities__response='available')),
                avail_unavailable=Count('availabilities', filter=Q(availabilities__response='unavailable')),
                avail_maybe=Count('availabilities', filter=Q(availabilities__response='maybe')),
                avail_total=Count('availabilities'),
            )

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
            org = get_user_organization(self.request.user)
            queryset = Availability.objects.filter(
                musician=musician
            ).select_related('musician__user', 'event')

            if org:
                queryset = queryset.filter(event__organization=org)
            
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
            event = serializer.validated_data.get('event')
            if not event:
                raise ValidationError({'event': 'Evento é obrigatório.'})

            existing = Availability.objects.filter(musician=musician, event=event).first()
            if not existing:
                raise PermissionDenied('Você não foi convidado para este evento.')

            raise ValidationError({
                'detail': 'Disponibilidade já existe. Use /events/{id}/set_availability/ ou PUT /availabilities/{id}/.'
            })
        except Musician.DoesNotExist:
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
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})

    def perform_destroy(self, instance):
        """Permite apenas deletar a própria availability"""
        try:
            musician = self.request.user.musician_profile
            # Verifica se a availability pertence ao músico
            if instance.musician != musician:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Você não pode deletar disponibilidades de outros músicos.')
            super().perform_destroy(instance)
        except Musician.DoesNotExist:
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})


class ConnectionViewSet(viewsets.ModelViewSet):
    """
    Conexões entre músicos (seguir, ligar depois, indicar, já toquei com).
    """
    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            return Connection.objects.none()

        qs = Connection.objects.filter(follower=musician).select_related('target__user', 'follower__user')

        ctype = self.request.query_params.get('type')
        if ctype:
            qs = qs.filter(connection_type=ctype)

        return qs

    def perform_create(self, serializer):
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})

        target = serializer.validated_data.get('target')
        if target == musician:
            raise ValidationError({'detail': 'Não é possível criar conexão consigo mesmo.'})

        serializer.save(follower=musician)


class BadgeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lista badges do músico logado com progresso para badges não conquistadas.
    """
    serializer_class = MusicianBadgeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            return MusicianBadge.objects.none()

        award_badges_for_musician(musician)
        return MusicianBadge.objects.filter(musician=musician)

    def list(self, request, *args, **kwargs):
        """Retorna badges conquistadas e disponíveis com progresso."""
        from .utils import get_badge_progress

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response({'earned': [], 'available': []})

        data = get_badge_progress(musician)
        return Response(data)

class LeaderAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet para disponibilidades cadastradas por músicos.

    - Músicos podem CRUD suas próprias disponibilidades
    - Outros músicos podem visualizar apenas as públicas
    - Filtragem por data (upcoming, past, specific date)
    """
    serializer_class = LeaderAvailabilitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Retorna disponibilidades ativas.
        Filtra por query params:
        - ?upcoming=true (datas futuras)
        - ?past=true (datas passadas)
        - ?date=YYYY-MM-DD (data específica)
        - ?leader=<id> (filtrar por músico específico)
        - ?search=termo (nome/username do músico)
        - ?public=true (apenas compartilhadas)
        - ?mine=true (apenas minhas)
        - ?instrument=<instrument> (filtrar por instrumento do músico)
        """
        queryset = LeaderAvailability.objects.filter(is_active=True).select_related('leader__user')

        mine_param = self.request.query_params.get('mine') == 'true'
        public_param = self.request.query_params.get('public') == 'true'

        # Default: mostrar apenas minhas agendas se nada for informado
        if not mine_param and not public_param:
            mine_param = True

        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            if mine_param:
                return LeaderAvailability.objects.none()
            musician = None

        filters = models.Q()
        if mine_param and musician:
            filters |= models.Q(leader=musician)
        if public_param:
            filters |= models.Q(is_public=True)
        if not filters:
            return LeaderAvailability.objects.none()

        queryset = queryset.filter(filters)

        # Filtro por data futura
        if self.request.query_params.get('upcoming') == 'true':
            queryset = queryset.filter(date__gte=timezone.now().date())

        # Filtro por data passada
        if self.request.query_params.get('past') == 'true':
            queryset = queryset.filter(date__lt=timezone.now().date())

        # Filtro por data específica
        specific_date = self.request.query_params.get('date')
        if specific_date:
            queryset = queryset.filter(date=specific_date)

        # Filtro por músico específico
        leader_id = self.request.query_params.get('leader')
        if leader_id and public_param:
            queryset = queryset.filter(leader_id=leader_id)

        # Filtro por instrumento
        instrument = self.request.query_params.get('instrument')
        if instrument:
            queryset = queryset.filter(leader__instrument=instrument)

        # Busca por nome/username/instagram do músico (funciona em todos os modos)
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(leader__user__first_name__icontains=search) |
                Q(leader__user__last_name__icontains=search) |
                Q(leader__user__username__icontains=search) |
                Q(leader__instagram__icontains=search) |
                Q(notes__icontains=search)
            )

        return queryset

    def get_permissions(self):
        """
        Permissões: todos autenticados podem criar/editar suas próprias disponibilidades.
        """
        return [IsAuthenticated()]

    def _split_availability_with_events(self, availability, events):
        """
        Divide uma disponibilidade removendo intervalos ocupados por eventos.
        Delega para função utilitária em utils.py.
        """
        return split_availability_with_events(availability, events, LeaderAvailability)

    def perform_create(self, serializer):
        """
        Salva disponibilidade atribuindo o músico logado.
        """
        try:
            musician = self.request.user.musician_profile
            org = get_user_organization(self.request.user)
            serializer.save(leader=musician, organization=org)
            created = serializer.instance
            buffer = timedelta(minutes=40)
            conflicting_events = Event.objects.filter(
                status__in=['proposed', 'approved', 'confirmed'],
                start_datetime__lt=created.end_datetime + buffer,
                end_datetime__gt=created.start_datetime - buffer
            )
            conflicting_events = conflicting_events.filter(
                Q(created_by=musician.user) | Q(availabilities__musician=musician)
            ).distinct()
            if conflicting_events.exists():
                # Ajusta disponibilidade recém-criada consumindo eventos já existentes
                self._split_availability_with_events(created, list(conflicting_events))
        except Musician.DoesNotExist:
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})

    def create(self, request, *args, **kwargs):
        """
        Cria disponibilidade do músico com tratamento explícito de erros para evitar 500.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
        except Exception as exc:
            logging.exception("Erro ao criar disponibilidade do músico")
            from rest_framework.exceptions import ValidationError
            if isinstance(exc, ValidationError):
                raise
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        """
        Permite apenas que o músico atualize suas próprias disponibilidades.
        """
        try:
            musician = self.request.user.musician_profile

            # Verifica se a disponibilidade pertence ao músico
            if serializer.instance.leader != musician:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Você não pode editar disponibilidades de outros músicos.')

            instance = serializer.save()
            buffer = timedelta(minutes=40)
            conflicting_events = Event.objects.filter(
                status__in=['proposed', 'approved', 'confirmed'],
                start_datetime__lt=instance.end_datetime + buffer,
                end_datetime__gt=instance.start_datetime - buffer
            )
            conflicting_events = conflicting_events.filter(
                Q(created_by=musician.user) | Q(availabilities__musician=musician)
            ).distinct()
            if conflicting_events.exists():
                self._split_availability_with_events(instance, list(conflicting_events))
        except Musician.DoesNotExist:
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})

    def perform_destroy(self, instance):
        """
        Permite apenas deletar a própria disponibilidade.
        """
        try:
            musician = self.request.user.musician_profile

            if instance.leader != musician:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Você não pode excluir disponibilidades de outros músicos.')

            super().perform_destroy(instance)
        except Musician.DoesNotExist:
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})

    @action(detail=True, methods=['get'])
    def conflicting_events(self, request, pk=None):
        """
        GET /leader-availabilities/{id}/conflicting_events/
        Retorna lista de eventos que conflitam com esta disponibilidade (incluindo buffer de 40 min).
        """
        availability = self.get_object()
        conflicting = availability.get_conflicting_events()

        from .serializers import EventListSerializer
        serializer = EventListSerializer(conflicting, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def available_musicians(self, request):
        """
        GET /leader-availabilities/available_musicians/?date=YYYY-MM-DD
        Retorna todos os músicos ativos para convite, indicando quais têm
        disponibilidade publicada na data.

        Parâmetros opcionais:
        - instrument: filtra por instrumento
        - only_available: se 'true', retorna apenas músicos com disponibilidade
        """
        date_param = request.query_params.get('date')
        if not date_param:
            return Response(
                {'detail': 'Parâmetro "date" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_date = date.fromisoformat(date_param)
        except ValueError:
            return Response(
                {'detail': 'Formato de data inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        instrument_labels = {
            'vocal': 'Vocal',
            'guitar': 'Guitarra',
            'acoustic_guitar': 'Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'piano': 'Piano',
            'synth': 'Sintetizador',
            'percussion': 'Percussão',
            'cajon': 'Cajón',
            'violin': 'Violino',
            'viola': 'Viola',
            'cello': 'Violoncelo',
            'double_bass': 'Contrabaixo acústico',
            'saxophone': 'Saxofone',
            'trumpet': 'Trompete',
            'trombone': 'Trombone',
            'flute': 'Flauta',
            'clarinet': 'Clarinete',
            'harmonica': 'Gaita',
            'ukulele': 'Ukulele',
            'banjo': 'Banjo',
            'mandolin': 'Bandolim',
            'dj': 'DJ',
            'producer': 'Produtor(a)',
            'other': 'Outro',
        }

        # Busca todos os músicos ativos, exceto o próprio usuário
        musicians = Musician.objects.filter(
            is_active=True
        ).select_related('user').exclude(
            user=request.user
        )

        if not request.user.is_staff:
            try:
                request.user.musician_profile
            except Musician.DoesNotExist:
                return Response([])

        # Filtro opcional por instrumento
        instrument = request.query_params.get('instrument')
        if instrument:
            musicians = musicians.filter(instrument=instrument)

        # Busca disponibilidades públicas na data (para associar aos músicos)
        availabilities_map = {}
        availabilities = LeaderAvailability.objects.filter(
            is_active=True,
            is_public=True,
            date=target_date
        ).select_related('leader')
        for avail in availabilities:
            availabilities_map.setdefault(avail.leader_id, []).append(avail)

        only_available = request.query_params.get('only_available', '').lower() == 'true'

        result = []
        for musician in musicians:
            avail_list = availabilities_map.get(musician.id, [])
            primary_avail = min(avail_list, key=lambda x: x.start_time) if avail_list else None

            # Se only_available=true, pula músicos sem disponibilidade
            if only_available and not primary_avail:
                continue

            availability_slots = [
                {
                    'id': slot.id,
                    'start_time': slot.start_time.strftime('%H:%M'),
                    'end_time': slot.end_time.strftime('%H:%M'),
                    'notes': slot.notes,
                }
                for slot in sorted(avail_list, key=lambda x: x.start_time)
            ]

            musician_data = {
                'musician_id': musician.id,
                'musician_name': musician.user.get_full_name() or musician.user.username,
                'instrument': musician.instrument,
                'instrument_display': instrument_labels.get(musician.instrument, musician.instrument or ''),
                'has_availability': primary_avail is not None,
                'availability_id': primary_avail.id if primary_avail else None,
                'start_time': primary_avail.start_time.strftime('%H:%M') if primary_avail else None,
                'end_time': primary_avail.end_time.strftime('%H:%M') if primary_avail else None,
                'notes': primary_avail.notes if primary_avail else None,
                'availability_count': len(avail_list),
                'availability_slots': availability_slots,
            }
            result.append(musician_data)

        # Ordena: músicos com disponibilidade primeiro, depois por nome
        result.sort(key=lambda x: (not x['has_availability'], x['musician_name']))

        return Response(result)


# Image upload endpoints
MAX_AVATAR_BYTES = 2 * 1024 * 1024
MAX_COVER_BYTES = 5 * 1024 * 1024
MAX_AVATAR_SIZE = 512
MAX_COVER_SIZE = (1600, 900)
MAX_IMAGE_PIXELS = 12_000_000


def _process_profile_image(uploaded_file, *, max_bytes, max_size, crop_square, quality, prefix):
    if uploaded_file.size > max_bytes:
        size_mb = max_bytes // (1024 * 1024)
        raise ValueError(f'Arquivo muito grande. Tamanho máximo: {size_mb}MB.')

    try:
        image = Image.open(uploaded_file)
        image_format = (image.format or '').upper()
        image = ImageOps.exif_transpose(image)
    except (UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise ValueError('Arquivo inválido. Envie uma imagem JPG, PNG ou WEBP.') from exc

    if not image_format:
        content_type = getattr(uploaded_file, 'content_type', '') or ''
        if content_type.lower() in ('image/jpeg', 'image/jpg'):
            image_format = 'JPEG'
        elif content_type.lower() == 'image/png':
            image_format = 'PNG'
        elif content_type.lower() == 'image/webp':
            image_format = 'WEBP'

    if image_format not in {'JPEG', 'PNG', 'WEBP'}:
        raise ValueError('Formato não suportado. Use JPG, PNG ou WEBP.')

    if image.width * image.height > MAX_IMAGE_PIXELS:
        raise ValueError('Imagem muito grande. Reduza a resolução.')

    has_alpha = image.mode in ('RGBA', 'LA') or (image.mode == 'P' and 'transparency' in image.info)
    image = image.convert('RGBA' if has_alpha else 'RGB')

    if crop_square:
        image = ImageOps.fit(image, (max_size, max_size), method=Image.LANCZOS)
    else:
        image.thumbnail(max_size, Image.LANCZOS)

    buffer = BytesIO()
    if features.check('webp'):
        output_format = 'WEBP'
        output_ext = 'webp'
    elif has_alpha:
        output_format = 'PNG'
        output_ext = 'png'
    else:
        output_format = 'JPEG'
        output_ext = 'jpg'

    if output_format == 'JPEG' and image.mode != 'RGB':
        image = image.convert('RGB')

    save_kwargs = {'format': output_format}
    if output_format == 'WEBP':
        save_kwargs.update({'quality': quality, 'method': 6})
    elif output_format == 'JPEG':
        save_kwargs.update({'quality': quality, 'optimize': True})
    elif output_format == 'PNG':
        save_kwargs.update({'optimize': True, 'compress_level': 6})

    image.save(buffer, **save_kwargs)
    buffer.seek(0)
    return ContentFile(buffer.getvalue(), name=f'{prefix}-{uuid4().hex}.{output_ext}')
from rest_framework.decorators import api_view, permission_classes

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar(request):
    """
    POST /api/musicians/upload-avatar/
    Upload de foto de perfil do músico
    """
    try:
        musician = request.user.musician_profile
        if 'avatar' not in request.FILES:
            logger.warning(
                'Upload de avatar sem arquivo | user_id=%s',
                getattr(request.user, 'id', None),
            )
            return Response(
                {'error': 'Nenhuma imagem enviada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        avatar_file = request.FILES['avatar']
        processed_file = _process_profile_image(
            avatar_file,
            max_bytes=MAX_AVATAR_BYTES,
            max_size=MAX_AVATAR_SIZE,
            crop_square=True,
            quality=82,
            prefix='avatar',
        )

        if musician.avatar:
            musician.avatar.delete(save=False)

        musician.avatar = processed_file
        musician.save()

        return Response({
            'avatar': request.build_absolute_uri(musician.avatar.url)
        }, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        logger.warning(
            'Upload de avatar sem perfil de músico | user_id=%s',
            getattr(request.user, 'id', None),
        )
        return Response(
            {'error': 'Perfil não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as e:
        logger.warning(
            'Upload de avatar inválido | user_id=%s | arquivo=%s | tamanho=%s | content_type=%s | erro=%s',
            getattr(request.user, 'id', None),
            getattr(avatar_file, 'name', None),
            getattr(avatar_file, 'size', None),
            getattr(avatar_file, 'content_type', None),
            str(e),
        )
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception(
            'Erro inesperado no upload de avatar | user_id=%s | arquivo=%s',
            getattr(request.user, 'id', None),
            getattr(avatar_file, 'name', None),
        )
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_cover(request):
    """
    POST /api/musicians/upload-cover/
    Upload de imagem de capa do perfil
    """
    try:
        musician = request.user.musician_profile
        if 'cover_image' not in request.FILES:
            logger.warning(
                'Upload de capa sem arquivo | user_id=%s',
                getattr(request.user, 'id', None),
            )
            return Response(
                {'error': 'Nenhuma imagem enviada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cover_file = request.FILES['cover_image']
        processed_file = _process_profile_image(
            cover_file,
            max_bytes=MAX_COVER_BYTES,
            max_size=MAX_COVER_SIZE,
            crop_square=False,
            quality=80,
            prefix='cover',
        )

        if musician.cover_image:
            musician.cover_image.delete(save=False)

        musician.cover_image = processed_file
        musician.save()

        return Response({
            'cover_image': request.build_absolute_uri(musician.cover_image.url)
        }, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        logger.warning(
            'Upload de capa sem perfil de músico | user_id=%s',
            getattr(request.user, 'id', None),
        )
        return Response(
            {'error': 'Perfil não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValueError as e:
        logger.warning(
            'Upload de capa inválido | user_id=%s | arquivo=%s | tamanho=%s | content_type=%s | erro=%s',
            getattr(request.user, 'id', None),
            getattr(cover_file, 'name', None),
            getattr(cover_file, 'size', None),
            getattr(cover_file, 'content_type', None),
            str(e),
        )
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.exception(
            'Erro inesperado no upload de capa | user_id=%s | arquivo=%s',
            getattr(request.user, 'id', None),
            getattr(cover_file, 'name', None),
        )
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_musician_connections(request, musician_id):
    """
    GET /api/musicians/<id>/connections/
    Retorna conexões do músico (usuários que ele segue)
    """
    try:
        # Verifica se o músico existe
        musician = Musician.objects.get(id=musician_id, is_active=True)

        # Busca conexões onde o músico é o follower
        connections = Connection.objects.filter(
            follower=musician
        ).select_related('target__user').order_by('-created_at')[:6]

        # Serializar os músicos conectados (targets)
        connected_musicians = []
        for conn in connections:
            target = conn.target
            connected_musicians.append({
                'id': target.id,
                'full_name': target.user.get_full_name() or target.user.username,
                'instrument': target.instrument,
                'avatar': request.build_absolute_uri(target.avatar.url) if target.avatar else None
            })

        return Response({
            'total': connections.count(),
            'connections': connected_musicians
        }, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        return Response(
            {'error': 'Músico não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logging.exception("Erro ao buscar conexões")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def get_musician_reviews(request, musician_id):
    """
    GET /api/musicians/<id>/reviews/
    Retorna avaliações recebidas pelo músico
    """
    try:
        # Verifica se o músico existe
        musician = Musician.objects.get(id=musician_id, is_active=True)

        # Busca avaliações do músico (10 mais recentes)
        reviews = MusicianRating.objects.filter(
            musician=musician
        ).select_related('rated_by', 'event').order_by('-created_at')[:10]

        serializer = MusicianRatingSerializer(reviews, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    except Musician.DoesNotExist:
        return Response(
            {'error': 'Músico não encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logging.exception("Erro ao buscar avaliações")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
