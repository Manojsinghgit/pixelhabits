import re

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import Habit, HabitLog, Profile

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

    class Meta:
        model = Habit
        fields = [
            'id', 'name', 'icon', 'color', 'frequency', 'custom_days',
            'reminder_time', 'is_active', 'created_at',
            'current_streak', 'longest_streak', 'completed_today',
        ]
        read_only_fields = ['id', 'created_at']

    def get_completed_today(self, obj):
        return obj.logs.filter(date=timezone.localdate(), completed=True).exists()

    def validate_color(self, value):
        if not HEX_COLOR_RE.match(value):
            raise serializers.ValidationError('Color must be a hex code like "#6C63FF".')
        return value

    def validate_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Name cannot be blank.')
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
        fields = ['id', 'date', 'completed', 'created_at']
        read_only_fields = ['id', 'created_at']


class HabitLogToggleSerializer(serializers.Serializer):
    """Input for POST /habits/<id>/log/ — defaults to toggling today."""
    date = serializers.DateField(required=False)


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
