from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import generics, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from dclts.organizations.models import Organization, Department
from .models import Notice, NoticeEvent, NoticeReceiver, ReferenceCounter
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
            'sender_org', 'sender_dept', 'created_by',
        ).prefetch_related(
            'notice_receivers__receiver_org', 'notice_receivers__receiver_dept'
        ).order_by('-created_at')

        user = self.request.user
        direction = self.request.query_params.get('direction')

        # Outbox: what this user / their department sent
        if direction == 'outbox':
            if user.role == 'admin':
                # Department admin: only notices sent by their department
                if user.dept:
                    qs = qs.filter(sender_dept=user.dept)
                else:
                    # Global admin: see all outgoing notices
                    qs = qs
            else:
                # Non-admins: notices they created OR notices sent from their department
                qs = qs.filter(
                    Q(created_by=user) |
                    Q(sender_org=user.org, sender_dept=user.dept)
                )

        # Inbox: what this user / their department received
        elif direction == 'inbox':
            if user.role == 'admin':
                if user.dept:
                    # Department admin: notices received by their department
                    qs = qs.filter(notice_receivers__receiver_dept=user.dept)
                else:
                    # Global admin: see all NEA incoming notices
                    qs = qs.filter(notice_receivers__receiver_org__code__iexact='NEA')
            else:
                # Non-admins: notices addressed to their org/department
                if user.org:
                    qs = qs.filter(notice_receivers__receiver_org=user.org)
                    if user.dept:
                        qs = qs.filter(notice_receivers__receiver_dept=user.dept)
                else:
                    qs = qs.filter(notice_receivers__receiver_org__code__iexact='NEA')

        # Optional: filter by a specific receiver_dept id passed as query param
        receiver_dept = self.request.query_params.get('receiver_dept')
        if receiver_dept:
            try:
                receiver_dept_id = int(receiver_dept)
                qs = qs.filter(notice_receivers__receiver_dept_id=receiver_dept_id)
            except (ValueError, TypeError):
                pass

        # If requested, only return notices that have been received/processed
        only_received = self.request.query_params.get('only_received')
        if direction == 'inbox' and only_received in ('1', 'true', 'True'):
            qs = qs.filter(status__in=['RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'ACTION_TAKEN', 'CLOSED'])

        return qs.distinct()

    def get_default_sender(self):
        if self.request.user.role == 'admin':
            if self.request.user.dept:
                # Department admin - send from their department
                return self.request.user.org, self.request.user.dept
            else:
                # Global admin - send from NEA/ADMIN
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
        # Only admins and managers can compose letters
        if request.user.role not in ['admin', 'manager']:
            return Response({
                'error': 'Only admins and managers can compose letters.',
            }, status=403)
        
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

        # If this is a reply, ensure the requesting user is actually a receiver of the original notice
        # Managers can reply to received notices, but only admins can change status
        reply_to_id = serializer.validated_data.get('reply_to_id')
        if reply_to_id:
            try:
                original_notice = Notice.objects.prefetch_related('notice_receivers__receiver_dept').get(pk=reply_to_id)
            except Notice.DoesNotExist:
                raise serializers.ValidationError({'reply_to_id': 'Original notice not found.'})

            # Check if user is authorized to reply
            if request.user.role == 'admin':
                # Admins can always reply
                pass
            else:
                # Non-admin users (managers, officers, viewers) can only reply if they received the notice
                if not request.user.dept or not original_notice.notice_receivers.filter(receiver_dept=request.user.dept).exists():
                    raise serializers.ValidationError({'reply_to_id': 'You are not permitted to reply to this notice.'})

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
        qs = Notice.objects.select_related(
            'sender_org', 'sender_dept',
            'created_by',
        ).prefetch_related('notice_receivers__receiver_org', 'notice_receivers__receiver_dept', 'events__action_by')
        user = self.request.user

        if user.role == 'admin':
            if user.dept:
                # Department admin - can see outgoing and incoming for their dept
                qs = qs.filter(
                    Q(sender_dept=user.dept) |
                    Q(notice_receivers__receiver_dept=user.dept)
                )
            # else: global admin sees all (no additional filter)
        elif user.org:
            # Non-admins can see notices they created, sent from their dept, or received by their dept
            qs = qs.filter(
                Q(created_by=user) |
                Q(sender_org=user.org, sender_dept=user.dept) |
                Q(notice_receivers__receiver_org=user.org, notice_receivers__receiver_dept=user.dept)
            )
        else:
            # Fallback to NEA notices for users without org
            qs = qs.filter(notice_receivers__receiver_org__code__iexact='NEA')

        return qs.distinct()


class NoticeStatusUpdateView(APIView):
    def patch(self, request, pk):
        try:
            notice = Notice.objects.select_related(
                'sender_org', 'sender_dept', 'created_by'
            ).prefetch_related('notice_receivers__receiver_org', 'notice_receivers__receiver_dept').get(pk=pk)
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

        # Check permissions for status update
        if request.user.role != 'admin':
            return Response({
                'error': 'Only admins can update notice status. Managers can only compose letters.',
            }, status=403)
        
        # Enforce workflow boundaries for department admins
        # Workflow: Sender dept (DRAFT->DELIVERED), Receiver dept (DELIVERED->CLOSED)
        if request.user.dept:
            is_sender_admin = notice.sender_dept == request.user.dept
            is_receiver_admin = notice.notice_receivers.filter(receiver_dept=request.user.dept).exists()
            
            if not is_sender_admin and not is_receiver_admin:
                return Response({
                    'error': f'You can only manage notices from your department ({request.user.dept.name}). This notice is from {notice.sender_dept.name}.',
                }, status=403)
            
            # Enforce status boundaries
            if is_sender_admin and not is_receiver_admin:
                # Sender dept admin: can update up to DELIVERED
                sender_statuses = ['DRAFT', 'APPROVED', 'SENT', 'DELIVERED']
                if new_status not in sender_statuses:
                    return Response({
                        'error': f'As sender department admin, you can only update to: {", ".join(sender_statuses)}',
                    }, status=403)
            elif is_receiver_admin and not is_sender_admin:
                # Receiver dept admin: can update from DELIVERED onwards
                receiver_statuses = ['RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'ACTION_TAKEN', 'CLOSED']
                if new_status not in receiver_statuses:
                    return Response({
                        'error': f'As receiver department admin, you can only update to: {", ".join(receiver_statuses)}',
                    }, status=403)

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

        # Refresh from DB and return with full detail including events
        notice = Notice.objects.select_related(
            'sender_org', 'sender_dept', 'created_by'
        ).prefetch_related('notice_receivers__receiver_org', 'notice_receivers__receiver_dept', 'events__action_by').get(pk=pk)
        return Response(NoticeSerializer(notice).data)


class NoticeTimelineView(generics.ListAPIView):
    def get(self, request, pk):
        events = NoticeEvent.objects.filter(notice_id=pk).select_related('action_by')
        from .serializers import NoticeEventSerializer
        return Response(NoticeEventSerializer(events, many=True).data)


class NoticeNotificationsView(generics.ListAPIView):
    serializer_class = NoticeListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Notice.objects.select_related(
            'sender_org', 'sender_dept', 'created_by'
        ).prefetch_related('notice_receivers__receiver_org', 'notice_receivers__receiver_dept').order_by('-created_at')
        # Department admin: notifications for both outgoing and incoming work
        if user.role == 'admin':
            if user.dept:
                outgoing_statuses = ['DRAFT', 'APPROVED', 'SENT', 'DELIVERED']
                incoming_statuses = ['DELIVERED', 'RECEIVED', 'ACKNOWLEDGED', 'IN_REVIEW', 'ACTION_TAKEN', 'CLOSED']

                outgoing = qs.filter(sender_dept=user.dept, status__in=outgoing_statuses)
                incoming = qs.filter(notice_receivers__receiver_dept=user.dept, status__in=incoming_statuses)
                qs = (outgoing | incoming).distinct().order_by('-created_at')
            else:
                # Global admin: show all active notices (exclude closed/rejected)
                qs = qs.exclude(status__in=['CLOSED', 'REJECTED'])
        else:
            # Non-admin users: limited notifications
            #  - Outgoing: notices they created or their department sent (up to DELIVERED)
            #  - Incoming: notices received by their department (DELIVERED/RECEIVED)
            outgoing_statuses = ['DRAFT', 'APPROVED', 'SENT', 'DELIVERED']
            incoming_statuses = ['DELIVERED', 'RECEIVED']

            parts = Q(created_by=user, status__in=outgoing_statuses)
            if user.org and user.dept:
                parts |= Q(sender_org=user.org, sender_dept=user.dept, status__in=outgoing_statuses)
                parts |= Q(notice_receivers__receiver_org=user.org, notice_receivers__receiver_dept=user.dept, status__in=incoming_statuses)
            elif user.org:
                parts |= Q(notice_receivers__receiver_org=user.org, status__in=incoming_statuses)

            qs = qs.filter(parts).distinct()

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response({'notices': serializer.data})
