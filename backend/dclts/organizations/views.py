from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Organization, Department
from .serializers import (
    OrganizationSerializer, OrganizationCreateSerializer,
    DepartmentSerializer, DepartmentCreateSerializer,
)


class OrganizationListCreateView(generics.ListCreateAPIView):
    queryset = Organization.objects.prefetch_related('departments').order_by('name')
    pagination_class = None

    def get_serializer_class(self):
        return OrganizationCreateSerializer if self.request.method == 'POST' else OrganizationSerializer

    def create(self, request, *args, **kwargs):
        serializer = OrganizationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        org = serializer.save()
        return Response(OrganizationSerializer(org).data, status=status.HTTP_201_CREATED)


class DepartmentCreateView(APIView):
    def post(self, request, org_id):
        org = get_object_or_404(Organization, pk=org_id)
        serializer = DepartmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dept = serializer.save(org=org)
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_201_CREATED)


class OrganizationDeleteView(generics.DestroyAPIView):
    queryset = Organization.objects.all()
