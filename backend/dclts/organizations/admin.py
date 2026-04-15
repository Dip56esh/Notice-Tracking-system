from django.contrib import admin
from .models import Organization, Department


class DepartmentInline(admin.TabularInline):
    model = Department
    extra = 1


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'type', 'created_at')
    inlines = [DepartmentInline]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'org')
