# agenda/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
import logging
from .models import Musician, Event, Availability, LeaderAvailability
from .serializers import (
    MusicianSerializer,
    EventListSerializer,
    EventDetailSerializer,
    EventCreateSerializer,
    AvailabilitySerializer,
    LeaderAvailabilitySerializer
)
from .permissions import IsLeaderOrReadOnly, IsOwnerOrReadOnly


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

        # Busca por título ou local
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(location__icontains=search)
            )

        # Eventos passados
        if self.request.query_params.get('past') == 'true':
            from django.utils import timezone
            queryset = queryset.filter(event_date__lt=timezone.now().date())

        # Eventos futuros (padrão)
        if self.request.query_params.get('upcoming') == 'true':
            from django.utils import timezone
            queryset = queryset.filter(event_date__gte=timezone.now().date())

        return queryset
    
    def perform_create(self, serializer):
        """
        Salva evento e cria availabilities apenas para o criador e Roberto.
        Lógica: Arthur/Sara (contratantes) criam eventos e contratam Roberto (baterista)
        Status inicial: 'proposed' (exceto se is_solo=True, então 'approved')
        """
        is_solo = serializer.validated_data.get('is_solo', False)

        # Se é evento solo, vai direto para 'approved', caso contrário 'proposed'
        event = serializer.save(
            created_by=self.request.user,
            status='approved' if is_solo else 'proposed'
        )

        # Criar availabilities:
        # - Para eventos solo: apenas o criador
        # - Para eventos com banda: criador + Roberto (líder)

        availabilities = []

        # 1. Criador do evento (automaticamente disponível)
        try:
            creator_musician = self.request.user.musician_profile
            availabilities.append(
                Availability(
                    musician=creator_musician,
                    event=event,
                    response='available',
                    notes='Evento criado por mim' if not is_solo else 'Show solo'
                )
            )
        except Musician.DoesNotExist:
            pass

        # 2. Roberto (baterista/líder) - apenas se NÃO for evento solo
        if not is_solo:
            try:
                roberto = Musician.objects.get(user__username='roberto')
                # Só criar se Roberto não for o criador
                if roberto.user != self.request.user:
                    availabilities.append(
                        Availability(
                            musician=roberto,
                            event=event,
                            response='pending'
                        )
                    )
            except Musician.DoesNotExist:
                pass

        if availabilities:
            Availability.objects.bulk_create(availabilities)

        # Ajustar janelas de disponibilidade do líder consumindo o horário do evento (somente eventos com banda)
        if not is_solo:
            self._consume_leader_availability(event)

    def _consume_leader_availability(self, event):
        """
        Subtrai o intervalo do evento das disponibilidades ativas do líder:
        - desativa a disponibilidade original
        - recria sobras antes/depois, se existirem
        """
        try:
            leader = Musician.objects.filter(role='leader').first()
            if not leader:
                return
        except Musician.DoesNotExist:
            return

        overlaps = LeaderAvailability.objects.filter(
            leader=leader,
            is_active=True,
            date=event.event_date,
            start_datetime__lt=event.end_datetime,
            end_datetime__gt=event.start_datetime
        )

        tz = timezone.get_current_timezone()

        for avail in overlaps:
            pre_start = avail.start_datetime
            pre_end = event.start_datetime
            post_start = event.end_datetime
            post_end = avail.end_datetime

            # Desativar a disponibilidade original
            avail.is_active = False
            avail.save(update_fields=['is_active'])

            new_slots = []

            # Janela antes do evento
            if pre_end > pre_start:
                new_slots.append(
                    LeaderAvailability(
                        leader=leader,
                        date=avail.date,
                        start_time=pre_start.astimezone(tz).time(),
                        end_time=pre_end.astimezone(tz).time(),
                        notes=avail.notes
                    )
                )

            # Janela depois do evento
            if post_end > post_start:
                new_slots.append(
                    LeaderAvailability(
                        leader=leader,
                        date=avail.date,
                        start_time=post_start.astimezone(tz).time(),
                        end_time=post_end.astimezone(tz).time(),
                        notes=avail.notes
                    )
                )

            if new_slots:
                LeaderAvailability.objects.bulk_create(new_slots)
    
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
        """
        from django.utils import timezone
        queryset = LeaderAvailability.objects.filter(is_active=True).select_related('leader__user')

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
        if leader_id:
            queryset = queryset.filter(leader_id=leader_id)

        return queryset

    def get_permissions(self):
        """
        Permissões customizadas:
        - create/update/delete: apenas líderes
        - list/retrieve: todos os músicos autenticados
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Apenas líderes podem modificar
            return [IsAuthenticated(), IsLeaderOrReadOnly()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """
        Salva disponibilidade atribuindo o líder logado.
        Apenas líderes podem criar disponibilidades.
        """
        try:
            musician = self.request.user.musician_profile

            if not musician.is_leader():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Apenas líderes podem cadastrar disponibilidades.')

            serializer.save(leader=musician)
        except Musician.DoesNotExist:
            from rest_framework.exceptions import ValidationError
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
        Permite apenas que o líder atualize suas próprias disponibilidades.
        """
        try:
            musician = self.request.user.musician_profile

            if not musician.is_leader():
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Apenas líderes podem atualizar disponibilidades.')

            # Verifica se a disponibilidade pertence ao líder
            if serializer.instance.leader != musician:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied('Você não pode editar disponibilidades de outros líderes.')

            serializer.save()
        except Musician.DoesNotExist:
            from rest_framework.exceptions import ValidationError
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
