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
    # Gamification: earned by completing habits (see HabitViewSet.log). Level
    # is derived from xp rather than stored, so the curve can change later
    # without a data migration.
    xp = models.PositiveIntegerField(default=0)
    coins = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} profile'

    @staticmethod
    def xp_threshold(level):
        """Total XP required to reach `level` (level 1 needs 0)."""
        return 50 * (level - 1) * level

    @property
    def level(self):
        level = 1
        while self.xp_threshold(level + 1) <= self.xp:
            level += 1
        return level

    @property
    def xp_into_level(self):
        return self.xp - self.xp_threshold(self.level)

    @property
    def xp_for_next_level(self):
        return self.xp_threshold(self.level + 1) - self.xp_threshold(self.level)


class Habit(models.Model):
    FREQUENCY_DAILY = 'daily'
    FREQUENCY_CUSTOM = 'custom'
    FREQUENCY_CHOICES = [
        (FREQUENCY_DAILY, 'Daily'),
        (FREQUENCY_CUSTOM, 'Custom days'),
    ]

    CATEGORY_HEALTH = 'health'
    CATEGORY_MIND = 'mind'
    CATEGORY_WORK = 'work'
    CATEGORY_LEARNING = 'learning'
    CATEGORY_OTHER = 'other'
    CATEGORY_CHOICES = [
        (CATEGORY_HEALTH, 'Health'),
        (CATEGORY_MIND, 'Mind'),
        (CATEGORY_WORK, 'Work'),
        (CATEGORY_LEARNING, 'Learning'),
        (CATEGORY_OTHER, 'Other'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='habits')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, blank=True, default='✅')  # emoji, e.g. "✅"
    color = models.CharField(max_length=7, default='#6C63FF')  # hex, e.g. "#6C63FF"
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER)
    frequency = models.CharField(max_length=10, choices=FREQUENCY_CHOICES, default=FREQUENCY_DAILY)
    # Only used when frequency == "custom". List of weekday ints, 0=Monday .. 6=Sunday.
    custom_days = models.JSONField(default=list, blank=True)
    # When set, this is a "quantity" habit tracked by count (e.g. "8 glasses")
    # instead of a plain done/not-done checkbox.
    target_count = models.PositiveIntegerField(null=True, blank=True)
    unit = models.CharField(max_length=20, blank=True, default='')
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
    # Only meaningful for quantity habits (habit.target_count is set) — how
    # much of the day's target has been logged so far.
    count = models.PositiveIntegerField(default=0)
    note = models.TextField(blank=True, default='')
    # Guards against farming XP by repeatedly un-checking/re-checking the
    # same day — XP for a given (habit, date) is granted at most once.
    xp_awarded = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        constraints = [
            models.UniqueConstraint(fields=['habit', 'date'], name='one_log_per_habit_per_day'),
        ]

    def __str__(self):
        status = 'done' if self.completed else 'not done'
        return f'{self.habit.name} — {self.date} ({status})'


class DeviceToken(models.Model):
    """A push token registered by the mobile app, used by the
    `send_reminders` management command to deliver reminders even when the
    app isn't open (unlike the client-side local notifications)."""

    PLATFORM_IOS = 'ios'
    PLATFORM_ANDROID = 'android'
    PLATFORM_WEB = 'web'
    PLATFORM_CHOICES = [
        (PLATFORM_IOS, 'iOS'),
        (PLATFORM_ANDROID, 'Android'),
        (PLATFORM_WEB, 'Web'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='device_tokens')
    token = models.CharField(max_length=255, unique=True)
    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES, default=PLATFORM_ANDROID)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.user.username} — {self.platform} token'


class FriendRequest(models.Model):
    """A directed connection: from_user -> to_user. `accepted` flips to True
    once to_user accepts; an unaccepted row is a pending request. Friendship
    itself is symmetric (see helpers on the manager) even though the row is
    directional, so we know who to notify/blame for a stale request."""

    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friend_requests')
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['from_user', 'to_user'], name='one_request_per_direction'),
        ]

    def __str__(self):
        state = 'friends' if self.accepted else 'pending'
        return f'{self.from_user.username} -> {self.to_user.username} ({state})'
