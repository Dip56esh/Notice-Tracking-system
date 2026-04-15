from django.urls import path
from .views import OrganizationListCreateView, DepartmentCreateView, OrganizationDeleteView

urlpatterns = [
    path('',                            OrganizationListCreateView.as_view(), name='org-list-create'),
    path('<int:pk>/',                   OrganizationDeleteView.as_view(),     name='org-delete'),
    path('<int:org_id>/departments/',   DepartmentCreateView.as_view(),       name='dept-create'),
]
