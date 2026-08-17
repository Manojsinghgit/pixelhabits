import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import DeviceToken, FriendRequest, Habit, HabitLog, Profile

HEX_COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['niche', 'timezone', 'created_at']
        read_only_fields = ['created_at']


class RegisterSerializer(serializers.ModelSerializer):
    """Creates a User + its Profile together in one call."""

    password = serializers.CharField(write_only=True, validators=[validate_password])
    niche = serializers.ChoiceField(choices=Profile.NICHE_CHOICES, required=False, default=Profile.NICHE_ADHD)
    timezone = serializers.CharField(required=False, default='UTC')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'niche', 'timezone']

    def create(self, validated_data):
        niche = validated_data.pop('niche', Profile.NICHE_ADHD)
        tz = validated_data.pop('timezone', 'UTC')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )
        Profile.objects.create(user=user, niche=niche, timezone=tz)
        return user


class HabitSerializer(serializers.ModelSerializer):
    current_streak = serializers.IntegerField(read_only=True)
    longest_streak = serializers.IntegerField(read_only=True)
    completed_today = serializers.SerializerMethodField()
    today_count = serializers.SerializerMethodField()

    class Meta:
        model = Habit
        fields = [
            'id', 'name', 'icon', 'color', 'category', 'frequency', 'custom_days',
            'target_count', 'unit', 'reminder_time', 'is_active', 'created_at',
            'current_streak', 'longest_streak', 'completed_today', 'today_count',
        ]
        read_only_fields = ['id', 'created_at']

    def get_completed_today(self, obj):
        return obj.logs.filter(date=timezone.localdate(), completed=True).exists()

    def get_today_count(self, obj):
        log = obj.logs.filter(date=timezone.localdate()).first()
        return log.count if log else 0

    def validate_color(self, value):
        if not HEX_COLOR_RE.match(value):
            raise serializers.ValidationError('Color must be a hex code like "#6C63FF".')
        return value

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Name cannot be blank.')
        return value

    def validate_target_count(self, value):
        if value is not None and value < 1:
            raise serializers.ValidationError('Target count must be at least 1.')
        return value

    def validate(self, attrs):
        frequency = attrs.get('frequency', getattr(self.instance, 'frequency', Habit.FREQUENCY_DAILY))
        custom_days = attrs.get('custom_days', getattr(self.instance, 'custom_days', []))

        if frequency == Habit.FREQUENCY_CUSTOM:
            if not custom_days:
                raise serializers.ValidationError({
                    'custom_days': 'Provide at least one day (0=Monday..6=Sunday) when frequency is "custom".',
                })
            if not all(isinstance(day, int) and 0 <= day <= 6 for day in custom_days):
                raise serializers.ValidationError({
                    'custom_days': 'Days must be integers between 0 (Monday) and 6 (Sunday).',
                })
        return attrs


class HabitLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = HabitLog
        fields = ['id', 'date', 'completed', 'count', 'note', 'created_at']
        read_only_fields = ['id', 'created_at']


class HabitLogToggleSerializer(serializers.Serializer):
    """Input for POST /habits/<id>/log/ — defaults to toggling today.
    For quantity habits (habit.target_count is set), `delta` increments or
    decrements the day's count instead (e.g. delta=-1 to undo a tap)."""
    date = serializers.DateField(required=False)
    delta = serializers.IntegerField(required=False, default=1)


class HabitLogNoteSerializer(serializers.Serializer):
    """Input for POST /habits/<id>/note/ — upserts a day's journal note
    without touching its completion state."""
    date = serializers.DateField(required=False)
    note = serializers.CharField(allow_blank=True, trim_whitespace=False)


class HabitSummaryItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    icon = serializers.CharField()
    color = serializers.CharField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    week_completion_pct = serializers.FloatField()


class HabitsSummarySerializer(serializers.Serializer):
    week_start = serializers.DateField()
    week_end = serializers.DateField()
    overall_completion_pct = serializers.FloatField()
    habits = HabitSummaryItemSerializer(many=True)


class CalendarDayHabitSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    icon = serializers.CharField()
    color = serializers.CharField()
    completed = serializers.BooleanField()


class CalendarDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    due = serializers.IntegerField()
    done = serializers.IntegerField()
    completion_pct = serializers.FloatField()
    habits = CalendarDayHabitSerializer(many=True)


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ['token', 'platform']


class MeSerializer(serializers.Serializer):
    """Combined User + Profile view for GET/PATCH /api/auth/me/."""
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    niche = serializers.ChoiceField(choices=Profile.NICHE_CHOICES, required=False)
    timezone = serializers.CharField(required=False)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class AchievementSerializer(serializers.Serializer):
    id = serializers.CharField()
    label = serializers.CharField()
    description = serializers.CharField()
    icon = serializers.CharField()
    earned = serializers.BooleanField()
    progress = serializers.IntegerField()
    target = serializers.IntegerField()


class GamificationSerializer(serializers.Serializer):
    xp = serializers.IntegerField()
    level = serializers.IntegerField()
    xp_into_level = serializers.IntegerField()
    xp_for_next_level = serializers.IntegerField()
    coins = serializers.IntegerField()
    achievements = AchievementSerializer(many=True)


class InsightHabitRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    pct = serializers.FloatField()


class InsightPairSerializer(serializers.Serializer):
    habit_a = serializers.CharField()
    habit_b = serializers.CharField()
    lift_pct = serializers.FloatField()


class InsightsSerializer(serializers.Serializer):
    best_weekday = serializers.CharField(allow_null=True)
    best_weekday_pct = serializers.FloatField()
    trend_pct = serializers.FloatField()
    most_consistent = InsightHabitRefSerializer(allow_null=True)
    least_consistent = InsightHabitRefSerializer(allow_null=True)
    pairs = InsightPairSerializer(many=True)


class FriendUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()


class FriendRequestSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    direction = serializers.ChoiceField(choices=['incoming', 'outgoing'])
    created_at = serializers.DateTimeField()


class FriendsSerializer(serializers.Serializer):
    friends = FriendUserSerializer(many=True)
    requests = FriendRequestSerializer(many=True)


class FriendRequestInputSerializer(serializers.Serializer):
    username = serializers.CharField()


class LeaderboardEntrySerializer(serializers.Serializer):
    username = serializers.CharField()
    is_you = serializers.BooleanField()
    level = serializers.IntegerField()
    week_completion_pct = serializers.FloatField()
    best_current_streak = serializers.IntegerField()
