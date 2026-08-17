import calendar as calendar_module
from datetime import date as date_cls, timedelta

from django.contrib.auth.models import User
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeviceToken, FriendRequest, Habit, HabitLog, Profile
from .serializers import (
    CalendarDaySerializer,
    ChangePasswordSerializer,
    DeviceTokenSerializer,
    FriendRequestInputSerializer,
    FriendRequestSerializer,
    FriendsSerializer,
    GamificationSerializer,
    HabitLogNoteSerializer,
    HabitLogSerializer,
    HabitLogToggleSerializer,
    HabitSerializer,
    HabitsSummarySerializer,
    InsightsSerializer,
    LeaderboardEntrySerializer,
    MeSerializer,
    RegisterSerializer,
)

MILESTONE_STREAKS = (3, 7, 14, 30, 100)
WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


def _award_xp(user, xp, coins):
    profile, _ = Profile.objects.get_or_create(user=user)
    profile.xp += xp
    profile.coins += coins
    profile.save(update_fields=['xp', 'coins'])


def _compute_achievements(user):
    habits_qs = Habit.objects.filter(user=user)
    total_habits = habits_qs.count()
    active_habits = list(habits_qs.filter(is_active=True))
    completed_logs = HabitLog.objects.filter(habit__user=user, completed=True)
    total_completions = completed_logs.count()
    max_streak = max((h.longest_streak for h in active_habits), default=0)
    quantity_master = completed_logs.filter(habit__target_count__isnull=False).exists()
    early_bird = completed_logs.filter(created_at__hour__lt=8).exists()

    perfect_day = False
    recent_dates = completed_logs.values_list('date', flat=True).distinct().order_by('-date')[:90]
    for d in recent_dates:
        due_habits = [h for h in active_habits if h.is_due_on(d) and h.created_at.date() <= d]
        if not due_habits:
            continue
        done_count = completed_logs.filter(date=d, habit__in=due_habits).values('habit').distinct().count()
        if done_count == len(due_habits):
            perfect_day = True
            break

    return [
        {
            'id': 'first_step', 'label': 'First step', 'icon': 'footsteps',
            'description': 'Complete any habit once.',
            'earned': total_completions >= 1, 'progress': min(total_completions, 1), 'target': 1,
        },
        {
            'id': 'consistent', 'label': 'Consistent', 'icon': 'flame',
            'description': 'Reach a 7-day streak on any habit.',
            'earned': max_streak >= 7, 'progress': min(max_streak, 7), 'target': 7,
        },
        {
            'id': 'century_club', 'label': 'Century club', 'icon': 'trophy',
            'description': 'Log 100 completions in total.',
            'earned': total_completions >= 100, 'progress': min(total_completions, 100), 'target': 100,
        },
        {
            'id': 'collector', 'label': 'Habit collector', 'icon': 'albums',
            'description': 'Create 5 habits.',
            'earned': total_habits >= 5, 'progress': min(total_habits, 5), 'target': 5,
        },
        {
            'id': 'perfect_day', 'label': 'Perfect day', 'icon': 'star',
            'description': 'Complete every due habit in a single day.',
            'earned': perfect_day, 'progress': int(perfect_day), 'target': 1,
        },
        {
            'id': 'quantity_master', 'label': 'Quantity master', 'icon': 'stats-chart',
            'description': 'Hit the target on a quantity habit.',
            'earned': quantity_master, 'progress': int(quantity_master), 'target': 1,
        },
        {
            'id': 'early_bird', 'label': 'Early bird', 'icon': 'sunny',
            'description': 'Log a habit before 8am.',
            'earned': early_bird, 'progress': int(early_bird), 'target': 1,
        },
    ]


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
        queryset = Habit.objects.filter(user=self.request.user)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def log(self, request, pk=None):
        """Toggle completion for a given date (defaults to today).
        Quantity habits (habit.target_count set) instead adjust the day's
        count by `delta`, completing once the count reaches the target.

        Completing a day for the first time awards XP/coins (see
        _award_xp) — guarded by log.xp_awarded so repeatedly toggling the
        same day on/off can't be farmed for infinite rewards."""
        habit = self.get_object()
        input_serializer = HabitLogToggleSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        date = input_serializer.validated_data.get('date', timezone.localdate())

        if habit.target_count:
            delta = input_serializer.validated_data.get('delta', 1)
            log, _created = HabitLog.objects.get_or_create(
                habit=habit, date=date, defaults={'completed': False, 'count': 0},
            )
            log.count = max(0, log.count + delta)
            log.completed = log.count >= habit.target_count
            update_fields = ['count', 'completed']
        else:
            log, created = HabitLog.objects.get_or_create(
                habit=habit, date=date, defaults={'completed': True},
            )
            if not created:
                log.completed = not log.completed
            update_fields = ['completed']

        newly_completed = log.completed and not log.xp_awarded
        if newly_completed:
            log.xp_awarded = True
            update_fields.append('xp_awarded')

        log.save(update_fields=update_fields)

        if newly_completed:
            streak = habit.current_streak
            xp, coins = 10, 5
            if streak in MILESTONE_STREAKS:
                xp, coins = xp + 20, coins + 15
            _award_xp(request.user, xp, coins)

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

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """All-habits-combined month view: for each day, how many of that
        day's due habits were completed. ?month=YYYY-MM, defaults to the
        current month."""
        month_param = request.query_params.get('month')
        today = timezone.localdate()
        if month_param:
            try:
                year, month = (int(part) for part in month_param.split('-'))
            except (ValueError, TypeError):
                return Response({'month': ['Must look like "YYYY-MM".']}, status=status.HTTP_400_BAD_REQUEST)
        else:
            year, month = today.year, today.month

        days_in_month = calendar_module.monthrange(year, month)[1]
        month_start = date_cls(year, month, 1)
        month_end = date_cls(year, month, days_in_month)

        habits = list(self.get_queryset().filter(is_active=True))
        logs_by_habit = {
            habit.id: {
                log.date: log
                for log in habit.logs.filter(date__gte=month_start, date__lte=month_end)
            }
            for habit in habits
        }

        days = []
        for offset in range(days_in_month):
            day = month_start + timedelta(days=offset)
            if day > today:
                break

            day_habits = []
            due = 0
            done = 0
            for habit in habits:
                if not habit.is_due_on(day) or habit.created_at.date() > day:
                    continue
                due += 1
                log = logs_by_habit[habit.id].get(day)
                completed = bool(log and log.completed)
                if completed:
                    done += 1
                day_habits.append({
                    'id': habit.id,
                    'name': habit.name,
                    'icon': habit.icon,
                    'color': habit.color,
                    'completed': completed,
                })

            days.append({
                'date': day,
                'due': due,
                'done': done,
                'completion_pct': round((done / due) * 100, 1) if due else 0.0,
                'habits': day_habits,
            })

        return Response(CalendarDaySerializer(days, many=True).data)

    @action(detail=False, methods=['get'])
    def insights(self, request):
        """Statistical patterns over the last 30 days: best weekday, week-
        over-week trend, most/least consistent habit, and pairs of habits
        that tend to get completed together. Plain aggregation over logged
        data — no external/AI calls."""
        habits = list(self.get_queryset().filter(is_active=True))
        today = timezone.localdate()
        window_start = today - timedelta(days=29)

        empty = {
            'best_weekday': None, 'best_weekday_pct': 0.0, 'trend_pct': 0.0,
            'most_consistent': None, 'least_consistent': None, 'pairs': [],
        }
        if not habits:
            return Response(InsightsSerializer(empty).data)

        logs_by_habit = {
            h.id: {l.date: l.completed for l in h.logs.filter(date__gte=window_start, date__lte=today)}
            for h in habits
        }

        def is_due(h, d):
            return h.is_due_on(d) and h.created_at.date() <= d

        def completion_pct(start, end):
            due = done = 0
            cursor = start
            while cursor <= end and cursor <= today:
                for h in habits:
                    if is_due(h, cursor):
                        due += 1
                        if logs_by_habit[h.id].get(cursor):
                            done += 1
                cursor += timedelta(days=1)
            return (done / due * 100) if due else None

        weekday_due = [0] * 7
        weekday_done = [0] * 7
        cursor = window_start
        while cursor <= today:
            wd = cursor.weekday()
            for h in habits:
                if is_due(h, cursor):
                    weekday_due[wd] += 1
                    if logs_by_habit[h.id].get(cursor):
                        weekday_done[wd] += 1
            cursor += timedelta(days=1)
        weekday_pcts = [(done / due * 100) if due else 0.0 for done, due in zip(weekday_done, weekday_due)]
        best_idx = max(range(7), key=lambda i: weekday_pcts[i]) if any(weekday_due) else None
        best_weekday = WEEKDAY_NAMES[best_idx] if best_idx is not None and weekday_due[best_idx] > 0 else None
        best_weekday_pct = round(weekday_pcts[best_idx], 1) if best_idx is not None else 0.0

        this_week_start = today - timedelta(days=today.weekday())
        last_week_start = this_week_start - timedelta(days=7)
        last_week_end = this_week_start - timedelta(days=1)
        this_pct = completion_pct(this_week_start, today)
        last_pct = completion_pct(last_week_start, last_week_end)
        trend_pct = round(this_pct - last_pct, 1) if (this_pct is not None and last_pct is not None) else 0.0

        habit_pcts = []
        for h in habits:
            due = done = 0
            cursor = window_start
            while cursor <= today:
                if is_due(h, cursor):
                    due += 1
                    if logs_by_habit[h.id].get(cursor):
                        done += 1
                cursor += timedelta(days=1)
            if due >= 3:
                habit_pcts.append({'id': h.id, 'name': h.name, 'color': h.color, 'pct': round(done / due * 100, 1)})
        most_consistent = max(habit_pcts, key=lambda x: x['pct']) if habit_pcts else None
        least_consistent = min(habit_pcts, key=lambda x: x['pct']) if len(habit_pcts) >= 2 else None

        pairs = []
        for a in habits:
            for b in habits:
                if a.id >= b.id:
                    continue
                common_dates = []
                cursor = window_start
                while cursor <= today:
                    if is_due(a, cursor) and is_due(b, cursor):
                        common_dates.append(cursor)
                    cursor += timedelta(days=1)
                if len(common_dates) < 5:
                    continue
                a_done_dates = [d for d in common_dates if logs_by_habit[a.id].get(d)]
                if len(a_done_dates) < 3:
                    continue
                b_base_rate = sum(1 for d in common_dates if logs_by_habit[b.id].get(d)) / len(common_dates)
                if b_base_rate <= 0:
                    continue
                b_given_a_rate = sum(1 for d in a_done_dates if logs_by_habit[b.id].get(d)) / len(a_done_dates)
                lift_pct = round((b_given_a_rate / b_base_rate - 1) * 100, 1)
                if lift_pct >= 20:
                    pairs.append({'habit_a': a.name, 'habit_b': b.name, 'lift_pct': lift_pct})
        pairs.sort(key=lambda p: -p['lift_pct'])

        data = {
            'best_weekday': best_weekday,
            'best_weekday_pct': best_weekday_pct,
            'trend_pct': trend_pct,
            'most_consistent': most_consistent,
            'least_consistent': least_consistent,
            'pairs': pairs[:3],
        }
        return Response(InsightsSerializer(data).data)


