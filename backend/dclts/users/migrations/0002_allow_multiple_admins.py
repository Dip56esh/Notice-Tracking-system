# Generated migration for multi-admin support

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        # This migration documents the removal of the single-admin constraint.
        # No database schema changes required as the constraint was in model validation.
        # Changes made:
        # 1. Removed single admin validation from User.clean() method
        # 2. Removed single admin check from RegisterSerializer
        # 3. Removed single admin check from UpdateRoleSerializer
        # 4. Added department-specific permission checks in Notice views
        # 
        # Multiple admins are now supported, with each admin optionally assigned to a department.
        # Department-specific admins can only manage notices from their assigned department.
        # Global admins (without a department assignment) retain full access.
    ]
