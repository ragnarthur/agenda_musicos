"""
Centralized email service for GigFlow.

Handles all email sending with Django templates, providing:
- HTML emails with consistent branding
- Plain text fallback versions
- Preview text support
- Unsubscribe links
"""

import logging
from typing import Any

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template import TemplateDoesNotExist
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class EmailService:
    """
    Centralized service for sending emails using Django templates.

    Usage:
        from notifications.services.email_service import EmailService

        EmailService.send(
            template_name='verification',
            to_email='user@example.com',
            subject='Confirme seu email',
            context={
                'first_name': 'João',
                'verification_url': 'https://...',
            }
        )
    """

    DEFAULT_FROM_EMAIL = "GigFlow <gigflowagenda@gmail.com>"
    TEMPLATES_BASE_PATH = "emails/"

    @classmethod
    def send(
        cls,
        template_name: str,
        to_email: str,
        subject: str,
        context: dict[str, Any] | None = None,
        from_email: str | None = None,
        fail_silently: bool = False,
        show_unsubscribe: bool = False,
    ) -> bool:
        """
        Send an email using a Django template.

        Args:
            template_name: Name of the template (without path/extension).
                           e.g., 'verification' for 'emails/verification.html'
            to_email: Recipient email address.
            subject: Email subject line.
            context: Template context variables.
            from_email: Sender email (defaults to GigFlow).
            fail_silently: If True, suppresses exceptions on failure.
            show_unsubscribe: If True, shows unsubscribe link in footer.

        Returns:
            bool: True if email was sent successfully, False otherwise.
        """
        context = context or {}

        # Add common context variables
        context.update(
            {
                "frontend_url": getattr(settings, "FRONTEND_URL", ""),
                "user_email": to_email,
                "show_unsubscribe": show_unsubscribe,
            }
        )

        # Render HTML template
        html_template = f"{cls.TEMPLATES_BASE_PATH}{template_name}.html"
        try:
            html_content = render_to_string(html_template, context)
        except TemplateDoesNotExist:
            logger.error(f"Email template not found: {html_template}")
            if not fail_silently:
                raise
            return False

        # Render plain text template (fallback to auto-generated if not found)
        text_template = f"{cls.TEMPLATES_BASE_PATH}txt/{template_name}.txt"
        try:
            text_content = render_to_string(text_template, context)
        except TemplateDoesNotExist:
            # Generate basic text version from context
            text_content = cls._generate_text_fallback(subject, context)
            logger.warning(
                f"Plain text template not found: {text_template}, using fallback"
            )

        # Prepare email
        sender = from_email or getattr(
            settings, "DEFAULT_FROM_EMAIL", cls.DEFAULT_FROM_EMAIL
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender,
            to=[to_email],
        )
        email.attach_alternative(html_content, "text/html")

        # Send email
        try:
            email.send(fail_silently=fail_silently)
            logger.info(f"Email sent successfully: {template_name} to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email {template_name} to {to_email}: {e}")
            if not fail_silently:
                raise
            return False

    @classmethod
    def _generate_text_fallback(cls, subject: str, context: dict[str, Any]) -> str:
        """
        Generate a basic plain text version when no .txt template exists.
        """
        lines = [
            "GigFlow - Sua agenda de shows profissional",
            "=" * 45,
            "",
            subject,
            "",
        ]

        # Add common fields if present
        if "first_name" in context:
            lines.append(f"Olá, {context['first_name']}!")
            lines.append("")

        if "body" in context:
            lines.append(context["body"])
            lines.append("")

        # Add action URL if present
        url_keys = [
            "verification_url",
            "reset_url",
            "action_url",
            "login_url",
            "event_url",
        ]
        for key in url_keys:
            if key in context and context[key]:
                lines.append(f"Link: {context[key]}")
                lines.append("")
                break

        lines.extend(
            [
                "",
                "-" * 45,
                "Este email foi enviado por GigFlow.",
                f"Acesse: {context.get('frontend_url', '')}",
            ]
        )

        return "\n".join(lines)


# Convenience functions for common email types
def send_verification_email(
    to_email: str, first_name: str, verification_url: str
) -> bool:
    """Send email verification email."""
    return EmailService.send(
        template_name="verification",
        to_email=to_email,
        subject="Confirme seu email - GigFlow",
        context={
            "first_name": first_name,
            "verification_url": verification_url,
        },
    )


def send_password_reset_email(to_email: str, first_name: str, reset_url: str) -> bool:
    """Send password reset email."""
    return EmailService.send(
        template_name="password_reset",
        to_email=to_email,
        subject="Redefinição de senha - GigFlow",
        context={
            "first_name": first_name,
            "reset_url": reset_url,
        },
    )


def send_welcome_email(
    to_email: str, first_name: str, username: str, login_url: str
) -> bool:
    """Send welcome email after registration."""
    return EmailService.send(
        template_name="welcome",
        to_email=to_email,
        subject="Bem-vindo ao GigFlow!",
        context={
            "first_name": first_name,
            "username": username,
            "login_url": login_url,
        },
        fail_silently=True,
    )


def send_event_notification_email(
    to_email: str,
    template_name: str,
    subject: str,
    context: dict[str, Any],
) -> bool:
    """Send event-related notification email."""
    return EmailService.send(
        template_name=template_name,
        to_email=to_email,
        subject=subject,
        context=context,
        show_unsubscribe=True,
        fail_silently=True,
    )


def send_user_deletion_email(to_email: str, first_name: str, admin_name: str) -> bool:
    """Send user deletion notification email."""
    from django.utils import timezone

    return EmailService.send(
        template_name="user_deleted",
        to_email=to_email,
        subject="Sua conta no GigFlow foi deletada",
        context={
            "first_name": first_name,
            "user_email": to_email,
            "admin_name": admin_name,
            "timestamp": timezone.now(),
        },
        from_email="GigFlow Admin <noreply@gigflowagenda.com.br>",
        fail_silently=True,
    )
