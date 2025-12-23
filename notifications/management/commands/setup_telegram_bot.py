import requests
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Configura webhook do Telegram Bot'

    def add_arguments(self, parser):
        parser.add_argument(
            '--webhook-url',
            type=str,
            help='URL publica do webhook (ex: https://meusite.com/api/notifications/telegram/webhook/)'
        )
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Remove webhook existente'
        )
        parser.add_argument(
            '--info',
            action='store_true',
            help='Mostra informacoes do bot'
        )

    def handle(self, *args, **options):
        token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')

        if not token:
            self.stderr.write(self.style.ERROR(
                'TELEGRAM_BOT_TOKEN nao configurado.\n'
                'Adicione ao seu .env:\n'
                'TELEGRAM_BOT_TOKEN=seu_token_aqui'
            ))
            return

        base_url = f"https://api.telegram.org/bot{token}"

        # Mostra info do bot
        if options['info']:
            self._show_bot_info(base_url)
            return

        # Remove webhook
        if options['delete']:
            self._delete_webhook(base_url)
            return

        # Configura webhook
        webhook_url = options.get('webhook_url')
        if not webhook_url:
            self.stderr.write(self.style.ERROR(
                '--webhook-url e obrigatorio para configurar webhook.\n'
                'Exemplo: python manage.py setup_telegram_bot --webhook-url https://meusite.com/api/notifications/telegram/webhook/'
            ))
            self._show_current_webhook(base_url)
            return

        self._set_webhook(base_url, webhook_url)

    def _show_bot_info(self, base_url: str):
        """Mostra informacoes do bot"""
        try:
            response = requests.get(f"{base_url}/getMe", timeout=10)
            data = response.json()

            if data.get('ok'):
                bot = data['result']
                self.stdout.write(self.style.SUCCESS(f"\nBot Info:"))
                self.stdout.write(f"  ID: {bot.get('id')}")
                self.stdout.write(f"  Nome: {bot.get('first_name')}")
                self.stdout.write(f"  Username: @{bot.get('username')}")
                self.stdout.write(f"  Pode entrar em grupos: {bot.get('can_join_groups', False)}")
                self.stdout.write("")

                # Mostra webhook atual
                self._show_current_webhook(base_url)
            else:
                self.stderr.write(self.style.ERROR(f"Erro: {data}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Erro ao buscar info: {e}"))

    def _show_current_webhook(self, base_url: str):
        """Mostra webhook atual"""
        try:
            response = requests.get(f"{base_url}/getWebhookInfo", timeout=10)
            data = response.json()

            if data.get('ok'):
                webhook = data['result']
                url = webhook.get('url', '')

                self.stdout.write(self.style.SUCCESS(f"Webhook atual:"))
                if url:
                    self.stdout.write(f"  URL: {url}")
                    self.stdout.write(f"  Pending updates: {webhook.get('pending_update_count', 0)}")
                    if webhook.get('last_error_message'):
                        self.stdout.write(self.style.WARNING(f"  Ultimo erro: {webhook.get('last_error_message')}"))
                else:
                    self.stdout.write(f"  Nenhum webhook configurado")
                self.stdout.write("")

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Erro ao buscar webhook: {e}"))

    def _delete_webhook(self, base_url: str):
        """Remove webhook existente"""
        try:
            response = requests.post(f"{base_url}/deleteWebhook", timeout=10)
            data = response.json()

            if data.get('ok'):
                self.stdout.write(self.style.SUCCESS('Webhook removido com sucesso!'))
            else:
                self.stderr.write(self.style.ERROR(f"Erro: {data}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Erro ao remover webhook: {e}"))

    def _set_webhook(self, base_url: str, webhook_url: str):
        """Configura novo webhook"""
        try:
            response = requests.post(
                f"{base_url}/setWebhook",
                json={
                    'url': webhook_url,
                    'allowed_updates': ['message'],
                    'drop_pending_updates': True,
                },
                timeout=10
            )

            data = response.json()

            if data.get('ok'):
                self.stdout.write(self.style.SUCCESS(f'Webhook configurado com sucesso!'))
                self.stdout.write(f'  URL: {webhook_url}')
                self.stdout.write("")

                # Mostra info do bot
                self._show_bot_info(base_url)
            else:
                self.stderr.write(self.style.ERROR(f"Erro: {data.get('description', data)}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Erro ao configurar webhook: {e}"))
