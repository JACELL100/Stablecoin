from django.apps import AppConfig


class MlServiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ml_service'
    verbose_name = 'ML Fraud Detection Service'
