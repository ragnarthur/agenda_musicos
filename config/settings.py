# config/settings.py
import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

from decouple import Config, RepositoryEnv
from decouple import config as decouple_config

# =========================================================
# Base / Env Loader
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent

ENV_PROFILE = os.getenv("DJANGO_ENV") or os.getenv("ENV") or "production"
ENV_FILE = os.getenv("ENV_FILE")
ENV_DOCKER = BASE_DIR / ".env.docker"
ENV_LOCAL = BASE_DIR / ".env.local"
ENV_DEFAULT = BASE_DIR / ".env"

if ENV_FILE:
    config = Config(RepositoryEnv(ENV_FILE))
elif ENV_DOCKER.exists():
    # Prefer .env.docker when available (local dev uses Postgres via Docker)
    config = Config(RepositoryEnv(str(ENV_DOCKER)))
elif ENV_PROFILE.lower() != "production" and ENV_LOCAL.exists():
    config = Config(RepositoryEnv(str(ENV_LOCAL)))
elif ENV_DEFAULT.exists():
    config = Config(RepositoryEnv(str(ENV_DEFAULT)))
else:
    config = decouple_config


def env_csv(name: str, default: str = "") -> list[str]:
    """
    Lê env estilo CSV: "a,b,c" => ["a","b","c"] (strip + remove vazios).
    """
    raw = config(name, default=default)
    if not raw:
        return []
    return [item.strip() for item in str(raw).split(",") if item.strip()]


# =========================================================
# Security
# =========================================================
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
CSP_HEADER = config("CSP_HEADER", default="").strip()
ENABLE_API_DOCS = config("ENABLE_API_DOCS", default=DEBUG, cast=bool)

# Admin URL protegida
import secrets
import sys

IS_TESTING = any(arg == "test" or arg == "pytest" or arg.endswith("pytest") for arg in sys.argv)

if DEBUG or IS_TESTING:
    ADMIN_URL = config("ADMIN_URL", default="admin-secret-" + secrets.token_urlsafe(16))
else:
    ADMIN_URL = config("ADMIN_URL", default="").strip()
    if not ADMIN_URL:
        raise RuntimeError("ADMIN_URL está vazio. Configure a env ADMIN_URL.")

ALLOWED_HOSTS = env_csv("ALLOWED_HOSTS", default="")

if not ALLOWED_HOSTS:
    if DEBUG:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
    else:
        raise RuntimeError("ALLOWED_HOSTS está vazio. Configure a env ALLOWED_HOSTS.")

if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

CSRF_TRUSTED_ORIGINS = env_csv("CSRF_TRUSTED_ORIGINS", default="")
if DEBUG:
    for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        if origin not in CSRF_TRUSTED_ORIGINS:
            CSRF_TRUSTED_ORIGINS.append(origin)

# Atrás de proxy (Nginx/Cloudflare): Django entende HTTPS via header
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Só ligue se VOCÊ quer que o Django force redirect (muitos deixam o Nginx fazer isso)
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)

# Cookie secure controlado por env (você já usa no auth_views.py)
COOKIE_SECURE = config("COOKIE_SECURE", default=(not DEBUG), cast=bool)

if not DEBUG and not COOKIE_SECURE:
    raise RuntimeError("COOKIE_SECURE deve ser True em produção.")

if not DEBUG and ENABLE_API_DOCS:
    raise RuntimeError("ENABLE_API_DOCS deve ser False em produção.")

# Security Headers (aplicados automaticamente em produção)
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000  # 1 ano
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"


# =========================================================
# Apps
# =========================================================
INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    # Local
    "agenda",
    "marketplace",
    "notifications",
]


# =========================================================
# Middleware
# =========================================================
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CORS precisa ficar o mais alto possível, antes do CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",
    # CSP header para proteção contra XSS
    "config.middleware.CSPMiddleware",
    # Headers de segurança HTTP adicionais
    "config.middleware.SecurityHeadersMiddleware",
    # Limitação de tamanho de requisição
    "config.middleware.MaxRequestSizeMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# =========================================================
# URLs / WSGI
# =========================================================
ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"


