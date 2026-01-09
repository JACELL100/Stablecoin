"""
URL configuration for the transactions app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TransactionLogViewSet, AuditEventViewSet, SpendingAnalyticsViewSet,
    TransparencyDashboardView, ExportView, OnChainSyncView
)
from .auditor_views import (
    AuditorDashboardView, AuditorFlaggedView, 
    AuditorReviewTransactionView, AuditorReportsView
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
    
    # Auditor-specific endpoints
    path('auditor/dashboard/', AuditorDashboardView.as_view(), name='auditor-dashboard'),
    path('auditor/flagged/', AuditorFlaggedView.as_view(), name='auditor-flagged'),
    path('auditor/review/<uuid:transaction_id>/', AuditorReviewTransactionView.as_view(), name='auditor-review'),
    path('auditor/reports/', AuditorReportsView.as_view(), name='auditor-reports'),
]
