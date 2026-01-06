"""
URL configuration for the ML service.
"""
from django.urls import path
from .views import (
    FraudCheckView, BeneficiaryRiskView,
    TrainModelView, ModelStatusView, AnalyzeAllView
)

urlpatterns = [
    path('fraud-check/', FraudCheckView.as_view(), name='fraud-check'),
    path('beneficiary-risk/<uuid:beneficiary_id>/', BeneficiaryRiskView.as_view(), name='beneficiary-risk'),
    path('train/', TrainModelView.as_view(), name='train-model'),
    path('status/', ModelStatusView.as_view(), name='model-status'),
    path('analyze-all/', AnalyzeAllView.as_view(), name='analyze-all'),
]
