from django.urls import path
from .views import OrganizationListCreateView, DepartmentListView, DepartmentCreateView, OrganizationDeleteView

urlpatterns = [
    path('',                            OrganizationListCreateView.as_view(), name='org-list-create'),
    path('<int:pk>/',                   OrganizationDeleteView.as_view(),     name='org-delete'),
    path('departments/',                DepartmentListView.as_view(),         name='dept-list'),
    path('<int:org_id>/departments/',   DepartmentCreateView.as_view(),       name='dept-create'),
]
