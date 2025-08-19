# core/settings.py

import os
from pathlib import Path
import dj_database_url

# ------------------------------------------------------------------------------
# Paths
# ------------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ------------------------------------------------------------------------------
# Core config
# ------------------------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-key")
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

def _split_env_list(value: str, separators=","):
    # Split on commas by default; also accept spaces
    if not value:
        return []
    parts = []
    for chunk in value.replace(" ", separators).split(separators):
        chunk = chunk.strip()
        if chunk:
            parts.append(chunk)
    return parts

# Hosts
if DEBUG:
    ALLOWED_HOSTS = []
else:
    ALLOWED_HOSTS = _split_env_list(os.environ.get("ALLOWED_HOSTS", ""))
    if not ALLOWED_HOSTS:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1"]


render_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if render_hostname and render_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_hostname)

# ------------------------------------------------------------------------------
# Applications
# ------------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",

    # My Apps
    "api",
]

# ------------------------------------------------------------------------------
# Middleware
# ------------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ------------------------------------------------------------------------------
# URLs / WSGI
# ------------------------------------------------------------------------------
ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"

# ------------------------------------------------------------------------------
# Templates
# ------------------------------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
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

# ------------------------------------------------------------------------------
# Database
# ------------------------------------------------------------------------------
# Postgres on Render via DATABASE_URL; fallback to SQLite locally
if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.parse(
            os.environ["DATABASE_URL"],
            conn_max_age=600,            # persistent connections
            ssl_require=True,            # Render Postgres uses SSL
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ------------------------------------------------------------------------------
# Static files (WhiteNoise)
# ------------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Use hashed filenames + gzip/br in production
if not DEBUG:
    STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ------------------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = _split_env_list(os.environ.get("FRONTEND_ORIGINS", "http://localhost:3000"))

# ------------------------------------------------------------------------------
# Security
# ------------------------------------------------------------------------------
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 days
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    # Build CSRF_TRUSTED_ORIGINS from allowed hosts (https) + any explicit origins
    _csrf_hosts = [h for h in ALLOWED_HOSTS if "." in h]
    CSRF_TRUSTED_ORIGINS = []
    for host in _csrf_hosts:
        if host.startswith("http://") or host.startswith("https://"):
            # If user put a full origin into ALLOWED_HOSTS (uncommon), keep it
            CSRF_TRUSTED_ORIGINS.append(host)
        else:
            CSRF_TRUSTED_ORIGINS.append(f"https://{host}")

    # Also merge FRONTEND_ORIGINS (which are full origins)
    CSRF_TRUSTED_ORIGINS += [
        o for o in _split_env_list(os.environ.get("FRONTEND_ORIGINS", ""))
        if o not in CSRF_TRUSTED_ORIGINS
    ]

# ------------------------------------------------------------------------------
# Internationalization
# ------------------------------------------------------------------------------
LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Europe/London"
USE_I18N = True
USE_TZ = True

# ------------------------------------------------------------------------------
# Django REST Framework
# ------------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ) if not DEBUG else (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
}

# ------------------------------------------------------------------------------
# Misc
# ------------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Fail loudly if SECRET_KEY is missing in production
if not DEBUG and SECRET_KEY == "dev-insecure-key":
    raise RuntimeError("SECRET_KEY must be set via environment in production.")
