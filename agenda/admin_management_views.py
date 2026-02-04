"""
Views para gerenciamento de administradores e usuários.
"""

import logging
from datetime import timedelta

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils import timezone

from .permissions import IsAppOwner
from .serializers import (
    AdminUserSerializer,
    AdminCreateSerializer,
    AdminUpdateSerializer,
    ContractorProfileSerializer,
    OrganizationSerializer,
)
from .models import AuditLog, ContactView, ContractorProfile, MusicianRequest, Organization
from notifications.services.email_service import send_user_deletion_email

User = get_user_model()

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def list_admin_users(request):
    """Lista todos os usuários admin (apenas owners)"""
    admins = User.objects.filter(Q(is_staff=True) | Q(is_superuser=True)).order_by(
        "-date_joined"
    )

    serializer = AdminUserSerializer(admins, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def list_all_users(request):
    """Lista todos os usuários da plataforma para admin"""
    try:
        users = User.objects.all().order_by("-date_joined")
        serializer = AdminUserSerializer(users, many=True)
        return Response(serializer.data)
    except Exception as e:
        logger.error(f"Error listing all users: {str(e)}", exc_info=True)
        return Response(
            {"error": "Erro ao listar organizações"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def list_contractors(request):
    """Lista todos os contratantes"""
    contractors = (
        ContractorProfile.objects.select_related("user")
        .order_by("-created_at")
    )
    serializer = ContractorProfileSerializer(contractors, many=True)
    return Response(serializer.data)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def delete_contractor(request, pk):
    """Deleta perfil de contratante"""
    try:
        contractor = ContractorProfile.objects.select_related("user").get(pk=pk)
        contractor_name = contractor.name
        contractor_user = contractor.user

        contractor.delete()

        logger.info(
            f"Contractor delete | Admin: {request.user.username} | "
            f"Deleted: {contractor_name} | User: {contractor_user.username}"
        )

        return Response(
            {
                "message": f"Contratante {contractor_name} deletado com sucesso",
                "deleted_contractor": {
                    "id": pk,
                    "name": contractor_name,
                    "user_id": contractor_user.id,
                },
                "deleted_by": request.user.username,
            },
            status=status.HTTP_200_OK,
        )
    except ContractorProfile.DoesNotExist:
        return Response(
            {"error": "Contratante não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error deleting contractor {pk}: {str(e)}", exc_info=True)
        return Response(
            {"error": "Erro ao deletar contratante"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_organization(request, pk):
    """
    Deleta uma organização.

    Proteções:
    - Requer autenticação + IsAdminUser (admin_1, admin_2)
    - Protege organizações patrocinadas (is_sponsor=True)
    - Log da ação para auditoria
    """
    try:
        organization = Organization.objects.get(pk=pk)
        client_ip = request.META.get("REMOTE_ADDR", "")
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # Proteção: Não permite deletar organizações patrocinadas
        if organization.is_sponsor:
            logger.warning(
                f"Attempt to delete sponsored organization {organization.name} "
                f"by {request.user.username} from {client_ip}"
            )
            return Response(
                {"error": "Organizações patrocinadas não podem ser deletadas"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Salvar informações antes de deletar
        org_owner_info = None
        if organization.owner:
            org_owner_info = {
                "username": organization.owner.username,
                "email": organization.owner.email,
                "first_name": organization.owner.first_name,
                "last_name": organization.owner.last_name,
                "is_staff": organization.owner.is_staff,
                "is_superuser": organization.owner.is_superuser,
            }

        # Criar log de auditoria
        logger.info(
            f"Organization delete | Admin: {request.user.username} | "
            f"Deleted: {organization.name} | "
            f"Type: {organization.org_type} | "
            f"Was Sponsor: {organization.is_sponsor} | "
            f"Owner: {org_owner_info.get('username') if org_owner_info else 'None'} | "
            f"IP: {client_ip}"
        )

        # Deletar organização (cascade deleta eventos, membros, etc.)
        org_name = organization.name
        organization.delete()

        return Response(
            {
                "message": f"Organização {org_name} deletada com sucesso",
                "deleted_organization": {
                    "id": pk,
                    "name": org_name,
                    "org_type": organization.org_type,
                    "is_sponsor": organization.is_sponsor,
                },
                "deleted_owner": org_owner_info,
                "deleted_by": request.user.username,
            },
            status=status.HTTP_200_OK,
        )

    except Organization.DoesNotExist:
        return Response(
            {"error": "Organização não encontrada"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error deleting organization {pk}: {str(e)}", exc_info=True)
        return Response(
            {"error": "Erro ao deletar organização"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def get_admin_user(request, pk):
    """Detalhes de um admin específico (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)
        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Usuário não é administrador"},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = AdminUserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def create_admin_user(request):
    """Cria novo admin (apenas owners)"""
    serializer = AdminCreateSerializer(data=request.data, context={"request": request})

    if serializer.is_valid():
        user = serializer.save()
        return Response(AdminUserSerializer(user).data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def update_admin_user(request, pk):
    """Atualiza admin (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)

        # Protege admin_1 e admin_2 de alteração de senha
        if user.username in ["admin_1", "admin_2"]:
            # Só permite atualizar email e is_active
            if request.data.get("password"):
                return Response(
                    {"error": "Não é permitido alterar a senha de admin_1 ou admin_2"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            # Remove campos bloqueados
            request_data = request.data.copy()
            request_data.pop("username", None)
            request_data.pop("password", None)
            serializer = AdminUpdateSerializer(user, data=request_data, partial=True)
        else:
            # Outros admins podem ser alterados normalmente
            serializer = AdminUpdateSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            user = serializer.save()
            return Response(AdminUserSerializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def delete_admin_user(request, pk):
    """Deleta admin (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)

        # Protege admin_1 e admin_2 de deleção
        if user.username in ["admin_1", "admin_2"]:
            return Response(
                {"error": "Não é permitido deletar admin_1 ou admin_2"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Usuário não é administrador"},
                status=status.HTTP_404_NOT_FOUND,
            )

        username = user.username
        user.delete()
        return Response(
            {"message": f"Admin {username} deletado com sucesso"},
            status=status.HTTP_200_OK,
        )

    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def reset_admin_password(request, pk):
    """Reseta senha de admin (apenas owners)"""
    try:
        user = User.objects.get(pk=pk)

        if not (user.is_staff or user.is_superuser):
            return Response(
                {"error": "Usuário não é administrador"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Para admin_1 e admin_2, senha fixa
        if user.username in ["admin_1", "admin_2"]:
            new_password = "Teste123@"
        else:
            # Para outros admins, gera senha aleatória
            import secrets

            new_password = secrets.token_urlsafe(12)

        user.set_password(new_password)
        user.save()

        return Response(
            {
                "message": "Senha resetada com sucesso",
                "password": new_password if request.user.is_superuser else None,
            },
            status=status.HTTP_200_OK,
        )

    except User.DoesNotExist:
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated, IsAdminUser, IsAppOwner])
def delete_user(request, pk):
    """
    Deleta um usuário e todos os dados relacionados.

    Proteções:
    - Não permite deletar admin_1 ou admin_2
    - Não permite deletar superusers (is_superuser=True)
    - Não permite deletar o próprio usuário
    - Log da ação para auditoria
    - Envia email de notificação
    """
    try:
        user = User.objects.get(pk=pk)
        client_ip = request.META.get("REMOTE_ADDR", "")
        user_agent = request.META.get("HTTP_USER_AGENT", "")

        # Proteção 1: Não pode deletar admin_1 ou admin_2
        if user.username in ["admin_1", "admin_2"]:
            logger.warning(
                f"Attempt to delete protected admin {user.username} "
                f"by {request.user.username} from {client_ip}"
            )
            return Response(
                {
                    "error": "admin_1 e admin_2 são usuários protegidos e não podem ser deletados"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Proteção 2: Não pode deletar superusers
        if user.is_superuser:
            logger.warning(
                f"Attempt to delete superuser {user.username} "
                f"by {request.user.username} from {client_ip}"
            )
            return Response(
                {"error": "Superadmins não podem ser deletados"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Proteção 3: Não pode deletar o próprio usuário
        if user == request.user:
            logger.warning(
                f"Attempt to delete own account {user.username} "
                f"by {request.user.username} from {client_ip}"
            )
            return Response(
                {"error": "Você não pode deletar a própria conta"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Salvar informações antes de deletar
        deleted_user_info = {
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
        }

        # Verificar se é músico para pegar mais informações
        user_full_name = user.get_full_name() or user.username

        # Enviar email de notificação
        if user.email:
            send_user_deletion_email(
                to_email=user.email,
                first_name=user_full_name,
                admin_name=request.user.get_full_name() or request.user.username,
            )

        # Deletar MusicianRequest relacionado ao email
        MusicianRequest.objects.filter(email__iexact=user.email).delete()

        # Criar log de auditoria antes de deletar
        # Usando logger simples em vez de AuditLog para evitar erro de tabela
        logger.info(
            f"User delete | Admin: {request.user.username} | "
            f"Deleted: {user.username} | "
            f"Email: {user.email} | "
            f"Was Superuser: {user.is_superuser} | "
            f"IP: {client_ip} | "
            f"User-Agent: {user_agent}"
        )

        # Deletar usuário (cascade deleta Musician, Organization, etc.)
        user.delete()

        return Response(
            {
                "message": f"Usuário {user.username} deletado com sucesso",
                "deleted_user": deleted_user_info,
                "deleted_by": request.user.username,
            },
            status=status.HTTP_200_OK,
        )

    except User.DoesNotExist:
        logger.error(f"User not found for deletion: pk={pk}")
        return Response(
            {"error": "Usuário não encontrado"}, status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error deleting user {pk}: {str(e)}", exc_info=True)
        return Response(
            {"error": "Erro ao deletar usuário"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_organizations(request):
    """Lista todas as organizações para admin"""
    try:
        organizations = Organization.objects.select_related("owner").order_by(
            "-created_at"
        )

        data = []
        for org in organizations:
            org_data = OrganizationSerializer(org, context={"request": request}).data

            owner_data = None
            if org.owner:
                owner_data = {
                    "id": org.owner.id,
                    "username": org.owner.username,
                    "email": org.owner.email,
                    "first_name": org.owner.first_name,
                    "last_name": org.owner.last_name,
                    "is_staff": org.owner.is_staff,
                    "is_superuser": org.owner.is_superuser,
                }

            org_data["owner_data"] = owner_data
            data.append(org_data)

        return Response(data)
    except Exception as e:
        logger.error(f"Error listing organizations: {str(e)}", exc_info=True)
        return Response(
            {"error": "Erro ao listar organizações"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =============================================================================
# Contact Views Audit (Admin Only)
# =============================================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def list_contact_views(request):
    """
    Lista visualizações de contato para auditoria (admin only).
    GET /api/admin/contact-views/
    Filtros: musician_id, contractor_id, date_from, date_to
    """
    from rest_framework.pagination import PageNumberPagination

    # Filtros opcionais
    musician_id = request.query_params.get("musician_id")
    contractor_id = request.query_params.get("contractor_id")
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    queryset = ContactView.objects.select_related(
        "contractor", "contractor__user", "musician", "musician__user"
    ).order_by("-viewed_at")

    if musician_id:
        queryset = queryset.filter(musician_id=musician_id)
    if contractor_id:
        queryset = queryset.filter(contractor_id=contractor_id)
    if date_from:
        queryset = queryset.filter(viewed_at__date__gte=date_from)
    if date_to:
        queryset = queryset.filter(viewed_at__date__lte=date_to)

    # Paginação
    paginator = PageNumberPagination()
    paginator.page_size = 50
    page = paginator.paginate_queryset(queryset, request)

    data = [
        {
            "id": cv.id,
            "contractor": {
                "id": cv.contractor.id,
                "name": cv.contractor.name,
                "phone": cv.contractor.phone,
                "email": cv.contractor.user.email if cv.contractor.user else None,
            },
            "musician": {
                "id": cv.musician.id,
                "name": cv.musician.user.get_full_name() or cv.musician.user.username,
            },
            "viewed_at": cv.viewed_at.isoformat(),
            "ip_address": cv.ip_address,
        }
        for cv in page
    ]

    return paginator.get_paginated_response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsAdminUser])
def contact_views_stats(request):
    """
    Estatísticas de visualizações de contato (admin only).
    GET /api/admin/contact-views/stats/
    """
    from django.db.models import Count
    from django.db.models.functions import TruncDate

    # Total de visualizações
    total = ContactView.objects.count()

    # Últimos 7 dias
    last_week = timezone.now() - timedelta(days=7)
    last_week_count = ContactView.objects.filter(viewed_at__gte=last_week).count()

    # Top 10 músicos mais visualizados
    top_musicians = (
        ContactView.objects.values(
            "musician__id",
            "musician__user__first_name",
            "musician__user__last_name",
        )
        .annotate(views=Count("id"))
        .order_by("-views")[:10]
    )

    # Top 10 contractors mais ativos
    top_contractors = (
        ContactView.objects.values("contractor__id", "contractor__name")
        .annotate(views=Count("id"))
        .order_by("-views")[:10]
    )

    # Visualizações por dia (últimos 30 dias)
    last_month = timezone.now() - timedelta(days=30)
    daily_views = (
        ContactView.objects.filter(viewed_at__gte=last_month)
        .annotate(date=TruncDate("viewed_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )

    return Response(
        {
            "total_views": total,
            "last_week_views": last_week_count,
            "top_musicians": list(top_musicians),
            "top_contractors": list(top_contractors),
            "daily_views": list(daily_views),
        }
    )
