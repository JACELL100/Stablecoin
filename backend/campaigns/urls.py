"""
URL configuration for the campaigns app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AidCampaignViewSet, FundAllocationViewSet, DonationViewSet

router = DefaultRouter()
router.register(r'', AidCampaignViewSet, basename='campaign')
router.register(r'allocations', FundAllocationViewSet, basename='allocation')
router.register(r'donations', DonationViewSet, basename='donation')

urlpatterns = [
    path('', include(router.urls)),
]
