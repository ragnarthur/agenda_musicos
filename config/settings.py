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

# Se esquecer ALLOWED_HOSTS, em DEBUG a gente salva a pele.
# Em produção, melhor explodir cedo do que ficar “misteriosamente” quebrado.
if not ALLOWED_HOSTS:
    if DEBUG:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
    else:
        raise RuntimeError("ALLOWED_HOSTS está vazio. Configure a env ALLOWED_HOSTS.")

# Inclui testserver em dev/test (evita dor em testes)
if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

CSRF_TRUSTED_ORIGINS = [
    o.strip()
    for o in config("CSRF_TRUSTED_ORIGINS", default="").split(",")
    if o.strip()
]

# Se estiver atrás de proxy (Nginx), isso ajuda o Django a entender HTTPS corretamente
# (Só vai considerar "secure" quando X-Forwarded-Proto == "https")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

# Toggle de redirecionamento HTTPS (deixe False até você ter SSL no Nginx/Cloudflare)
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=False, cast=bool)

# Cookies seguros (aplicado abaixo)
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
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # necessário com blacklist/rotation
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
# Database
# =========================================================
DATABASE_URL = config("DATABASE_URL", default="").strip()
DB_SSL_REQUIRE = config("DB_SSL_REQUIRE", default=False, cast=bool)

if DATABASE_URL:
    parsed = urlparse(DATABASE_URL)

    # Evita ValueError quando .port vem zoado
    try:
        parsed_port = parsed.port
    except ValueError:
        parsed_port = None

    # Se vier sslmode na URL, respeita. Se não vier, decide por env.
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
            "OPTIONS": {
                "sslmode": sslmode,
            },
        }
    }
else:
    # fallback (não deveria acontecer em produção)
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
# Cookies / Sessão / CSRF (produção)
# =========================================================
SESSION_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SECURE = COOKIE_SECURE

SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# Por padrão, CSRF cookie não é HttpOnly (JS pode precisar ler em apps SPA dependendo do setup)
CSRF_COOKIE_HTTPONLY = False


# =========================================================
# DRF / JWT
# =========================================================
DEFAULT_AUTH_CLASSES = [
    "rest_framework_simplejwt.authentication.JWTAuthentication",
]
if DEBUG:
    # útil pro browsable API no dev
    DEFAULT_AUTH_CLASSES.append("rest_framework.authentication.SessionAuthentication")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": tuple(DEFAULT_AUTH_CLASSES),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),

    # Quando um endpoint usa ScopedRateThrottle,
    # ele procura o rate no DEFAULT_THROTTLE_RATES.
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.ScopedRateThrottle",
    ),

    # Define rates por scope (mantém aliases pra não quebrar se mudar nomes)
    "DEFAULT_THROTTLE_RATES": {
        # token obtain (login)
        "login": config("THROTTLE_LOGIN", default="30/min"),
        "token_obtain_pair": config("THROTTLE_LOGIN", default="30/min"),  # fallback seguro

        # token refresh
        "token_refresh": config("THROTTLE_TOKEN_REFRESH", default="60/min"),
        "refresh": config("THROTTLE_TOKEN_REFRESH", default="60/min"),    # fallback seguro
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(config("JWT_ACCESS_MINUTES", default=60))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(config("JWT_REFRESH_DAYS", default=7))),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Se você preferir "não ter" browsable API em produção:
if not DEBUG:
    REST_FRAMEWORK["DEFAULT_RENDERER_CLASSES"] = (
        "rest_framework.renderers.JSONRenderer",
    )


# =========================================================
# CORS
# =========================================================
# Se estiver usando frontend chamando /api (mesma origem via Nginx), CORS quase não entra em jogo.
CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in config("CORS_ALLOWED_ORIGINS", default="").split(",")
    if o.strip()
]

# Só habilita credenciais se você realmente configurou origens.
# (evita abrir credenciais “à toa”)
if CORS_ALLOWED_ORIGINS:
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