class GamificationView(APIView):
    """GET /api/gamification/ — XP, level, coins, and account-wide
    achievements (computed on the fly from existing habit/log data, not
    stored, so new achievement rules don't need a backfill)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        data = {
            'xp': profile.xp,
            'level': profile.level,
            'xp_into_level': profile.xp_into_level,
            'xp_for_next_level': profile.xp_for_next_level,
            'coins': profile.coins,
            'achievements': _compute_achievements(request.user),
        }
        return Response(GamificationSerializer(data).data)


class FriendsView(APIView):
    """GET /api/friends/ — accepted friends + pending requests (incoming
    and outgoing) in one call, since the Friends screen needs both."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        accepted = FriendRequest.objects.filter(
            Q(from_user=user, accepted=True) | Q(to_user=user, accepted=True)
        )
        friends_data = sorted(
            (
                {'id': fr.id, 'username': (fr.to_user if fr.from_user_id == user.id else fr.from_user).username}
                for fr in accepted
            ),
            key=lambda f: f['username'],
        )

        pending = FriendRequest.objects.filter(Q(from_user=user) | Q(to_user=user), accepted=False)
        requests_data = []
        for fr in pending:
            outgoing = fr.from_user_id == user.id
            other = fr.to_user if outgoing else fr.from_user
            requests_data.append({
                'id': fr.id,
                'username': other.username,
                'direction': 'outgoing' if outgoing else 'incoming',
                'created_at': fr.created_at,
            })

        data = {
            'friends': friends_data,
            'requests': requests_data,
        }
        return Response(FriendsSerializer(data).data)


