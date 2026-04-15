from django.contrib import admin
from .models import Notice, NoticeEvent, ReferenceCounter


class NoticeEventInline(admin.TabularInline):
    model   = NoticeEvent
    extra   = 0
    readonly_fields = ('timestamp',)


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display  = ('reference_no', 'title', 'type', 'priority', 'status',
                     'sender_org', 'receiver_org', 'created_at')
    list_filter   = ('status', 'type', 'priority')
    search_fields = ('title', 'reference_no')
    readonly_fields = ('reference_no', 'created_at', 'sent_at', 'closed_at')
    inlines = [NoticeEventInline]


@admin.register(NoticeEvent)
class NoticeEventAdmin(admin.ModelAdmin):
    list_display = ('notice', 'status', 'action_by', 'timestamp')
    readonly_fields = ('timestamp',)


@admin.register(ReferenceCounter)
class ReferenceCounterAdmin(admin.ModelAdmin):
    list_display = ('org_code', 'dept_code', 'year', 'sequence')
