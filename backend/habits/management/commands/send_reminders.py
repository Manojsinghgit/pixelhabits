import logging
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone as django_timezone

from habits.models import Habit

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Sends push reminders for habits whose reminder_time matches the
    current minute in the owning user's timezone, and that aren't done yet
    today. Meant to run every minute via an external scheduler (e.g. a
    Render cron job) — Django itself has no built-in scheduler, so this
    command does nothing unless something periodically invokes it.

    Requires FCM_SERVICE_ACCOUNT_FILE and FCM_PROJECT_ID (a Firebase
    service-account JSON path + its project id) in the environment; without
    them this is a safe no-op so dev/local setups don't need FCM configured.
    """

    help = "Sends push notifications for habit reminders due this minute."

    def handle(self, *args, **options):
        service_account_file = getattr(settings, 'FCM_SERVICE_ACCOUNT_FILE', '')
        project_id = getattr(settings, 'FCM_PROJECT_ID', '')
        if not service_account_file or not project_id:
            self.stdout.write(self.style.WARNING(
                'FCM_SERVICE_ACCOUNT_FILE / FCM_PROJECT_ID not configured — skipping (no-op).'
            ))
            return

        from pyfcm import FCMNotification
        push_service = FCMNotification(service_account_file=service_account_file, project_id=project_id)

        now_utc = django_timezone.now()
        today = django_timezone.localdate()
        sent = 0

        habits = Habit.objects.filter(
            is_active=True, reminder_time__isnull=False,
        ).select_related('user', 'user__profile')

        for habit in habits:
            profile = getattr(habit.user, 'profile', None)
            tz_name = profile.timezone if profile else 'UTC'
            try:
                local_now = now_utc.astimezone(ZoneInfo(tz_name))
            except ZoneInfoNotFoundError:
                local_now = now_utc

            if (local_now.hour, local_now.minute) != (habit.reminder_time.hour, habit.reminder_time.minute):
                continue
            if not habit.is_due_on(local_now.date()):
                continue

            log = habit.logs.filter(date=today).first()
            if log and log.completed:
                continue

            tokens = list(habit.user.device_tokens.values_list('token', flat=True))
            if not tokens:
                continue

            if habit.target_count:
                current = log.count if log else 0
                body = f'{current}/{habit.target_count} {habit.unit} so far — a bit more counts.'
            else:
                body = 'Time for your habit — a small step still counts.'

            for token in tokens:
                try:
                    push_service.notify(
                        fcm_token=token,
                        notification_title=habit.name,
                        notification_body=body,
                    )
                    sent += 1
                except Exception:
                    logger.exception('Failed to send push for habit %s', habit.id)

        self.stdout.write(self.style.SUCCESS(f'Sent {sent} reminder push(es).'))
