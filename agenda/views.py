# agenda/views.py
import logging
from datetime import timedelta, datetime, time, date

from django.db import models, transaction
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
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
    Lista todos os músicos ativos da banda.
    """
    serializer_class = MusicianSerializer
    permission_classes = [IsAuthenticated]
    
    def _scope_queryset(self, queryset):
        if self.request.user.is_staff:
            return queryset

        org = get_user_organization(self.request.user)
        if org:
            return queryset.filter(organization=org)

        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            return queryset.none()
        return queryset.filter(id=musician.id)

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

    @action(detail=False, methods=['get'])
    def instruments(self, request):
        """
        GET /musicians/instruments/
        Retorna lista de instrumentos únicos dos músicos cadastrados
        com contagem de músicos por instrumento
        """
        instrument_labels = {
            'vocal': 'Vocal',
            'guitar': 'Guitarra/Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'percussion': 'Percussão/Outros',
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
            org = get_user_organization(request.user)
            if org:
                availability_qs = availability_qs.filter(organization=org)
            else:
                try:
                    musician = request.user.musician_profile
                except Musician.DoesNotExist:
                    return Response([])
                availability_qs = availability_qs.filter(leader=musician)

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
    1. Sara/Arthur criam proposta (POST /events/)
    2. Sistema cria availabilities para todos os músicos
    3. Roberto aprova/rejeita (POST /events/{id}/approve/ ou reject/)
    4. Músicos marcam disponibilidade
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
        - ?pending_approval=true (eventos aguardando aprovação - apenas líderes)
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

        # Filtra por organização do usuário (segurança multi-tenant)
        org = get_user_organization(self.request.user)
        if org:
            queryset = queryset.filter(organization=org)
        else:
            # Usuário sem organização só vê eventos que criou
            queryset = queryset.filter(created_by=self.request.user)

        # Exibe eventos onde o usuário participa (criador ou availability)
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

        # Pendentes de aprovação (eventos propostos onde o músico tem availability)
        if self.request.query_params.get('pending_approval') == 'true':
            try:
                musician = self.request.user.musician_profile
                queryset = queryset.filter(
                    status='proposed',
                    availabilities__musician=musician
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

        org = get_user_organization(request.user)
        if org:
            conflicts = conflicts.filter(organization=org)
        else:
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
        - is_solo=True: evento aprovado automaticamente, apenas criador participa
        - is_solo=False: evento fica 'proposed', aguarda aprovação dos convidados
        - Quando todos os convidados aceitarem, evento muda para 'confirmed'
        """
        org = get_user_organization(self.request.user)
        if not org:
            raise PermissionDenied('Usuário sem organização.')

        is_solo = serializer.validated_data.get('is_solo', False)
        invited_musicians_ids = serializer.validated_data.pop('invited_musicians', [])
        required_instruments = serializer.validated_data.pop('required_instruments', [])

        # Transação atômica para garantir consistência
        with transaction.atomic():
            # Evento solo: aprovado automaticamente
            # Evento com convidados: aguarda aprovação dos músicos
            if is_solo:
                event = serializer.save(
                    created_by=self.request.user,
                    organization=org,
                    status='approved',
                    approved_by=self.request.user,
                    approved_at=timezone.now(),
                )
                self._log_event(event, 'created', 'Show solo criado e aprovado automaticamente.')
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
                    is_active=True,
                    organization=org
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

            # Se não for solo e não tiver convidados, confirma automaticamente
            # (evento só do criador)
            if not is_solo and not invited_musicians_ids:
                event.status = 'confirmed'
                event.save()
                self._log_event(event, 'approved', 'Evento confirmado automaticamente (sem convidados).')

            if not is_solo:
                self._consume_leader_availability(event)

    def perform_destroy(self, instance):
        """
        Apenas o criador pode deletar o evento de forma definitiva.
        Restaura a disponibilidade do líder quando evento é deletado.
        """
        request_user = getattr(self, 'request', None).user if hasattr(self, 'request') else None
        if request_user and instance.created_by and instance.created_by != request_user:
            raise PermissionDenied('Apenas o criador pode deletar este evento.')

        # Restaura disponibilidade do líder antes de deletar
        if not instance.is_solo:
            self._restore_leader_availability(instance)

        super().perform_destroy(instance)

    def _split_availability_with_events(self, availability, events):
        """
        Divide uma disponibilidade removendo os intervalos ocupados por eventos.
        Delega para função utilitária em utils.py.
        """
        return split_availability_with_events(availability, events, LeaderAvailability)

    def _get_event_organization(self, event):
        if event.organization_id:
            return event.organization
        if event.created_by_id:
            return get_user_organization(event.created_by)
        return None

    def _get_event_leader(self, event):
        org = self._get_event_organization(event)
        if org:
            return Musician.objects.filter(
                role='leader',
                is_active=True,
                organization=org
            ).first()
        if event.created_by_id:
            try:
                musician = event.created_by.musician_profile
            except Musician.DoesNotExist:
                return None
            if musician.is_leader():
                return musician
        return Musician.objects.filter(
            role='leader',
            is_active=True,
            organization__isnull=True
        ).first()

    def _consume_leader_availability(self, event):
        """
        Consome disponibilidades do líder para bloquear o horário do evento.
        """
        if event.is_solo:
            return

        leader = self._get_event_leader(event)
        if not leader:
            return

        org = self._get_event_organization(event)
        queryset = LeaderAvailability.objects.filter(leader=leader, is_active=True)
        if org:
            queryset = queryset.filter(organization=org)
        else:
            queryset = queryset.filter(organization__isnull=True)

        buffer = timedelta(minutes=40)
        overlapping = queryset.filter(
            start_datetime__lt=event.end_datetime + buffer,
            end_datetime__gt=event.start_datetime - buffer
        )

        for availability in overlapping:
            self._split_availability_with_events(availability, [event])

    def _restore_leader_availability(self, event):
        """
        Restaura disponibilidade do líder quando evento é deletado, rejeitado ou cancelado.

        Estratégia:
        1. Verifica se há outros eventos ativos no mesmo dia que conflitariam
        2. Se não há conflitos, cria nova disponibilidade cobrindo o período do evento removido
        3. Considera buffer de 40min ao redor de outros eventos ao verificar conflitos

        Nota: Não tenta mesclar automaticamente com fragmentos existentes.
        O líder pode manualmente mesclar disponibilidades adjacentes depois, se desejar.
        """
        if event.is_solo:
            return

        buffer = timedelta(minutes=40)

        # Busca líder
        leader = self._get_event_leader(event)
        if not leader:
            return

        org = self._get_event_organization(event)
        event_start = event.start_datetime
        event_end = event.end_datetime

        # Busca eventos que se sobrepõem considerando buffer, inclusive cruzando datas
        other_events = Event.objects.filter(
            status__in=['proposed', 'approved', 'confirmed'],
            start_datetime__lt=event_end + buffer,
            end_datetime__gt=event_start - buffer
        ).exclude(id=event.id)
        if org:
            other_events = other_events.filter(organization=org)
        elif event.created_by_id:
            other_events = other_events.filter(created_by=event.created_by)

        # Verifica conflitos considerando buffer de 40min ao redor dos eventos
        has_conflict = False
        for other in other_events:
            # Aplica buffer ao redor do outro evento
            other_start_with_buffer = other.start_datetime - buffer
            other_end_with_buffer = other.end_datetime + buffer

            # Verifica sobreposição entre o evento restaurado e o outro evento (com buffer)
            # Há sobreposição se: NOT (evento termina antes do outro começar OU evento começa depois do outro terminar)
            if not (event_end <= other_start_with_buffer or event_start >= other_end_with_buffer):
                has_conflict = True
                break

        if has_conflict:
            # Há conflito - não pode restaurar disponibilidade pois outro evento ocupa o espaço
            # (considerando o buffer de 40min)
            return

        # Não há conflitos - cria disponibilidades cobrindo o período do evento.
        # Se cruzar meia-noite, divide em dois dias.
        now = timezone.now()
        start_date = event_start.date()
        end_date = event_end.date()

        if end_date != start_date:
            # Parte 1: do início até 23:59 do dia inicial
            end_dt1 = timezone.make_aware(
                timezone.datetime.combine(start_date, timezone.datetime.min.time()).replace(hour=23, minute=59)
            )
            LeaderAvailability.objects.create(
                leader=leader,
                organization=org,
                date=start_date,
                start_time=event.start_time,
                end_time=end_dt1.time(),
                start_datetime=event_start,
                end_datetime=end_dt1,
                notes=f'Restaurada após remoção: {event.title}',
                is_active=True,
                created_at=now,
                updated_at=now
            )
            # Parte 2: do início do dia seguinte até end_time
            start_dt2 = timezone.make_aware(
                timezone.datetime.combine(end_date, timezone.datetime.min.time())
            )
            LeaderAvailability.objects.create(
                leader=leader,
                organization=org,
                date=end_date,
                start_time=start_dt2.time(),
                end_time=event.end_time,
                start_datetime=start_dt2,
                end_datetime=event_end,
                notes=f'Restaurada após remoção: {event.title}',
                is_active=True,
                created_at=now,
                updated_at=now
            )
        else:
            LeaderAvailability.objects.create(
                leader=leader,
                organization=org,
                date=start_date,
                start_time=event.start_time,
                end_time=event.end_time,
                start_datetime=event_start,
                end_datetime=event_end,
                notes=f'Restaurada após remoção: {event.title}',
                is_active=True,
                created_at=now,
                updated_at=now
            )

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

        if event.event_date >= timezone.now().date():
            return False, 'Avaliações são liberadas apenas após a data do evento.', status.HTTP_400_BAD_REQUEST

        already_rated = MusicianRating.objects.filter(event=event, rated_by=user).exists()
        if already_rated:
            return False, 'Você já enviou avaliações para este evento.', status.HTTP_400_BAD_REQUEST

        return True, '', status.HTTP_200_OK

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """
        POST /events/{id}/approve/
        Apenas líderes podem aprovar eventos propostos.
        """
        event = self.get_object()

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verifica se o usuário é líder
        if not musician.is_leader():
            return Response(
                {'detail': 'Apenas líderes podem aprovar eventos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Garante que o músico foi convidado para o evento
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {'detail': 'Apenas músicos convidados podem aprovar este evento.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Tenta aprovar
        if event.approve(request.user):
            approver_name = request.user.get_full_name() or request.user.username
            self._log_event(event, 'approved', f'Evento aprovado por {approver_name}.')
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

        try:
            musician = request.user.musician_profile
        except Musician.DoesNotExist:
            return Response(
                {'detail': 'Usuário não possui perfil de músico.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verifica se o usuário é líder
        if not musician.is_leader():
            return Response(
                {'detail': 'Apenas líderes podem rejeitar eventos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Garante que o músico foi convidado para o evento
        if not event.availabilities.filter(musician=musician).exists():
            return Response(
                {'detail': 'Apenas músicos convidados podem rejeitar este evento.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Pega o motivo
        reason = request.data.get('reason', '')

        # Tenta rejeitar
        if event.reject(request.user, reason):
            # Restaura disponibilidade do líder quando evento é rejeitado
            if not event.is_solo:
                self._restore_leader_availability(event)

            self._log_event(
                event,
                'rejected',
                f'Evento rejeitado por {musician.user.get_full_name() or musician.user.username}. Motivo: {reason or "Não informado."}'
            )
            serializer = EventDetailSerializer(event, context={'request': request})
            return Response(serializer.data)
        else:
            return Response(
                {'detail': 'Evento não pode ser rejeitado. Status atual: ' + event.get_status_display()},
                status=status.HTTP_400_BAD_REQUEST
            )

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

        # Restaura disponibilidade do líder quando evento é cancelado
        if not event.is_solo:
            self._restore_leader_availability(event)

        serializer = EventDetailSerializer(event, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_availability(self, request, pk=None):
        """
        POST /events/{id}/set_availability/
        Body: { "response": "available|unavailable|maybe|pending", "notes": "..." }
        Marca disponibilidade do músico logado para o evento.

        Quando todos os convidados aceitarem (available), o evento muda para 'confirmed'.
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

        # Verifica se todos os convidados aceitaram e confirma o evento
        if event.status == 'proposed' and response_value == 'available':
            self._check_and_confirm_event(event)

        serializer = AvailabilitySerializer(availability)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def _check_and_confirm_event(self, event):
        """
        Verifica se todos os músicos convidados aceitaram e confirma o evento.
        """
        all_availabilities = event.availabilities.all()

        # Conta respostas
        total = all_availabilities.count()
        available_count = all_availabilities.filter(response='available').count()
        pending_count = all_availabilities.filter(response='pending').count()
        unavailable_count = all_availabilities.filter(response='unavailable').count()

        # Se não tem pendentes e todos aceitaram, confirma
        if pending_count == 0 and available_count == total and total > 0:
            event.status = 'confirmed'
            event.save()
            self._log_event(
                event,
                'approved',
                f'Evento confirmado! Todos os {total} músicos aceitaram.'
            )
        # Se alguém recusou, pode notificar o criador
        elif unavailable_count > 0 and pending_count == 0:
            # Todos responderam, mas alguém recusou
            # Status permanece 'proposed' para o criador decidir
            pass

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
            serializer.save(musician=musician)
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
    Lista badges do músico logado. Recalcula antes de retornar.
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

class LeaderAvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet para disponibilidades cadastradas pelo líder.

    - Líderes podem CRUD suas próprias disponibilidades
    - Outros músicos podem apenas visualizar (read-only)
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
        - ?leader=<id> (filtrar por líder específico)
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

        musician = None
        try:
            musician = self.request.user.musician_profile
        except Musician.DoesNotExist:
            if not public_param:
                return LeaderAvailability.objects.none()

        org = get_user_organization(self.request.user)
        if not org:
            if not musician:
                return LeaderAvailability.objects.none()
            if public_param and not mine_param:
                return LeaderAvailability.objects.none()
            queryset = queryset.filter(leader=musician)
        else:
            queryset = queryset.filter(organization=org)

            if mine_param and public_param and musician:
                queryset = queryset.filter(models.Q(leader=musician) | models.Q(is_public=True))
            elif mine_param and musician:
                queryset = queryset.filter(leader=musician)
            elif public_param:
                queryset = queryset.filter(is_public=True)
            else:
                return LeaderAvailability.objects.none()

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

        # Filtro por líder específico
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
            conflicting_events = Event.objects.filter(
                status__in=['proposed', 'approved', 'confirmed'],
                start_datetime__lt=created.end_datetime,
                end_datetime__gt=created.start_datetime
            )
            if conflicting_events.exists():
                # Ajusta disponibilidade recém-criada consumindo eventos já existentes
                self._split_availability_with_events(created, list(conflicting_events))
        except Musician.DoesNotExist:
            raise ValidationError({'detail': 'Usuário não possui perfil de músico.'})

    def create(self, request, *args, **kwargs):
        """
        Cria disponibilidade do líder com tratamento explícito de erros para evitar 500.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)
        except Exception as exc:
            logging.exception("Erro ao criar disponibilidade do líder")
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

            # Verifica se a disponibilidade pertence ao líder
            if serializer.instance.leader != musician:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Você não pode editar disponibilidades de outros músicos.')

            instance = serializer.save()
            conflicting_events = Event.objects.filter(
                status__in=['proposed', 'approved', 'confirmed'],
                start_datetime__lt=instance.end_datetime,
                end_datetime__gt=instance.start_datetime
            )
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
            'guitar': 'Guitarra/Violão',
            'bass': 'Baixo',
            'drums': 'Bateria',
            'keyboard': 'Teclado',
            'percussion': 'Percussão/Outros',
        }

        # Busca todos os músicos ativos, exceto o próprio usuário
        musicians = Musician.objects.filter(
            is_active=True
        ).select_related('user').exclude(
            user=request.user
        )

        org = get_user_organization(request.user)
        if org:
            musicians = musicians.filter(organization=org)
        elif not request.user.is_staff:
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
        if org:
            availabilities = availabilities.filter(organization=org)

        for avail in availabilities:
            availabilities_map[avail.leader_id] = avail

        only_available = request.query_params.get('only_available', '').lower() == 'true'

        result = []
        for musician in musicians:
            avail = availabilities_map.get(musician.id)

            # Se only_available=true, pula músicos sem disponibilidade
            if only_available and not avail:
                continue

            musician_data = {
                'musician_id': musician.id,
                'musician_name': musician.user.get_full_name() or musician.user.username,
                'instrument': musician.instrument,
                'instrument_display': instrument_labels.get(musician.instrument, musician.instrument or ''),
                'has_availability': avail is not None,
                'availability_id': avail.id if avail else None,
                'start_time': avail.start_time.strftime('%H:%M') if avail else None,
                'end_time': avail.end_time.strftime('%H:%M') if avail else None,
                'notes': avail.notes if avail else None,
            }
            result.append(musician_data)

        # Ordena: músicos com disponibilidade primeiro, depois por nome
        result.sort(key=lambda x: (not x['has_availability'], x['musician_name']))

        return Response(result)
