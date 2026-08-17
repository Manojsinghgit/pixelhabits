from django.contrib import admin

from .models import DeviceToken, FriendRequest, Habit, HabitLog, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'niche', 'level', 'xp', 'coins', 'timezone', 'created_at')
    list_filter = ('niche',)


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'category', 'frequency', 'target_count', 'is_active', 'current_streak', 'longest_streak', 'created_at')
    list_filter = ('frequency', 'category', 'is_active')
    search_fields = ('name', 'user__username')


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    list_display = ('habit', 'date', 'completed', 'count', 'created_at')
    list_filter = ('completed',)
    date_hierarchy = 'date'


@admin.register(DeviceToken)
class DeviceTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'platform', 'created_at')
    list_filter = ('platform',)


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'accepted', 'created_at')
    list_filter = ('accepted',)
