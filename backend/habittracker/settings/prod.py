"""
Production settings, used on Render/Railway. Selected by setting
DJANGO_SETTINGS_MODULE=habittracker.settings.prod in the host's env vars.
"""
import dj_database_url
from decouple import config

from .base import *  # noqa: F401,F403

DEBUG = False

DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True,
    )
}

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 7
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
