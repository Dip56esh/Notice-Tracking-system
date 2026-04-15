from django.urls import path
from .views import LoginView, RegisterView, MeView, UserListView, UpdateRoleView

urlpatterns = [
    path('login/',        LoginView.as_view(),      name='login'),
    path('register/',     RegisterView.as_view(),   name='register'),
    path('me/',           MeView.as_view(),          name='me'),
    path('users/',        UserListView.as_view(),    name='user-list'),
    path('users/<int:pk>/role/', UpdateRoleView.as_view(), name='update-role'),
]
