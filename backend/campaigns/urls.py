"""
URL configuration for the campaigns app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AidCampaignViewSet, FundAllocationViewSet, DonationViewSet
from .donor_views import (
    DonorDashboardView, DonorDonationsView, DonorImpactView, MakeDonationView
)

router = DefaultRouter()
router.register(r'', AidCampaignViewSet, basename='campaign')
router.register(r'allocations', FundAllocationViewSet, basename='allocation')
router.register(r'donations', DonationViewSet, basename='donation')

urlpatterns = [
    path('', include(router.urls)),
    
    # Donor-specific endpoints
    path('donor/dashboard/', DonorDashboardView.as_view(), name='donor-dashboard'),
    path('donor/donations/', DonorDonationsView.as_view(), name='donor-donations'),
    path('donor/impact/', DonorImpactView.as_view(), name='donor-impact'),
    path('donor/donate/', MakeDonationView.as_view(), name='make-donation'),
]
