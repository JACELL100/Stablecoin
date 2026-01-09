"""
Views for the transactions app.
"""
import csv
import json
import logging
from datetime import timedelta
from io import StringIO

from django.db.models import Sum, Count
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from campaigns.models import AidCampaign, CampaignStatus
from accounts.models import BeneficiaryProfile, ApprovedMerchant
from .models import TransactionLog, AuditEvent, SpendingAnalytics
from .serializers import (
    TransactionLogSerializer, TransactionLogPublicSerializer,
    AuditEventSerializer, SpendingAnalyticsSerializer,
    TransparencyDashboardSerializer, ExportSerializer
)

logger = logging.getLogger(__name__)


class TransactionLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing transaction logs.
    """
    queryset = TransactionLog.objects.all()
    serializer_class = TransactionLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['transaction_type', 'status', 'category', 'is_flagged']
    search_fields = ['tx_hash', 'from_address', 'to_address', 'reference']
    ordering_fields = ['timestamp', 'amount', 'fraud_score']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Non-admins can only see their own transactions
        if not user.is_admin:
            wallets = user.wallets.values_list('address', flat=True)
            queryset = queryset.filter(
                models.Q(from_address__in=wallets) | 
                models.Q(to_address__in=wallets)
            )
        
        # Date filters
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        
        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        
        # Campaign filter
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            queryset = queryset.filter(allocation__campaign_id=campaign_id)
        
        return queryset
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def flagged(self, request):
        """Get all flagged transactions for review."""
        flagged = self.get_queryset().filter(is_flagged=True)
        return Response(TransactionLogSerializer(flagged, many=True).data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def clear_flag(self, request, pk=None):
        """Clear a flag on a transaction after review."""
        transaction = self.get_object()
        transaction.is_flagged = False
        transaction.flag_reason = f"Cleared by {request.user.email}: {request.data.get('reason', '')}"
        transaction.save()
        
        return Response({
            'message': 'Flag cleared',
            'transaction': TransactionLogSerializer(transaction).data
        })


class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit events.
    """
    queryset = AuditEvent.objects.select_related('actor', 'campaign', 'transaction')
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['event_type']
    ordering_fields = ['timestamp']


class SpendingAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing spending analytics.
    """
    queryset = SpendingAnalytics.objects.all()
    serializer_class = SpendingAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Campaign filter
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        
        # Date range filter
        days = self.request.query_params.get('days', 30)
        try:
            days = int(days)
        except ValueError:
            days = 30
        
        start_date = timezone.now().date() - timedelta(days=days)
        queryset = queryset.filter(date__gte=start_date)
        
        return queryset


class TransparencyDashboardView(APIView):
    """
    Public transparency dashboard API.
    
    Provides aggregated data for public audit purposes.
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        # Get active and completed campaigns
        campaigns = AidCampaign.objects.filter(
            status__in=[CampaignStatus.ACTIVE, CampaignStatus.COMPLETED]
        )
        
        # Aggregate totals
        totals = campaigns.aggregate(
            total_raised=Sum('raised_amount'),
            total_distributed=Sum('distributed_amount'),
            total_spent=Sum('spent_amount')
        )
        
        # Spending by category
        spending_by_category = {}
        for category in ['food', 'medical', 'shelter', 'utilities', 'transport']:
            total = TransactionLog.objects.filter(
                category=category,
                transaction_type='spend',
                status='confirmed'
            ).aggregate(total=Sum('amount'))['total'] or 0
            spending_by_category[category] = float(total)
        
        # Spending over time (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        spending_over_time = (
            TransactionLog.objects
            .filter(
                transaction_type='spend',
                status='confirmed',
                timestamp__gte=thirty_days_ago
            )
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(total=Sum('amount'))
            .order_by('date')
        )
        
        # Recent transactions
        recent_transactions = TransactionLog.objects.filter(
            status='confirmed'
        ).order_by('-timestamp')[:20]
        
        # Campaign summaries
        campaign_data = []
        for campaign in campaigns[:10]:
            campaign_data.append({
                'id': str(campaign.id),
                'name': campaign.name,
                'region': campaign.region,
                'disaster_type': campaign.disaster_type,
                'status': campaign.status,
                'target_amount': float(campaign.target_amount),
                'raised_amount': float(campaign.raised_amount),
                'distributed_amount': float(campaign.distributed_amount),
                'spent_amount': float(campaign.spent_amount),
                'progress_percentage': campaign.progress_percentage,
                'beneficiary_count': campaign.allocations.count()
            })
        
        return Response({
            'total_raised': float(totals['total_raised'] or 0),
            'total_distributed': float(totals['total_distributed'] or 0),
            'total_spent': float(totals['total_spent'] or 0),
            'active_campaigns': campaigns.filter(status=CampaignStatus.ACTIVE).count(),
            'total_beneficiaries': BeneficiaryProfile.objects.count(),
            'total_merchants': ApprovedMerchant.objects.filter(is_registered_on_chain=True).count(),
            'spending_by_category': spending_by_category,
            'spending_over_time': [
                {'date': item['date'].isoformat(), 'amount': float(item['total'])}
                for item in spending_over_time
            ],
            'recent_transactions': TransactionLogPublicSerializer(recent_transactions, many=True).data,
            'campaigns': campaign_data,
            'last_updated': timezone.now().isoformat()
        })


class ExportView(APIView):
    """
    Export transaction data as CSV or JSON.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = ExportSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        
        format_type = serializer.validated_data.get('format', 'csv')
        start_date = serializer.validated_data.get('start_date')
        end_date = serializer.validated_data.get('end_date')
        campaign_id = serializer.validated_data.get('campaign_id')
        transaction_type = serializer.validated_data.get('transaction_type')
        
        # Build queryset
        queryset = TransactionLog.objects.all()
        
        if not request.user.is_admin:
            wallets = request.user.wallets.values_list('address', flat=True)
            queryset = queryset.filter(
                models.Q(from_address__in=wallets) | 
                models.Q(to_address__in=wallets)
            )
        
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)
        if campaign_id:
            queryset = queryset.filter(allocation__campaign_id=campaign_id)
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)
        
        queryset = queryset.order_by('-timestamp')[:1000]  # Limit to 1000
        
        if format_type == 'json':
            return self._export_json(queryset)
        else:
            return self._export_csv(queryset)
    
    def _export_csv(self, queryset):
        output = StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'ID', 'Type', 'Status', 'TX Hash', 'Block',
            'From', 'To', 'Amount', 'Category',
            'Reference', 'Timestamp'
        ])
        
        # Data
        for tx in queryset:
            writer.writerow([
                str(tx.id),
                tx.transaction_type,
                tx.status,
                tx.tx_hash or '',
                tx.block_number or '',
                tx.from_address,
                tx.to_address,
                str(tx.amount),
                tx.category,
                tx.reference,
                tx.timestamp.isoformat()
            ])
        
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'
        return response
    
    def _export_json(self, queryset):
        data = TransactionLogSerializer(queryset, many=True).data
        
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename="transactions.json"'
        return response


class OnChainSyncView(APIView):
    """
    Trigger on-chain transaction sync.
    """
    permission_classes = [IsAdmin]
    
    def post(self, request):
        # TODO: Trigger Celery task to sync blockchain events
        
        return Response({
            'message': 'Blockchain sync initiated',
            'status': 'pending'
        })
