"""
URL configuration for the accounts app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GoogleAuthView, ConnectWalletView,
    UserViewSet, WalletViewSet, BeneficiaryViewSet, MerchantViewSet,
    AdminStatsView
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'wallets', WalletViewSet, basename='wallet')
router.register(r'beneficiaries', BeneficiaryViewSet, basename='beneficiary')
router.register(r'merchants', MerchantViewSet, basename='merchant')

urlpatterns = [
    path('', include(router.urls)),
    path('google/', GoogleAuthView.as_view(), name='google-auth'),
    path('connect-wallet/', ConnectWalletView.as_view(), name='connect-wallet'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
]
