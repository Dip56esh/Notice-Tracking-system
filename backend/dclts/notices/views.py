from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from dclts.organizations.models import Organization, Department
from .models import Notice, NoticeEvent, ReferenceCounter
from .serializers import (
    NoticeSerializer, NoticeListSerializer,
    NoticeCreateSerializer, StatusUpdateSerializer,
)


class NoticePagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'limit'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'notices': data,
            'total':   self.page.paginator.count,
            'page':    self.page.number,
            'pages':   self.page.paginator.num_pages,
        })


class NoticeListCreateView(generics.ListCreateAPIView):
    pagination_class = NoticePagination

    def get_serializer_class(self):
        return NoticeCreateSerializer if self.request.method == 'POST' else NoticeListSerializer

    def get_queryset(self):
        qs = Notice.objects.select_related(
            'sender_org', 'sender_dept',
            'receiver_org', 'receiver_dept',
            'created_by',
        ).order_by('-created_at')

        direction = self.request.query_params.get('direction')
        if direction == 'outbox':
            if self.request.user.role == 'admin':
                qs = qs.filter(created_by=self.request.user)
            else:
                qs = qs.filter(sender_org=self.request.user.org)
        elif direction == 'inbox':
            if self.request.user.org:
                qs = qs.filter(receiver_org=self.request.user.org)
            else:
                qs = qs.filter(receiver_org__code__iexact='NEA')

        status_filter   = self.request.query_params.get('status')
        type_filter     = self.request.query_params.get('type')
        priority_filter = self.request.query_params.get('priority')
        search          = self.request.query_params.get('search')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if type_filter:
            qs = qs.filter(type=type_filter)
        if priority_filter:
            qs = qs.filter(priority=priority_filter)
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(reference_no__icontains=search))

        receiver_dept = self.request.query_params.get('receiver_dept')
        if receiver_dept:
            qs = qs.filter(receiver_dept_id=receiver_dept)

        only_received = self.request.query_params.get('only_received')
        if direction == 'inbox' and only_received in ('1', 'true', 'True'):
            qs = qs.filter(status__in=['RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'ACTION_TAKEN', 'CLOSED'])

        return qs

    def get_default_sender(self):
        if self.request.user.role == 'admin':
            nea_org, _ = Organization.objects.get_or_create(
                code='NEA',
                defaults={'name': 'National Engineering Authority', 'type': 'internal'}
            )
            nea_dept, _ = Department.objects.get_or_create(
                org=nea_org,
                code='ADMIN',
                defaults={'name': 'Administration'}
            )
            return nea_org, nea_dept

        if self.request.user.org and self.request.user.dept:
            return self.request.user.org, self.request.user.dept

        org = Organization.objects.filter(type='internal').first()
        if org:
            dept = org.departments.first()
            if dept:
                return org, dept

        raise serializers.ValidationError('Unable to resolve sender organization and department.')

    def perform_create(self, serializer):
        sender_org, sender_dept = self.get_default_sender()
        
        # Allow overriding sender_dept if provided in request
        sender_dept_id = self.request.data.get('sender_dept')
        if sender_dept_id:
            from dclts.organizations.models import Department
            try:
                sender_dept = Department.objects.get(id=sender_dept_id)
            except Department.DoesNotExist:
                pass  # Fall back to default
        
        notice = serializer.save(
            created_by=self.request.user,
            sender_org=sender_org,
            sender_dept=sender_dept,
        )
        NoticeEvent.objects.create(
            notice=notice,
            status='DRAFT',
            action_by=self.request.user,
            remarks='Notice created',
        )

    def create(self, request, *args, **kwargs):
        serializer = NoticeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validate sender_dept
        sender_dept_id = request.data.get('sender_dept')
        if sender_dept_id:
            from dclts.organizations.models import Department
            try:
                dept = Department.objects.select_related('org').get(id=sender_dept_id)
                if dept.org.code != 'NEA':
                    raise serializers.ValidationError({'sender_dept': 'Sender department must belong to NEA organization.'})
            except Department.DoesNotExist:
                raise serializers.ValidationError({'sender_dept': 'Invalid sender department.'})

        self.perform_create(serializer)
        notice = serializer.instance
        return Response(NoticeListSerializer(notice).data, status=status.HTTP_201_CREATED)


class NoticeStatsView(APIView):
    def get(self, request):
        counts = Notice.objects.values('status').annotate(count=Count('id'))
        stats = {'total': 0}
        for row in counts:
            stats[row['status']] = row['count']
            stats['total'] += row['count']
        return Response(stats)


class NoticeDetailView(generics.RetrieveAPIView):
    serializer_class = NoticeSerializer

    def get_queryset(self):
        return Notice.objects.select_related(
            'sender_org', 'sender_dept',
            'receiver_org', 'receiver_dept',
            'created_by',
        ).prefetch_related('events__action_by')


class NoticeStatusUpdateView(APIView):
    def patch(self, request, pk):
        try:
            notice = Notice.objects.select_related(
                'sender_org', 'sender_dept', 'receiver_org', 'receiver_dept', 'created_by'
            ).prefetch_related('events__action_by').get(pk=pk)
        except Notice.DoesNotExist:
            return Response({'error': 'Notice not found.'}, status=404)

        serializer = StatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        remarks    = serializer.validated_data.get('remarks', '')

        if not notice.can_transition_to(new_status):
            allowed = Notice.VALID_TRANSITIONS.get(notice.status, [])
            return Response({
                'error':   f'Cannot transition from {notice.status} to {new_status}.',
                'allowed': allowed,
            }, status=400)

        # Generate reference number when moving to APPROVED
        if new_status == 'APPROVED' and not notice.reference_no:
            year = timezone.now().year
            notice.reference_no = ReferenceCounter.next_reference(
                notice.sender_org.code,
                notice.sender_dept.code,
                year,
            )

        if new_status == 'SENT':
            notice.sent_at = timezone.now()
        if new_status == 'CLOSED':
            notice.closed_at = timezone.now()

        notice.status = new_status
        notice.save()

        NoticeEvent.objects.create(
            notice=notice,
            status=new_status,
            action_by=request.user,
            remarks=remarks,
        )

        # Refresh from DB to get updated events
        notice.refresh_from_db()
        return Response(NoticeSerializer(notice).data)


class NoticeTimelineView(generics.ListAPIView):
    def get(self, request, pk):
        events = NoticeEvent.objects.filter(notice_id=pk).select_related('action_by')
        from .serializers import NoticeEventSerializer
        return Response(NoticeEventSerializer(events, many=True).data)
