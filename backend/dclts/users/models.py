from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.core.exceptions import ValidationError


class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        
        # Ensure user belongs to NEA organization
        from dclts.organizations.models import Organization
        if 'org' not in extra or extra['org'] is None:
            nea_org, _ = Organization.objects.get_or_create(
                code='NEA',
                defaults={'name': 'National Engineering Authority', 'type': 'internal'}
            )
            extra['org'] = nea_org
        
        user = self.model(email=email, name=name, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra):
        from dclts.organizations.models import Organization
        extra.setdefault('role', 'admin')
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        
        # Ensure superuser belongs to NEA organization
        if 'org' not in extra or extra['org'] is None:
            nea_org, _ = Organization.objects.get_or_create(
                code='NEA',
                defaults={'name': 'National Engineering Authority', 'type': 'internal'}
            )
            extra['org'] = nea_org
        
        return self.create_user(email, name, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('admin',   'Admin'),
        ('manager', 'Manager'),
        ('officer', 'Officer'),
        ('viewer',  'Viewer'),
    ]

    email    = models.EmailField(unique=True)
    name     = models.CharField(max_length=255)
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default='manager')
    org      = models.ForeignKey('organizations.Organization', null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name='members')
    dept     = models.ForeignKey('organizations.Department', null=True, blank=True,
                                 on_delete=models.SET_NULL, related_name='members')
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def clean(self):
        """Ensure user belongs to NEA organization and enforce single admin."""
        if self.org and self.org.code != 'NEA':
            raise ValidationError('Users must belong to NEA organization.')

        if self.role == 'admin':
            existing_admins = self.__class__.objects.filter(role='admin')
            if self.pk:
                existing_admins = existing_admins.exclude(pk=self.pk)
            if existing_admins.exists():
                raise ValidationError('Only one admin user is allowed.')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} <{self.email}>'
