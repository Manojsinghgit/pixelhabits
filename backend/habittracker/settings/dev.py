"""
Local development settings. Activated by default (see manage.py / wsgi.py).
Uses SQLite so there's zero setup — no Postgres install needed to start hacking.
"""
from .base import *  # noqa: F401,F403

DEBUG = True

if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']
ALLOWED_HOSTS = [*ALLOWED_HOSTS, 'testserver']  # Django's test client uses this host

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Wide open in dev so the Expo app (web preview) can hit the API from any origin.
CORS_ALLOW_ALL_ORIGINS = True
