from rest_framework import serializers
from django.contrib.auth import get_user_model
from dclts.organizations.models import Organization

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    org_name  = serializers.CharField(source='org.name',  read_only=True)
    org_code  = serializers.CharField(source='org.code',  read_only=True)
    dept_name = serializers.CharField(source='dept.name', read_only=True)
    dept_code = serializers.CharField(source='dept.code', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role',
                  'org_id', 'org_name', 'org_code',
                  'dept_id', 'dept_name', 'dept_code',
                  'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'name', 'password', 'role', 'dept']  # Removed 'org' from fields

    def create(self, validated_data):
        password = validated_data.pop('password')
        
        # Always assign NEA organization automatically
        nea_org, _ = Organization.objects.get_or_create(
            code='NEA',
            defaults={'name': 'National Engineering Authority', 'type': 'internal'}
        )
        validated_data['org'] = nea_org
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UpdateRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['role']
