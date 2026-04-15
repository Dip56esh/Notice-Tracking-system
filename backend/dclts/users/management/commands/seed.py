"""
Management command to seed initial admin user.
Run:  python manage.py seed
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed initial admin user'

    def handle(self, *args, **kwargs):
        if not User.objects.filter(email='admin@dclts.gov.np').exists():
            User.objects.create_superuser(
                email='admin@dclts.gov.np',
                name='System Admin',
                password='admin123',
            )
            self.stdout.write(self.style.SUCCESS(
                '✅ Admin user created: admin@dclts.gov.np / admin123'
            ))
        else:
            self.stdout.write('ℹ️  Admin user already exists.')
