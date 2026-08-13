from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Habit, HabitLog, Profile
from .serializers import (
    ChangePasswordSerializer,
    HabitLogNoteSerializer,
    HabitLogSerializer,
    HabitLogToggleSerializer,
    HabitSerializer,
    HabitsSummarySerializer,
    MeSerializer,
    RegisterSerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — open to anyone, creates User + Profile."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    """GET/PATCH /api/auth/me/ — the logged-in user's account settings.
    Spans both User (email) and Profile (niche, timezone), so it's a plain
    APIView rather than a ModelSerializer bound to one model."""
    permission_classes = [permissions.IsAuthenticated]

    def _profile(self, user):
        profile, _ = Profile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        profile = self._profile(request.user)
        data = {
            'username': request.user.username,
            'email': request.user.email,
            'niche': profile.niche,
            'timezone': profile.timezone,
        }
        return Response(MeSerializer(data).data)

    def patch(self, request):
        serializer = MeSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        user = request.user
        if 'email' in validated:
            user.email = validated['email']
            user.save(update_fields=['email'])

        profile_fields = {k: validated[k] for k in ('niche', 'timezone') if k in validated}
        if profile_fields:
            profile = self._profile(user)
            for field, value in profile_fields.items():
                setattr(profile, field, value)
            profile.save(update_fields=list(profile_fields.keys()))

        return self.get(request)


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — requires the current password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Current password is incorrect.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class HabitViewSet(viewsets.ModelViewSet):
    """
    Handles the full /api/habits/ surface:
      GET/POST /api/habits/
      GET/PATCH/DELETE /api/habits/<id>/
      POST /api/habits/<id>/log/
      GET /api/habits/<id>/logs/
      GET /api/habits/summary/
    """
    serializer_class = HabitSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Scoped to the logged-in user — nobody can list/edit anyone else's habits.
        return Habit.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def log(self, request, pk=None):
        """Toggle completion for a given date (defaults to today)."""
        habit = self.get_object()
        input_serializer = HabitLogToggleSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        date = input_serializer.validated_data.get('date', timezone.localdate())

        log, created = HabitLog.objects.get_or_create(
            habit=habit, date=date, defaults={'completed': True},
        )
        if not created:
            log.completed = not log.completed
            log.save(update_fields=['completed'])

        return Response(HabitLogSerializer(log).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def note(self, request, pk=None):
        """Upsert a journal note for a given date (defaults to today) without
        touching that day's completion state."""
        habit = self.get_object()
        input_serializer = HabitLogNoteSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        date = input_serializer.validated_data.get('date', timezone.localdate())
        note = input_serializer.validated_data['note']

        log, created = HabitLog.objects.get_or_create(
            habit=habit, date=date, defaults={'completed': False, 'note': note},
        )
        if not created:
            log.note = note
            log.save(update_fields=['note'])

        return Response(HabitLogSerializer(log).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """History for the heatmap/calendar view, optionally bounded by ?start=&end=."""
        habit = self.get_object()
        queryset = habit.logs.all()

        start = request.query_params.get('start')
        end = request.query_params.get('end')
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)

        return Response(HabitLogSerializer(queryset, many=True).data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Weekly overview: per-habit streaks + completion %, and an overall %."""
        habits = self.get_queryset().filter(is_active=True)
        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())  # Monday of this week
        week_end = week_start + timedelta(days=6)

        habit_items = []
        total_due = 0
        total_done = 0

        for habit in habits:
            due_dates = [
                week_start + timedelta(days=offset)
                for offset in range(7)
                if (week_start + timedelta(days=offset)) <= today
                and habit.is_due_on(week_start + timedelta(days=offset))
            ]
            done_dates = set(
                habit.logs.filter(
                    completed=True, date__gte=week_start, date__lte=week_end,
                ).values_list('date', flat=True)
            )
            done_count = sum(1 for d in due_dates if d in done_dates)
            week_pct = round((done_count / len(due_dates)) * 100, 1) if due_dates else 0.0

            total_due += len(due_dates)
            total_done += done_count

            habit_items.append({
                'id': habit.id,
                'name': habit.name,
                'icon': habit.icon,
                'color': habit.color,
                'current_streak': habit.current_streak,
                'longest_streak': habit.longest_streak,
                'week_completion_pct': week_pct,
            })

        overall_pct = round((total_done / total_due) * 100, 1) if total_due else 0.0

        data = {
            'week_start': week_start,
            'week_end': week_end,
            'overall_completion_pct': overall_pct,
            'habits': habit_items,
        }
        return Response(HabitsSummarySerializer(data).data)
