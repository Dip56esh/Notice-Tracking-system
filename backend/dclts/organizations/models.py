from django.db import models


class Organization(models.Model):
    TYPE_CHOICES = [('internal', 'Internal'), ('external', 'External')]

    name       = models.CharField(max_length=255)
    code       = models.CharField(max_length=20, unique=True)
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES, default='external')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'organizations'
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code})'


class Department(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    org  = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='departments')

    class Meta:
        db_table = 'departments'
        unique_together = ('org', 'code')
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.code}) — {self.org.code}'