# =========================================================
# Database
# =========================================================
DATABASE_URL = config("DATABASE_URL", default="").strip()
DB_SSL_REQUIRE = config("DB_SSL_REQUIRE", default=False, cast=bool)

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)

    try:
        parsed_port = parsed.port
    except ValueError:
        parsed_port = None

    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", [None])[0] or ("require" if DB_SSL_REQUIRE else "disable")

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": (parsed.path or "").lstrip("/") or config("POSTGRES_DB", default="postgres"),
            "USER": unquote(parsed.username or config("POSTGRES_USER", default="postgres")),
            "PASSWORD": unquote(parsed.password or config("POSTGRES_PASSWORD", default="")),
            "HOST": parsed.hostname or "db",
            "PORT": parsed_port or 5432,
            "CONN_MAX_AGE": 60,
            "OPTIONS": {"sslmode": sslmode},
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# =========================================================
# Cache / Redis
# =========================================================
REDIS_URL = config("REDIS_URL", default="").strip()

if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": REDIS_URL,
            "KEY_PREFIX": "gigflow",
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "gigflow-cache",
        }
    }


# =========================================================
# Password validation
# =========================================================
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# =========================================================
# Internationalization
# =========================================================
LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True


# =========================================================
# Static / Media (compatível com seus volumes)
# =========================================================
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =========================================================
# Cookies / Sessão / CSRF
# =========================================================
SESSION_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SECURE = COOKIE_SECURE

SESSION_COOKIE_SAMESITE = "Strict" if not DEBUG else "Lax"
CSRF_COOKIE_SAMESITE = "Strict" if not DEBUG else "Lax"

CSRF_COOKIE_HTTPONLY = True


# =========================================================
# DRF / JWT
# =========================================================
# ✅ JWTAuthentication padrão NÃO lê cookie.
DEFAULT_AUTH_CLASSES = [
    "config.authentication.CookieOrHeaderJWTAuthentication",
]

# Em debug, você pode manter SessionAuthentication para navegar no DRF Browsable API
if DEBUG:
    DEFAULT_AUTH_CLASSES.append("rest_framework.authentication.SessionAuthentication")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": tuple(DEFAULT_AUTH_CLASSES),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": ("rest_framework.throttling.ScopedRateThrottle",),
    "DEFAULT_THROTTLE_RATES": {
        # Auth
        "login": config("THROTTLE_LOGIN", default="30/min"),
        "token_obtain_pair": config("THROTTLE_LOGIN", default="30/min"),
        "token_refresh": config("THROTTLE_TOKEN_REFRESH", default="60/min"),
        "refresh": config("THROTTLE_TOKEN_REFRESH", default="60/min"),
        # ✅ FIX DO BUG:
        # Algumas views (ex.: password-reset) usam throttle_scope = "burst".
        # Se não existir rate aqui, o DRF levanta ImproperlyConfigured e devolve 500.
        "burst": config("THROTTLE_BURST", default="10/min"),
        # Google Auth (proteção contra abuso)
        "google_auth": config("THROTTLE_GOOGLE_AUTH", default="20/min"),
        "google_register": config("THROTTLE_GOOGLE_REGISTER", default="5/min"),
        # Eventos
        "create_event": config("THROTTLE_CREATE_EVENT", default="30/min"),
        "preview_conflicts": config("THROTTLE_PREVIEW_CONFLICTS", default="60/min"),
        # Outros endpoints sensíveis
        "register": config("THROTTLE_REGISTER", default="5/min"),
        "password_reset": config("THROTTLE_PASSWORD_RESET", default="5/min"),
        "musician_request": config("THROTTLE_MUSICIAN_REQUEST", default="3/min"),
        "profile_update": config("THROTTLE_PROFILE_UPDATE", default="30/min"),
        "check_email": config("THROTTLE_CHECK_EMAIL", default="10/min"),
        "public": config("THROTTLE_PUBLIC", default="100/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=max(int(config("JWT_ACCESS_MINUTES", default=60)), 15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=max(int(config("JWT_REFRESH_DAYS", default=7)), 1)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

if not DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = ("rest_framework.renderers.JSONRenderer",)


# =========================================================
# CORS (seu front chama /api no mesmo domínio, então é tranquilo)
# =========================================================
CORS_ALLOWED_ORIGINS = env_csv("CORS_ALLOWED_ORIGINS", default="")
if DEBUG:
    for origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        if origin not in CORS_ALLOWED_ORIGINS:
            CORS_ALLOWED_ORIGINS.append(origin)

# Se quiser “modo debug” via env:
# CORS_ALLOW_ALL_ORIGINS=True (NÃO use em produção real)
CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=False, cast=bool)

# Prevenir CORS permissivo em produção
if not DEBUG and CORS_ALLOW_ALL_ORIGINS:
    raise RuntimeError(
        "CORS_ALLOW_ALL_ORIGINS não deve ser True em produção. Configure CORS_ALLOWED_ORIGINS."
    )

# ✅ Se você for usar cookies cross-origin (ex: api. subdomain separado),
# precisa True + frontend fetch com credentials: "include".
CORS_ALLOW_CREDENTIALS = config("CORS_ALLOW_CREDENTIALS", default=False, cast=bool)
if DEBUG:
    CORS_ALLOW_CREDENTIALS = True

CORS_URLS_REGEX = r"^/api/.*$"

if not DEBUG:
    if CORS_ALLOW_CREDENTIALS and not CORS_ALLOWED_ORIGINS:
        raise RuntimeError(
            "CORS_ALLOW_CREDENTIALS=True requer CORS_ALLOWED_ORIGINS configurado em produção."
        )
    if not CSRF_TRUSTED_ORIGINS:
        raise RuntimeError("CSRF_TRUSTED_ORIGINS está vazio em produção.")
    if any(not origin.startswith("https://") for origin in CSRF_TRUSTED_ORIGINS):
        raise RuntimeError("CSRF_TRUSTED_ORIGINS deve conter apenas origens HTTPS em produção.")


# =========================================================
# Email
# =========================================================
EMAIL_BACKEND = config(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)
EMAIL_HOST = config("EMAIL_HOST", default="")
EMAIL_PORT = config("EMAIL_PORT", default=587, cast=int)
EMAIL_USE_TLS = config("EMAIL_USE_TLS", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="webmaster@localhost")


# =========================================================
# App URLs / Integrações
# =========================================================
FRONTEND_URL = config("FRONTEND_URL", default="")

GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = config("GOOGLE_CLIENT_SECRET", default="")


TELEGRAM_BOT_TOKEN = config("TELEGRAM_BOT_TOKEN", default="")
TELEGRAM_BOT_USERNAME = config("TELEGRAM_BOT_USERNAME", default="")
TELEGRAM_WEBHOOK_SECRET = config("TELEGRAM_WEBHOOK_SECRET", default="")


# =========================================================
# Logging
# =========================================================
LOG_LEVEL = config("LOG_LEVEL", default="INFO")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
}


