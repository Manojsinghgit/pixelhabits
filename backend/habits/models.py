from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone


class Profile(models.Model):
    """Extra fields alongside Django's built-in User, one-to-one."""

    NICHE_ADHD = 'adhd'
    NICHE_ANXIETY = 'anxiety'
    NICHE_GENERAL = 'general'
    NICHE_OTHER = 'other'
    NICHE_CHOICES = [
        (NICHE_ADHD, 'ADHD'),
        (NICHE_ANXIETY, 'Anxiety / overwhelm'),
        (NICHE_GENERAL, 'General focus-challenged'),
        (NICHE_OTHER, 'Other'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    niche = models.CharField(max_length=20, choices=NICHE_CHOICES, default=NICHE_ADHD)
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text='IANA timezone name, e.g. "America/New_York"',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} profile'


class Habit(models.Model):
    FREQUENCY_DAILY = 'daily'
    FREQUENCY_CUSTOM = 'custom'
    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, 'Daily'),
        (FREQUENCY_CUSTOM, 'Custom days'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, blank=True, default='✅')  # emoji, e.g. "✅"
    color = models.CharField(max_length=7, default='#6C63FF')  # hex, e.g. "#6C63FF"
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default=FREQUENCY_DAILY)
    # Only used when frequency == "custom". List of weekday ints, 0=Monday .. 6=Sunday.
    custom_days = models.JSONField(default=list, blank=True)
    reminder_time = models.TimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.user.username})'

    def is_due_on(self, date):
        """Whether this habit is scheduled on a given date, per its frequency."""
        if self.frequency == self.FREQUENCY_DAILY:
            return True
        return date.weekday() in self.custom_days

    @property
    def current_streak(self):
        """
        Consecutive scheduled days completed, walking backward from today.
        If today is scheduled but not yet logged, that's not a break yet —
        we start counting from yesterday so the streak doesn't reset just
        because the user hasn't checked in yet this morning.
        """
        completed_dates = set(
            self.logs.filter(completed=True).values_list('date', flat=True)
        )
        if not completed_dates:
            return 0

        habit_start = self.created_at.date()
        cursor = timezone.localdate()
        if self.is_due_on(cursor) and cursor not in completed_dates:
            cursor -= timedelta(days=1)

        streak = 0
        while cursor >= habit_start:
            if self.is_due_on(cursor):
                if cursor in completed_dates:
                    streak += 1
                else:
                    break
            cursor -= timedelta(days=1)
        return streak

    @property
    def longest_streak(self):
        """Longest run of consecutive scheduled days ever completed."""
        completed_dates = sorted(
            self.logs.filter(completed=True).values_list('date', flat=True)
        )
        if not completed_dates:
            return 0

        longest = 0
        streak = 0
        prev_date = None
        for date in completed_dates:
            if prev_date is not None:
                gap_days = [
                    prev_date + timedelta(days=offset)
                    for offset in range(1, (date - prev_date).days)
                ]
                missed_a_scheduled_day = any(self.is_due_on(d) for d in gap_days)
                streak = 1 if missed_a_scheduled_day else streak + 1
            else:
                streak = 1
            longest = max(longest, streak)
            prev_date = date
        return longest


class HabitLog(models.Model):
    habit = models.ForeignKey(Habit, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    completed = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        constraints = [
            models.UniqueConstraint(fields=['habit', 'date'], name='one_log_per_habit_per_day'),
        ]

    def __str__(self):
        status = 'done' if self.completed else 'not done'
        return f'{self.habit.name} — {self.date} ({status})'
