from rest_framework import serializers
from .models import Organization, Department


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ['id', 'name', 'code', 'org_id']


class OrganizationSerializer(serializers.ModelSerializer):
    departments = DepartmentSerializer(many=True, read_only=True)

    class Meta:
        model  = Organization
        fields = ['id', 'name', 'code', 'type', 'created_at', 'departments']


class OrganizationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Organization
        fields = ['name', 'code', 'type']

    def validate_code(self, value):
        return value.strip().upper()


class DepartmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = ['name', 'code']

    def validate_code(self, value):
        return value.strip().upper()
