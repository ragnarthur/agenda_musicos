# config/settings.py
from pathlib import Path
import os
from datetime import timedelta
from urllib.parse import urlparse, parse_qs, unquote

from decouple import config as decouple_config, Config, RepositoryEnv


# =========================================================
# Base / Env Loader
# =========================================================
BASE_DIR = Path(__file__).resolve().parent.parent

ENV_PROFILE = os.getenv("DJANGO_ENV") or os.getenv("ENV") or "production"
ENV_LOCAL = BASE_DIR / ".env.local"

if ENV_PROFILE.lower() != "production" and ENV_LOCAL.exists():
    config = Config(RepositoryEnv(str(ENV_LOCAL)))
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

ALLOWED_HOSTS = env_csv("ALLOWED_HOSTS", default="")

if not ALLOWED_HOSTS:
    if DEBUG:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
    else:
        raise RuntimeError("ALLOWED_HOSTS está vazio. Configure a env ALLOWED_HOSTS.")

if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

CSRF_TRUSTED_ORIGINS = env_csv("CSRF_TRUSTED_ORIGINS", default="")

# Atrás de proxy (Nginx/Cloudflare): Django entende HTTPS via header
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Só ligue se VOCÊ quer que o Django force redirect (muitos deixam o Nginx fazer isso)
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)

# Cookie secure controlado por env (você já usa no auth_views.py)
COOKIE_SECURE = config("COOKIE_SECURE", default=(not DEBUG), cast=bool)


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

SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_HTTPONLY = False


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
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),
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

        # Eventos
        "create_event": config("THROTTLE_CREATE_EVENT", default="30/min"),
        "preview_conflicts": config("THROTTLE_PREVIEW_CONFLICTS", default="60/min"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(config("JWT_ACCESS_MINUTES", default=60))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(config("JWT_REFRESH_DAYS", default=7))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

if not DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
        "rest_framework.renderers.JSONRenderer",
    )


# =========================================================
# CORS (seu front chama /api no mesmo domínio, então é tranquilo)
# =========================================================
CORS_ALLOWED_ORIGINS = env_csv("CORS_ALLOWED_ORIGINS", default="")

# Se quiser “modo debug” via env:
# CORS_ALLOW_ALL_ORIGINS=True (NÃO use em produção real)
CORS_ALLOW_ALL_ORIGINS = config("CORS_ALLOW_ALL_ORIGINS", default=False, cast=bool)

# ✅ Se você for usar cookies cross-origin (ex: api. subdomain separado),
# precisa True + frontend fetch com credentials: "include".
CORS_ALLOW_CREDENTIALS = config("CORS_ALLOW_CREDENTIALS", default=False, cast=bool)

CORS_URLS_REGEX = r"^/api/.*$"


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

CSP_HEADER = config("CSP_HEADER", default="")


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
