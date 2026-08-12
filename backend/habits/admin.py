from django.contrib import admin

from .models import Habit, HabitLog, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'niche', 'timezone', 'created_at')
    list_filter = ('niche',)


@admin.register(Habit)
class HabitAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'frequency', 'is_active', 'current_streak', 'longest_streak', 'created_at')
    list_filter = ('frequency', 'is_active')
    search_fields = ('name', 'user__username')


@admin.register(HabitLog)
class HabitLogAdmin(admin.ModelAdmin):
    list_display = ('habit', 'date', 'completed', 'created_at')
    list_filter = ('completed',)
    date_hierarchy = 'date'
