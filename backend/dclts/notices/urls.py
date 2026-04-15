from django.urls import path
from .views import (
    NoticeListCreateView, NoticeStatsView,
    NoticeDetailView, NoticeStatusUpdateView, NoticeTimelineView,
)

urlpatterns = [
    path('',              NoticeListCreateView.as_view(),   name='notice-list-create'),
    path('stats/',        NoticeStatsView.as_view(),        name='notice-stats'),
    path('<int:pk>/',     NoticeDetailView.as_view(),       name='notice-detail'),
    path('<int:pk>/status/',   NoticeStatusUpdateView.as_view(), name='notice-status'),
    path('<int:pk>/timeline/', NoticeTimelineView.as_view(),     name='notice-timeline'),
]
