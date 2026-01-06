"""
URL configuration for the transactions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TransactionLogViewSet, AuditEventViewSet, SpendingAnalyticsViewSet,
    TransparencyDashboardView, ExportView, OnChainSyncView
)

router = DefaultRouter()
router.register(r'logs', TransactionLogViewSet, basename='transaction-log')
router.register(r'audit-events', AuditEventViewSet, basename='audit-event')
router.register(r'analytics', SpendingAnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
    path('transparency/', TransparencyDashboardView.as_view(), name='transparency-dashboard'),
    path('export/', ExportView.as_view(), name='export'),
    path('sync/', OnChainSyncView.as_view(), name='sync'),
]
