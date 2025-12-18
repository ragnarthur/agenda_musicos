# config/settings.py
from pathlib import Path
import os
from decouple import config as decouple_config, Config, RepositoryEnv
from datetime import timedelta
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent

# Perfil de ambiente: produção por padrão. Para usar .env.local, exporte DJANGO_ENV=development (ou ENV=development).
ENV_PROFILE = os.getenv('DJANGO_ENV') or os.getenv('ENV') or 'production'
ENV_LOCAL = BASE_DIR / '.env.local'
if ENV_PROFILE.lower() != 'production' and ENV_LOCAL.exists():
    config = Config(RepositoryEnv(str(ENV_LOCAL)))
else:
    config = decouple_config

# SECURITY
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
# Hosts
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='').split(',')
# Inclui testserver apenas em desenvolvimento/testes
if DEBUG and 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

# APPS
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    
    # Local apps
    'agenda',
    'marketplace',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Antes do CommonMiddleware
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'config.middleware.JWTAuthCookieMiddleware',
    'django.middleware.common.CommonMiddleware',
    'config.middleware.CSPMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# DATABASE
default_db_url = f"sqlite:///{BASE_DIR / 'db.sqlite3'}"
DATABASE_URL = config('DATABASE_URL', default=default_db_url)


def parse_database_url(url: str) -> dict:
    parsed = urlparse(url)
    normalized_url = url.lower()
    scheme = (parsed.scheme or 'sqlite').lower()

    if scheme in ('sqlite', 'sqlite3'):
        db_path = parsed.path or ''
        if not db_path:
            name = BASE_DIR / 'db.sqlite3'
        else:
            # Detect se o caminho informado deve ser tratado como absoluto.
            # Por convenção, URLs no formato sqlite:////abs/path apontam para caminhos absolutos.
            is_absolute = normalized_url.startswith('sqlite:////') or normalized_url.startswith('sqlite3:////')
            if db_path.startswith('/') and is_absolute:
                name = db_path
            else:
                # Remove a barra inicial para evitar gerar caminhos fora do BASE_DIR.
                relative_path = db_path.lstrip('/')
                name = BASE_DIR / relative_path
        return {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': str(name),
        }

    if scheme in ('postgres', 'postgresql', 'psql'):
        options = {}
        if not DEBUG:
            options['sslmode'] = 'require'

        return {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': (parsed.path or '').lstrip('/'),
            'USER': parsed.username or '',
            'PASSWORD': parsed.password or '',
            'HOST': parsed.hostname or 'localhost',
            'PORT': parsed.port or '',
            'CONN_MAX_AGE': 600,
            'OPTIONS': options,
        }

    raise ValueError(f'Banco de dados não suportado: {url}')


DATABASES = {
    'default': parse_database_url(DATABASE_URL)
}

# PASSWORD VALIDATION
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# INTERNATIONALIZATION
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# STATIC FILES
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST FRAMEWORK
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        # Throttles específicos para endpoints críticos
        'login': '5/minute',           # Previne brute force
        'create_event': '30/hour',     # Limita criação de eventos
        'preview_conflicts': '60/minute',  # Preview durante criação
        'burst': '10/minute',          # Rate para ações sensíveis
    },
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
}

# JWT SETTINGS
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# CORS
# Usa .env (CORS_ALLOWED_ORIGINS ou CORS_ORIGINS) para produção
_cors_from_env = config('CORS_ALLOWED_ORIGINS', default=config('CORS_ORIGINS', default='')).split(',')
_cors_from_env = [origin for origin in _cors_from_env if origin]  # remove strings vazias

# Adiciona localhost apenas em desenvolvimento (DEBUG=True)
if DEBUG:
    CORS_ALLOWED_ORIGINS = _cors_from_env + [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
else:
    # Em produção, usa apenas domínios configurados no .env
    CORS_ALLOWED_ORIGINS = _cors_from_env

CORS_ALLOW_CREDENTIALS = True

# EMAIL CONFIGURATION
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='Agenda Musicos <noreply@agendamusicos.com>')

# Frontend URL (para links de verificação de email)
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

# Payment Service Integration
PAYMENT_SERVICE_URL = config('PAYMENT_SERVICE_URL', default='http://localhost:3001')
PAYMENT_SERVICE_SECRET = config('PAYMENT_SERVICE_SECRET', default='')

# SECURITY HEADERS
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Configurações adicionais de segurança para produção com HTTPS
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Se o ambiente tiver HTTPS, habilitar também:
    # SECURE_SSL_REDIRECT = True
    # SECURE_HSTS_SECONDS = 31536000
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # SECURE_HSTS_PRELOAD = True

# LOGGING CONFIGURATION
LOG_DIR = BASE_DIR / 'logs'
LOG_DIR.mkdir(exist_ok=True)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOG_DIR / 'django.log',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'agenda': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
