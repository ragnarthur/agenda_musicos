# config/settings.py
from pathlib import Path
import os
from datetime import timedelta
from urllib.parse import urlparse, parse_qs

from decouple import config as decouple_config, Config, RepositoryEnv


# =========================================================
# Base / Env Loader
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent

# Perfil de ambiente: produção por padrão.
# Para usar .env.local: exporte DJANGO_ENV=development (ou ENV=development)
ENV_PROFILE = os.getenv("DJANGO_ENV") or os.getenv("ENV") or "production"
ENV_LOCAL = BASE_DIR / ".env.local"

if ENV_PROFILE.lower() != "production" and ENV_LOCAL.exists():
    config = Config(RepositoryEnv(str(ENV_LOCAL)))
else:
    config = decouple_config


# =========================================================
# Security
# =========================================================
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = [
    h.strip() for h in config("ALLOWED_HOSTS", default="").split(",") if h.strip()
]

# Inclui testserver em dev/test (evita dor em testes)
if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in config("CSRF_TRUSTED_ORIGINS", default="").split(",")
    if o.strip()
]

# Se estiver atrás de proxy (Nginx), isso ajuda o Django a entender HTTPS corretamente
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


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
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",

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
    # CORS precisa ficar alto (antes do CommonMiddleware)
    "corsheaders.middleware.CorsMiddleware",

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
        "DIRS": [BASE_DIR / "templates"],  # se você não usa, pode deixar vazio
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# =========================================================
# Database (FIX SSL)
# =========================================================
DATABASE_URL = config("DATABASE_URL", default="")

# 0 = disable (docker/db local), 1 = require (db gerenciado)
DB_SSL_REQUIRE = config("DB_SSL_REQUIRE", default=False, cast=bool)

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)

    if parsed.scheme not in ("postgres", "postgresql"):
        raise ValueError(f"Unsupported DB scheme in DATABASE_URL: {parsed.scheme}")

    qs = parse_qs(parsed.query or "")
    sslmode_from_url = (qs.get("sslmode") or [None])[0]
    final_sslmode = sslmode_from_url or ("require" if DB_SSL_REQUIRE else "disable")

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": (parsed.path or "").lstrip("/"),
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "",
            "PORT": str(parsed.port or 5432),
            "OPTIONS": {
                "sslmode": final_sslmode,
            },
        }
    }
else:
    # fallback (dev/test)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
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
# DRF / JWT
# =========================================================
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(config("JWT_ACCESS_MINUTES", default=60))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(config("JWT_REFRESH_DAYS", default=7))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# =========================================================
# CORS
# =========================================================
# Se estiver usando frontend chamando /api (mesma origem via Nginx), CORS quase não entra em jogo.
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in config("CORS_ALLOWED_ORIGINS", default="").split(",")
    if o.strip()
]
CORS_ALLOW_CREDENTIALS = True


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

PAYMENT_SERVICE_URL = config("PAYMENT_SERVICE_URL", default="")
PAYMENT_SERVICE_SECRET = config("PAYMENT_SERVICE_SECRET", default="")

TELEGRAM_BOT_TOKEN = config("TELEGRAM_BOT_TOKEN", default="")
TELEGRAM_BOT_USERNAME = config("TELEGRAM_BOT_USERNAME", default="")

# Se você usa CSP via middleware próprio, você já tem o header pronto no env.
CSP_HEADER = config("CSP_HEADER", default="")


# =========================================================
# Logging (pra você não ficar no escuro no deploy)
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
