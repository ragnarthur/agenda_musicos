# agenda/services/email_service.py
# Serviço centralizado para envio de emails no sistema
import logging

from django.conf import settings
from django.core.mail import EmailMessage, send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


class EmailService:
    """Serviço centralizado para envio de emails do GigFlow"""

    @staticmethod
    def send_email(
        subject: str,
        message: str,
        recipient_list: list,
        html_message: str = None,
        from_email: str = None,
    ) -> bool:
        """Envia email básico"""
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email or settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            logger.error(f"Erro ao enviar email: {e}")
            return False

    @staticmethod
    def notify_admins_new_request(musician_request):
        """
        Notifica administradores sobre nova solicitação de acesso
        """
        try:
            # Lista de emails administradores (do settings ou fixo)
            admin_emails = getattr(settings, "ADMIN_EMAILS", ["gigflowagenda@gmail.com"])

            if isinstance(admin_emails, str):
                admin_emails = [email.strip() for email in admin_emails.split(",")]

            subject = "⭐ Nova Solicitação de Acesso - GigFlow"

            # Renderizar template HTML
            html_message = render_to_string(
                "emails/new_request_admin.html",
                {
                    "musician_request": musician_request,
                    "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
                    "admin_panel_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/admin/solicitacoes",
                },
            )

            # Versão texto
            text_message = strip_tags(html_message)

            success = EmailService.send_email(
                subject=subject,
                message=text_message,
                recipient_list=admin_emails,
                html_message=html_message,
            )

            if success:
                logger.info(
                    f"Notificação enviada para admins sobre solicitação #{musician_request.id}"
                )

            return success

        except Exception as e:
            logger.error(f"Erro ao notificar admins sobre nova solicitação: {e}")
            return False

    @staticmethod
    def send_approval_notification(musician_request, credentials):
        """
        Envia email para músico aprovado com credenciais de acesso
        """
        try:
            subject = "🎉 Seu Acesso ao GigFlow foi Aprovado!"

            html_message = render_to_string(
                "emails/request_approved.html",
                {
                    "musician_request": musician_request,
                    "credentials": credentials,
                    "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
                    "login_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login",
                },
            )

            text_message = strip_tags(html_message)

            success = EmailService.send_email(
                subject=subject,
                message=text_message,
                recipient_list=[musician_request.email],
                html_message=html_message,
            )

            if success:
                logger.info(f"Email de aprovação enviado para {musician_request.email}")

            return success

        except Exception as e:
            logger.error(f"Erro ao enviar email de aprovação: {e}")
            return False

    @staticmethod
    def send_rejection_notification(musician_request, rejection_reason=None):
        """
        Envia email para músico com notificação de rejeição
        """
        try:
            subject = "💬 Sobre sua solicitação de acesso ao GigFlow"

            html_message = render_to_string(
                "emails/request_rejected.html",
                {
                    "musician_request": musician_request,
                    "rejection_reason": rejection_reason
                    or "Não atendemos nossos critérios no momento.",
                    "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
                    "request_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/solicitar-acesso",
                },
            )

            text_message = strip_tags(html_message)

            success = EmailService.send_email(
                subject=subject,
                message=text_message,
                recipient_list=[musician_request.email],
                html_message=html_message,
            )

            if success:
                logger.info(f"Email de rejeição enviado para {musician_request.email}")

            return success

        except Exception as e:
            logger.error(f"Erro ao enviar email de rejeição: {e}")
            return False

    @staticmethod
    def send_welcome_email_to_new_user(user, organization=None):
        """
        Envia email de boas-vindas para novo usuário (empresa)
        """
        try:
            if organization:
                subject = f"🎉 Bem-vindo ao GigFlow, {organization.name}!"
                template = "emails/welcome_company.html"
                extra_context = {"organization": organization}
            else:
                subject = "🎉 Bem-vindo ao GigFlow!"
                template = "emails/welcome_musician.html"
                extra_context = {}

            html_message = render_to_string(
                template,
                {
                    "user": user,
                    "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
                    **extra_context,
                },
            )

            text_message = strip_tags(html_message)

            success = EmailService.send_email(
                subject=subject,
                message=text_message,
                recipient_list=[user.email],
                html_message=html_message,
            )

            if success:
                logger.info(f"Email de boas-vindas enviado para {user.email}")

            return success

        except Exception as e:
            logger.error(f"Erro ao enviar email de boas-vindas: {e}")
            return False

    @staticmethod
    def send_contact_notification(musician, company, contact_request):
        """
        Notifica músico sobre novo contato de empresa
        """
        try:
            subject = f"📬 Nova mensagem de {company.name} - GigFlow"

            html_message = render_to_string(
                "emails/new_contact_musician.html",
                {
                    "musician": musician,
                    "company": company,
                    "contact_request": contact_request,
                    "frontend_url": getattr(settings, "FRONTEND_URL", "http://localhost:5173"),
                    "messages_url": f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/musicos/mensagens",
                },
            )

            text_message = strip_tags(html_message)

            success = EmailService.send_email(
                subject=subject,
                message=text_message,
                recipient_list=[musician.user.email],
                html_message=html_message,
            )

            if success:
                logger.info(f"Notificação de contato enviada para músico {musician.user.email}")

            return success

        except Exception as e:
            logger.error(f"Erro ao enviar notificação de contato: {e}")
            return False
