from rest_framework import serializers
from .models import Notice, NoticeEvent


class NoticeEventSerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source='action_by.name', read_only=True, default=None)

    class Meta:
        model  = NoticeEvent
        fields = ['id', 'status', 'action_by_id', 'action_by_name', 'remarks', 'timestamp']


class NoticeSerializer(serializers.ModelSerializer):
    sender_org_name   = serializers.CharField(source='sender_org.name',   read_only=True)
    sender_org_code   = serializers.CharField(source='sender_org.code',   read_only=True)
    sender_dept_name  = serializers.CharField(source='sender_dept.name',  read_only=True)
    sender_dept_code  = serializers.CharField(source='sender_dept.code',  read_only=True)
    receiver_org_name  = serializers.CharField(source='receiver_org.name',  read_only=True)
    receiver_org_code  = serializers.CharField(source='receiver_org.code',  read_only=True)
    receiver_dept_name = serializers.CharField(source='receiver_dept.name', read_only=True)
    receiver_dept_code = serializers.CharField(source='receiver_dept.code', read_only=True)
    created_by_name   = serializers.CharField(source='created_by.name',   read_only=True)
    events            = NoticeEventSerializer(many=True, read_only=True)

    class Meta:
        model  = Notice
        fields = [
            'id', 'reference_no', 'title', 'type', 'priority', 'message', 'status',
            'sender_org_id', 'sender_org_name', 'sender_org_code',
            'sender_dept_id', 'sender_dept_name', 'sender_dept_code',
            'receiver_org_id', 'receiver_org_name', 'receiver_org_code',
            'receiver_dept_id', 'receiver_dept_name', 'receiver_dept_code',
            'created_by_id', 'created_by_name',
            'created_at', 'sent_at', 'closed_at',
            'events',
        ]


class NoticeListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views — no events."""
    sender_org_name   = serializers.CharField(source='sender_org.name',   read_only=True)
    sender_org_code   = serializers.CharField(source='sender_org.code',   read_only=True)
    sender_dept_name  = serializers.CharField(source='sender_dept.name',  read_only=True)
    sender_dept_code  = serializers.CharField(source='sender_dept.code',  read_only=True)
    receiver_org_name  = serializers.CharField(source='receiver_org.name',  read_only=True)
    receiver_org_code  = serializers.CharField(source='receiver_org.code',  read_only=True)
    receiver_dept_name = serializers.CharField(source='receiver_dept.name', read_only=True)
    receiver_dept_code = serializers.CharField(source='receiver_dept.code', read_only=True)
    created_by_name   = serializers.CharField(source='created_by.name',   read_only=True)

    class Meta:
        model  = Notice
        fields = [
            'id', 'reference_no', 'title', 'type', 'priority', 'status',
            'sender_org_id', 'sender_org_name', 'sender_org_code',
            'sender_dept_id', 'sender_dept_name', 'sender_dept_code',
            'receiver_org_id', 'receiver_org_name', 'receiver_org_code',
            'receiver_dept_id', 'receiver_dept_name', 'receiver_dept_code',
            'created_by_id', 'created_by_name',
            'created_at', 'sent_at', 'closed_at',
        ]


class NoticeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notice
        fields = ['title', 'type', 'priority', 'message',
                  'receiver_org', 'receiver_dept']


class StatusUpdateSerializer(serializers.Serializer):
    status  = serializers.CharField()
    remarks = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_status(self, value):
        valid = [s for s, _ in Notice.STATUS_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f'Invalid status. Must be one of: {valid}')
        return value
