from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, email, name, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra):
        extra.setdefault('role', 'admin')
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
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
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default='officer')
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

    def __str__(self):
        return f'{self.name} <{self.email}>'
