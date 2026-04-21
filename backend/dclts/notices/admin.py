from django.contrib import admin
from .models import Notice, NoticeEvent, NoticeReceiver, ReferenceCounter


class NoticeReceiverInline(admin.TabularInline):
    model   = NoticeReceiver
    extra   = 0
    readonly_fields = ()


class NoticeEventInline(admin.TabularInline):
    model   = NoticeEvent
    extra   = 0
    readonly_fields = ('timestamp',)


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display  = ('reference_no', 'title', 'type', 'priority', 'status',
                     'sender_org', 'get_receivers', 'created_at')
    list_filter   = ('status', 'type', 'priority')
    search_fields = ('title', 'reference_no')
    readonly_fields = ('reference_no', 'created_at', 'sent_at', 'closed_at')
    inlines = [NoticeReceiverInline, NoticeEventInline]

    def get_receivers(self, obj):
        return ", ".join([f"{r.receiver_org.name}/{r.receiver_dept.name}" for r in obj.receivers])
    get_receivers.short_description = 'Receivers'


@admin.register(NoticeReceiver)
class NoticeReceiverAdmin(admin.ModelAdmin):
    list_display = ('notice', 'receiver_org', 'receiver_dept')
    list_filter = ('receiver_org', 'receiver_dept')


@admin.register(NoticeEvent)
class NoticeEventAdmin(admin.ModelAdmin):
    list_display = ('notice', 'status', 'action_by', 'timestamp')
    readonly_fields = ('timestamp',)


@admin.register(ReferenceCounter)
class ReferenceCounterAdmin(admin.ModelAdmin):
    list_display = ('org_code', 'dept_code', 'year', 'sequence')
