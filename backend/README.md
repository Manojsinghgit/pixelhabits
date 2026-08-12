# PixelHabits backend

Django + Django REST Framework API for a habit tracker aimed at ADHD/focus-challenged users.

## Stack

- Django 6 + Django REST Framework
- JWT auth via `djangorestframework-simplejwt`
- PostgreSQL in production, SQLite for local dev (zero setup)
- CORS via `django-cors-headers` so the Expo app can call the API

## Local setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env               # then edit SECRET_KEY etc. if you want

python manage.py migrate
python manage.py createsuperuser   # optional, for /admin/
python manage.py runserver
```

The server runs at `http://127.0.0.1:8000/`. It uses `habittracker.settings.dev`
(SQLite, DEBUG on, CORS wide open) by default — see `manage.py`.

## Running the test script

With the dev server running in one terminal, in another:

```bash
cd backend
./test_api.sh
```

This registers a throwaway user, logs in, creates habits, toggles logs, and hits
every endpoint — printing each JSON response via `jq`. Requires `curl` and `jq`.

## API endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register/` | none | creates User + Profile |
| POST | `/api/auth/login/` | none | returns `access` + `refresh` JWTs |
| POST | `/api/auth/refresh/` | none | exchange `refresh` for a new `access` |
| GET/POST | `/api/habits/` | JWT | list / create habits |
| GET/PATCH/DELETE | `/api/habits/<id>/` | JWT | |
| POST | `/api/habits/<id>/log/` | JWT | toggle today's completion (or `{"date": "YYYY-MM-DD"}`) |
| GET | `/api/habits/<id>/logs/?start=&end=` | JWT | for calendar/heatmap views |
| GET | `/api/habits/summary/` | JWT | weekly completion % + streaks across all habits |

Send the JWT as `Authorization: Bearer <access>`.

## Settings

Environment variables (see `.env.example`):

- `SECRET_KEY` — Django secret key
- `DEBUG` — `True`/`False`
- `ALLOWED_HOSTS` — comma-separated
- `CORS_ALLOW_ALL_ORIGINS` / `CORS_ALLOWED_ORIGINS`
- `DATABASE_URL` — Postgres connection string, **production only**
- `FCM_SERVER_KEY` — optional, for push notifications later

`habittracker/settings/`:
- `base.py` — shared config
- `dev.py` — local dev (SQLite, DEBUG on) — used by default
- `prod.py` — production (Postgres via `DATABASE_URL`, HTTPS enforced) — used by
  setting `DJANGO_SETTINGS_MODULE=habittracker.settings.prod`

## Deployment

See the project-level deployment notes for deploying to Render.com's free tier.
