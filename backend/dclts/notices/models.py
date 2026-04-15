from django.db import models
from django.db import transaction
from django.conf import settings


class ReferenceCounter(models.Model):
    org_code  = models.CharField(max_length=20)
    dept_code = models.CharField(max_length=20)
    year      = models.CharField(max_length=10)
    sequence  = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'reference_counters'
        unique_together = ('org_code', 'dept_code', 'year')

    @classmethod
    def next_reference(cls, org_code, dept_code, year):
        """Atomically increment counter and return formatted reference number."""
        with transaction.atomic():
            counter, _ = cls.objects.select_for_update().get_or_create(
                org_code=org_code.upper(),
                dept_code=dept_code.upper(),
                year=str(year),
                defaults={'sequence': 0},
            )
            counter.sequence += 1
            counter.save()
            seq = str(counter.sequence).zfill(6)
            return f"{org_code.upper()}/{dept_code.upper()}/{year}/{seq}"


class Notice(models.Model):
    STATUS_CHOICES = [
        ('DRAFT',        'Draft'),
        ('APPROVED',     'Approved'),
        ('SENT',         'Sent'),
        ('DELIVERED',    'Delivered'),
        ('RECEIVED',     'Received'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('IN_REVIEW',    'In Review'),
        ('ACTION_TAKEN', 'Action Taken'),
        ('CLOSED',       'Closed'),
        ('REJECTED',     'Rejected'),
    ]
    TYPE_CHOICES     = [('letter', 'Letter'), ('circular', 'Circular'), ('memo', 'Memo')]
    PRIORITY_CHOICES = [('high', 'High'), ('medium', 'Medium'), ('low', 'Low')]

    VALID_TRANSITIONS = {
        'DRAFT':        ['APPROVED', 'REJECTED'],
        'APPROVED':     ['SENT'],
        'SENT':         ['DELIVERED'],
        'DELIVERED':    ['RECEIVED'],
        'RECEIVED':     ['ACKNOWLEDGED'],
        'ACKNOWLEDGED': ['IN_REVIEW', 'CLOSED'],
        'IN_REVIEW':    ['ACTION_TAKEN', 'CLOSED'],
        'ACTION_TAKEN': ['CLOSED'],
    }

    reference_no     = models.CharField(max_length=60, unique=True, null=True, blank=True)
    title            = models.CharField(max_length=500)
    type             = models.CharField(max_length=20, choices=TYPE_CHOICES, default='letter')
    priority         = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    message          = models.TextField()
    sender_org       = models.ForeignKey('organizations.Organization', on_delete=models.PROTECT,
                                          related_name='sent_notices')
    sender_dept      = models.ForeignKey('organizations.Department', on_delete=models.PROTECT,
                                          related_name='sent_notices')
    receiver_org     = models.ForeignKey('organizations.Organization', on_delete=models.PROTECT,
                                          related_name='received_notices')
    receiver_dept    = models.ForeignKey('organizations.Department', on_delete=models.PROTECT,
                                          related_name='received_notices')
    created_by       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT,
                                          related_name='created_notices')
    status           = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    created_at       = models.DateTimeField(auto_now_add=True)
    sent_at          = models.DateTimeField(null=True, blank=True)
    closed_at        = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notices'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference_no or "DRAFT"} — {self.title}'

    def can_transition_to(self, new_status):
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])


class NoticeEvent(models.Model):
    notice    = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name='events')
    status    = models.CharField(max_length=20)
    action_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                   null=True, blank=True)
    remarks   = models.TextField(blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notice_events'
        ordering = ['timestamp']

    def __str__(self):
        return f'{self.notice} → {self.status}'
