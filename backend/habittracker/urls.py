from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from habits.views import (
    ChangePasswordView,
    DeviceTokenView,
    FriendRequestCreateView,
    FriendRequestRespondView,
    FriendsView,
    GamificationView,
    LeaderboardView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/me/', MeView.as_view(), name='me'),
    path('api/auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('api/auth/device-token/', DeviceTokenView.as_view(), name='device-token'),

    path('api/gamification/', GamificationView.as_view(), name='gamification'),

    path('api/friends/', FriendsView.as_view(), name='friends'),
    path('api/friends/request/', FriendRequestCreateView.as_view(), name='friend-request'),
    path('api/friends/<int:pk>/respond/', FriendRequestRespondView.as_view(), name='friend-respond'),
    path('api/friends/leaderboard/', LeaderboardView.as_view(), name='leaderboard'),

    path('api/', include('habits.urls')),
]
