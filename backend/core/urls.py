"""
URL configuration for the Disaster Relief System.
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # API endpoints
    path('api/auth/', include('accounts.urls')),
    path('api/campaigns/', include('campaigns.urls')),
    path('api/transactions/', include('transactions.urls')),
    # path('api/ml/', include('ml_service.urls')),  # Temporarily disabled - numpy issue
]
