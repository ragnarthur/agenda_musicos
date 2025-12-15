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

from .models import Musician, Event, Availability, LeaderAvailability, EventLog, Organization, Membership
from .serializers import (
    MusicianSerializer,
    EventListSerializer,
    EventDetailSerializer,
    EventCreateSerializer,
    AvailabilitySerializer,
    LeaderAvailabilitySerializer
)
from .permissions import IsOwnerOrReadOnly
from .utils import get_user_organization, split_availability_with_events


class MusicianViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para músicos (apenas leitura).
    Lista todos os músicos ativos da banda.
    """
    serializer_class = MusicianSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Musician.objects.filter(is_active=True).select_related('user')
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
        conflicts = Event.objects.filter(
            status__in=['proposed', 'approved', 'confirmed'],
            start_datetime__lt=end_dt + buffer,
            end_datetime__gt=start_dt - buffer
        )

        serializer = EventListSerializer(conflicts, many=True, context={'request': request})
        return Response({
            'has_conflicts': conflicts.exists(),
            'count': conflicts.count(),
            'buffer_minutes': 40,
            'conflicts': serializer.data
        })
    
    def perform_create(self, serializer):
        """
        Cria evento e disponibilidades para todos os músicos da organização.
        Status inicial: 'proposed' (exceto se is_solo=True, então 'approved').
        Usa transação atômica para garantir consistência dos dados.
        """
        org = get_user_organization(self.request.user)
        if not org:
            raise PermissionDenied('Usuário sem organização.')
        is_solo = serializer.validated_data.get('is_solo', False)

        approved_kwargs = {}
        if is_solo:
            approved_kwargs = {
                'approved_by': self.request.user,
                'approved_at': timezone.now(),
            }

        # Transação atômica para garantir que evento + disponibilidades são criados juntos
        with transaction.atomic():
            # Se é evento solo, vai direto para 'approved', caso contrário 'proposed'
            event = serializer.save(
                created_by=self.request.user,
                organization=org,
                status='approved' if is_solo else 'proposed',
                **approved_kwargs
            )
            self._log_event(
                event,
                'created',
                'Show solo criado e aprovado automaticamente.' if is_solo else 'Evento criado e enviado para aprovação.'
            )

            # Criar availabilities (dentro da transação):
            # - Para eventos solo: apenas o criador
            # - Para eventos com banda: todos os músicos ativos da organização
            availabilities = []

            try:
                all_musicians = Musician.objects.filter(is_active=True)
            except Musician.DoesNotExist:
                all_musicians = Musician.objects.none()

            for musician in all_musicians:
                if is_solo and musician.user != self.request.user:
                    continue
                response_value = 'available' if musician.user == self.request.user else 'pending'
                note_value = 'Evento criado por mim' if musician.user == self.request.user else ''
                availabilities.append(
                    Availability(
                        musician=musician,
                        event=event,
                        response=response_value,
                        notes=note_value
                    )
                )

            # Criar availabilities usando update_or_create para evitar race conditions
            # Também preenche timestamps corretamente (bulk_create não preenche auto_now/auto_now_add)
            if availabilities:
                now = timezone.now()
                for availability in availabilities:
                    # update_or_create é atômico e evita violação de unique_together
                    Availability.objects.update_or_create(
                        musician=availability.musician,
                        event=availability.event,
                        defaults={
                            'response': availability.response,
                            'notes': availability.notes if hasattr(availability, 'notes') else '',
                            'responded_at': now if availability.response != 'pending' else None,
                        }
                    )

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
        try:
            leader = Musician.objects.filter(role='leader', is_active=True).first()
            if not leader:
                return
        except Musician.DoesNotExist:
            return

        event_start = event.start_datetime
        event_end = event.end_datetime

        # Busca eventos que se sobrepõem considerando buffer, inclusive cruzando datas
        other_events = Event.objects.filter(
            status__in=['proposed', 'approved', 'confirmed'],
            start_datetime__lt=event_end + buffer,
            end_datetime__gt=event_start - buffer
        ).exclude(id=event.id)

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

    def _log_event(self, event, action, description):
        """Cria registro de histórico do evento"""
        EventLog.objects.create(
            event=event,
            performed_by=getattr(self.request, 'user', None) if hasattr(self, 'request') else None,
            action=action,
            description=description
        )

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

        # Garante que o músico está associado ao evento (cria se não existir)
        Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={'response': 'pending'}
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

        Availability.objects.update_or_create(
            musician=musician,
            event=event,
            defaults={'response': 'pending'}
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
            if created or prev_response != response_value or prev_notes != request.data.get('notes', ''):
                self._log_event(
                    event,
                    'availability',
                    f'{musician.user.get_full_name() or musician.user.username} marcou disponibilidade: {response_value}'
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

        # Busca por nome/username/instagram do músico
        search = self.request.query_params.get('search')
        if search and public_param:
            queryset = queryset.filter(
                Q(leader__user__first_name__icontains=search) |
                Q(leader__user__last_name__icontains=search) |
                Q(leader__user__username__icontains=search) |
                Q(leader__instagram__icontains=search)
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
