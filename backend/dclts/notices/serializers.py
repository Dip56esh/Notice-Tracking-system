from rest_framework import serializers
from .models import Notice, NoticeEvent, NoticeReceiver


class NoticeEventSerializer(serializers.ModelSerializer):
    action_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = NoticeEvent
        fields = ['id', 'status', 'action_by_id', 'action_by_name', 'remarks', 'timestamp']

    def get_action_by_name(self, obj):
        return obj.action_by.name if obj.action_by else 'System'


class NoticeReceiverSerializer(serializers.ModelSerializer):
    receiver_org_name  = serializers.CharField(source='receiver_org.name', read_only=True)
    receiver_org_code  = serializers.CharField(source='receiver_org.code', read_only=True)
    receiver_dept_name = serializers.CharField(source='receiver_dept.name', read_only=True)
    receiver_dept_code = serializers.CharField(source='receiver_dept.code', read_only=True)

    class Meta:
        model = NoticeReceiver
        fields = [
            'id', 'receiver_org_id', 'receiver_org_name', 'receiver_org_code',
            'receiver_dept_id', 'receiver_dept_name', 'receiver_dept_code'
        ]


class NoticeSerializer(serializers.ModelSerializer):
    sender_org_name   = serializers.CharField(source='sender_org.name',   read_only=True)
    sender_org_code   = serializers.CharField(source='sender_org.code',   read_only=True)
    sender_dept_name  = serializers.CharField(source='sender_dept.name',  read_only=True)
    sender_dept_code  = serializers.CharField(source='sender_dept.code',  read_only=True)
    created_by_name   = serializers.CharField(source='created_by.name',   read_only=True)
    receivers         = NoticeReceiverSerializer(source='notice_receivers', many=True, read_only=True)
    events            = NoticeEventSerializer(many=True, read_only=True)

    # For backward compatibility
    receiver_org_name  = serializers.SerializerMethodField()
    receiver_org_code  = serializers.SerializerMethodField()
    receiver_dept_name = serializers.SerializerMethodField()
    receiver_dept_code = serializers.SerializerMethodField()

    class Meta:
        model  = Notice
        fields = [
            'id', 'reference_no', 'title', 'type', 'priority', 'message', 'status',
            'sender_org_id', 'sender_org_name', 'sender_org_code',
            'sender_dept_id', 'sender_dept_name', 'sender_dept_code',
            'receivers',
            'receiver_org_name', 'receiver_org_code', 'receiver_dept_name', 'receiver_dept_code',  # backward compatibility
            'created_by_id', 'created_by_name',
            'created_at', 'sent_at', 'closed_at',
            'events',
        ]

    def get_receiver_org_name(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_org.name if first_receiver else None

    def get_receiver_org_code(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_org.code if first_receiver else None

    def get_receiver_dept_name(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_dept.name if first_receiver else None

    def get_receiver_dept_code(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_dept.code if first_receiver else None


class NoticeListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views — no events."""
    sender_org_name   = serializers.CharField(source='sender_org.name',   read_only=True)
    sender_org_code   = serializers.CharField(source='sender_org.code',   read_only=True)
    sender_dept_name  = serializers.CharField(source='sender_dept.name',  read_only=True)
    sender_dept_code  = serializers.CharField(source='sender_dept.code',  read_only=True)
    created_by_name   = serializers.CharField(source='created_by.name',   read_only=True)
    receivers         = NoticeReceiverSerializer(source='notice_receivers', many=True, read_only=True)

    # For backward compatibility
    receiver_org_name  = serializers.SerializerMethodField()
    receiver_org_code  = serializers.SerializerMethodField()
    receiver_dept_name = serializers.SerializerMethodField()
    receiver_dept_code = serializers.SerializerMethodField()

    class Meta:
        model  = Notice
        fields = [
            'id', 'reference_no', 'title', 'type', 'priority', 'status',
            'sender_org_name', 'sender_org_code', 'sender_dept_name', 'sender_dept_code',
            'receivers',
            'receiver_org_name', 'receiver_org_code', 'receiver_dept_name', 'receiver_dept_code',  # backward compatibility
            'created_by_name', 'created_at',
        ]

    def get_receiver_org_name(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_org.name if first_receiver else None

    def get_receiver_org_code(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_org.code if first_receiver else None

    def get_receiver_dept_name(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_dept.name if first_receiver else None

    def get_receiver_dept_code(self, obj):
        first_receiver = obj.notice_receivers.first()
        return first_receiver.receiver_dept.code if first_receiver else None


class NoticeCreateSerializer(serializers.ModelSerializer):
    receivers = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=True,
        help_text="List of receiver objects with 'org_id' and 'dept_id' keys"
    )

    class Meta:
        model  = Notice
        fields = ['title', 'type', 'priority', 'message', 'receivers']

    def create(self, validated_data):
        receivers_data = validated_data.pop('receivers')
        notice = super().create(validated_data)

        # Create NoticeReceiver instances
        for receiver_data in receivers_data:
            NoticeReceiver.objects.create(
                notice=notice,
                receiver_org_id=receiver_data['org_id'],
                receiver_dept_id=receiver_data['dept_id']
            )

        return notice


class StatusUpdateSerializer(serializers.Serializer):
    status  = serializers.CharField()
    remarks = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_status(self, value):
        valid = [s for s, _ in Notice.STATUS_CHOICES]
        if value not in valid:
            raise serializers.ValidationError(f'Invalid status. Must be one of: {valid}')
        return value