# =========================================================
# Sentry (error monitoring)
# =========================================================
SENTRY_DSN = config("SENTRY_DSN", default="").strip()
SENTRY_ENVIRONMENT = config("SENTRY_ENVIRONMENT", default=ENV_PROFILE).strip() or ENV_PROFILE
SENTRY_TRACES_SAMPLE_RATE = config("SENTRY_TRACES_SAMPLE_RATE", default=0.0, cast=float)

if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        integrations=[DjangoIntegration()],
        send_default_pii=False,
        traces_sample_rate=SENTRY_TRACES_SAMPLE_RATE,
    )

# =========================================================
# API Documentation (OpenAPI/Swagger) - drf-spectacular
# =========================================================
SPECTACULAR_SETTINGS = {
    "TITLE": "GigFlow API",
    "DESCRIPTION": """
    API para gerenciamento de agenda de músicos e eventos.
    
    Funcionalidades principais:
    - Gestão de músicos e perfis
    - Criação e gerenciamento de eventos
    - Sistema de disponibilidades
    - Marketplace de gigs
    - Sistema de avaliações
    - Notificações
    """,
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "COMPONENT_SPLIT_PATCH": True,
    "SCHEMA_PATH_PREFIX": r"/api",
    "SCHEMA_PATH_PREFIX_TRIM": True,
    "SWAGGER_UI_SETTINGS": {
        "deepLinking": True,
        "persistAuthorization": True,
        "displayOperationId": True,
    },
    "TAGS": [
        {"name": "Auth", "description": "Autenticação e autorização"},
        {"name": "Musicians", "description": "Gerenciamento de músicos"},
        {"name": "Events", "description": "Gerenciamento de eventos"},
        {"name": "Availabilities", "description": "Disponibilidades de músicos"},
        {"name": "Connections", "description": "Conexões entre músicos"},
        {"name": "Marketplace", "description": "Marketplace de gigs"},
        {"name": "Notifications", "description": "Sistema de notificações"},
    ],
}

# drf-spectacular: evita ruído de "unable to guess serializer" em APIViews e views
# funcionais onde o schema não é crítico para deploy.
# security.W008: Nginx/Cloudflare já gerencia o redirect HTTPS
SILENCED_SYSTEM_CHECKS = [
    "drf_spectacular.W002",
    "security.W008",
]

# Register local spectacular extensions (auth, etc.)
import config.spectacular_extensions  # noqa: F401,E402