class FriendRequestCreateView(APIView):
    """POST /api/friends/request/ {username} — send a friend request. If
    that user already sent us one, this accepts it instead of duplicating."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = FriendRequestInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data['username'].strip()

        if username == request.user.username:
            return Response({'username': ["You can't add yourself."]}, status=status.HTTP_400_BAD_REQUEST)

        try:
            to_user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'username': ['No user with that username.']}, status=status.HTTP_404_NOT_FOUND)

        reverse = FriendRequest.objects.filter(from_user=to_user, to_user=request.user).first()
        if reverse:
            reverse.accepted = True
            reverse.save(update_fields=['accepted'])
            return Response(status=status.HTTP_204_NO_CONTENT)

        _, created = FriendRequest.objects.get_or_create(from_user=request.user, to_user=to_user)
        if not created:
            return Response({'username': ['Request already sent.']}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_201_CREATED)


class FriendRequestRespondView(APIView):
    """POST /api/friends/<id>/respond/ — accept an incoming request.
    DELETE — decline/cancel a pending request, or remove an existing
    friendship (works either direction)."""
    permission_classes = [permissions.IsAuthenticated]

    def _get(self, request, pk):
        return FriendRequest.objects.filter(
            Q(pk=pk) & (Q(from_user=request.user) | Q(to_user=request.user))
        ).first()

    def post(self, request, pk):
        fr = self._get(request, pk)
        if not fr or fr.to_user_id != request.user.id:
            return Response(status=status.HTTP_404_NOT_FOUND)
        fr.accepted = True
        fr.save(update_fields=['accepted'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk):
        fr = self._get(request, pk)
        if not fr:
            return Response(status=status.HTTP_404_NOT_FOUND)
        fr.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LeaderboardView(APIView):
    """GET /api/friends/leaderboard/ — self + accepted friends, ranked by
    this week's completion % then best current streak."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        accepted = FriendRequest.objects.filter(
            Q(from_user=user, accepted=True) | Q(to_user=user, accepted=True)
        )
        friend_users = {fr.to_user if fr.from_user_id == user.id else fr.from_user for fr in accepted}
        friend_users.add(user)

        today = timezone.localdate()
        week_start = today - timedelta(days=today.weekday())

        entries = []
        for u in friend_users:
            profile, _ = Profile.objects.get_or_create(user=u)
            due = done = 0
            best_streak = 0
            for h in Habit.objects.filter(user=u, is_active=True):
                best_streak = max(best_streak, h.current_streak)
                cursor = week_start
                while cursor <= today:
                    if h.is_due_on(cursor) and h.created_at.date() <= cursor:
                        due += 1
                        if h.logs.filter(date=cursor, completed=True).exists():
                            done += 1
                    cursor += timedelta(days=1)
            entries.append({
                'username': u.username,
                'is_you': u.id == user.id,
                'level': profile.level,
                'week_completion_pct': round((done / due) * 100, 1) if due else 0.0,
                'best_current_streak': best_streak,
            })

        entries.sort(key=lambda e: (-e['week_completion_pct'], -e['best_current_streak']))
        return Response(LeaderboardEntrySerializer(entries, many=True).data)


class DeviceTokenView(APIView):
    """POST /api/auth/device-token/ — register this device for server-side
    push reminders (see the `send_reminders` management command).
    DELETE unregisters it (e.g. on logout)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = DeviceTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        DeviceToken.objects.update_or_create(
            token=serializer.validated_data['token'],
            defaults={'user': request.user, 'platform': serializer.validated_data['platform']},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request):
        token = request.data.get('token')
        if token:
            DeviceToken.objects.filter(token=token, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
