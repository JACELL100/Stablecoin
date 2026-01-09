"""
Auditor-specific views for the transactions app.
"""
from django.db.models import Sum, Count, Avg
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from accounts.models import BeneficiaryProfile, User, UserRole
from campaigns.models import AidCampaign, CampaignStatus
from .models import TransactionLog, AuditEvent
from .serializers import TransactionLogSerializer, AuditEventSerializer


class AuditorDashboardView(APIView):
    """
    Dashboard statistics for auditors.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Check if user is auditor
        if user.role not in [UserRole.AUDITOR, UserRole.ADMIN]:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Transaction stats
        total_transactions = TransactionLog.objects.count()
        flagged_transactions = TransactionLog.objects.filter(is_flagged=True).count()
        
        total_volume = TransactionLog.objects.filter(
            status='confirmed'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Compliance score calculation
        if total_transactions > 0:
            compliance_score = round((1 - (flagged_transactions / total_transactions)) * 100, 1)
        else:
            compliance_score = 100.0
        
        # Recent flagged transactions
        flagged = TransactionLog.objects.filter(
            is_flagged=True
        ).order_by('-timestamp')[:10]
        
        # Recent audit events
        recent_events = AuditEvent.objects.order_by('-timestamp')[:10]
        
        # Alerts (flagged items + unusual patterns)
        alerts = []
        
        # Add flagged transaction alerts
        for tx in flagged[:5]:
            alerts.append({
                'id': str(tx.id),
                'type': 'warning',
                'message': f"Flagged transaction: {tx.flag_reason or 'High fraud score'}",
                'time': self._relative_time(tx.timestamp),
                'transaction_id': str(tx.id),
            })
        
        # Add recent campaign alerts
        recent_campaigns = AidCampaign.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=1)
        )[:3]
        for campaign in recent_campaigns:
            alerts.append({
                'id': f"campaign-{campaign.id}",
                'type': 'info',
                'message': f"New campaign created: {campaign.name}",
                'time': self._relative_time(campaign.created_at),
            })
        
        # Stats by day (last 7 days)
        seven_days_ago = timezone.now() - timedelta(days=7)
        daily_stats = (
            TransactionLog.objects
            .filter(timestamp__gte=seven_days_ago)
            .annotate(date=TruncDate('timestamp'))
            .values('date')
            .annotate(
                total=Sum('amount'),
                count=Count('id'),
                flagged=Count('id', filter=models.Q(is_flagged=True))
            )
            .order_by('date')
        )
        
        # Category breakdown
        by_category = TransactionLog.objects.filter(
            status='confirmed'
        ).values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        )
        
        return Response({
            'stats': {
                'total_transactions': total_transactions,
                'flagged_transactions': flagged_transactions,
                'total_volume': float(total_volume),
                'compliance_score': compliance_score,
            },
            'alerts': alerts,
            'flagged_transactions': TransactionLogSerializer(flagged, many=True).data,
            'recent_audit_events': AuditEventSerializer(recent_events, many=True).data,
            'daily_stats': [
                {
                    'date': item['date'].isoformat(),
                    'total': float(item['total'] or 0),
                    'count': item['count'],
                    'flagged': item['flagged']
                }
                for item in daily_stats
            ],
            'by_category': [
                {'category': item['category'], 'total': float(item['total'] or 0), 'count': item['count']}
                for item in by_category
            ],
        })
    
    def _relative_time(self, dt):
        diff = timezone.now() - dt
        if diff.days > 0:
            return f"{diff.days} days ago"
        hours = diff.seconds // 3600
        if hours > 0:
            return f"{hours} hours ago"
        minutes = diff.seconds // 60
        if minutes > 0:
            return f"{minutes} mins ago"
        return "Just now"


# Need to import models for Q object
from django.db import models


class AuditorFlaggedView(APIView):
    """
    List of all flagged transactions for review.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role not in [UserRole.AUDITOR, UserRole.ADMIN]:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        flagged = TransactionLog.objects.filter(
            is_flagged=True
        ).order_by('-timestamp')
        
        # Filters
        severity = request.query_params.get('severity')
        if severity == 'high':
            flagged = flagged.filter(fraud_score__gte=0.8)
        elif severity == 'medium':
            flagged = flagged.filter(fraud_score__gte=0.5, fraud_score__lt=0.8)
        elif severity == 'low':
            flagged = flagged.filter(fraud_score__lt=0.5)
        
        return Response(TransactionLogSerializer(flagged, many=True).data)


class AuditorReviewTransactionView(APIView):
    """
    Review and clear or escalate a flagged transaction.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, transaction_id):
        if request.user.role not in [UserRole.AUDITOR, UserRole.ADMIN]:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        action = request.data.get('action')  # 'approve' or 'escalate'
        notes = request.data.get('notes', '')
        
        try:
            transaction = TransactionLog.objects.get(id=transaction_id)
        except TransactionLog.DoesNotExist:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if action == 'approve':
            transaction.is_flagged = False
            transaction.flag_reason = f"Cleared by {request.user.email}: {notes}"
            transaction.save()
            
            # Create audit event
            AuditEvent.objects.create(
                event_type='flag_cleared',
                actor=request.user,
                transaction=transaction,
                details={'notes': notes, 'action': 'approved'}
            )
            
            return Response({
                'message': 'Transaction approved and flag cleared',
                'transaction': TransactionLogSerializer(transaction).data
            })
        
        elif action == 'escalate':
            transaction.flag_reason = f"Escalated by {request.user.email}: {notes}"
            transaction.save()
            
            # Create audit event
            AuditEvent.objects.create(
                event_type='flag_escalated',
                actor=request.user,
                transaction=transaction,
                details={'notes': notes, 'action': 'escalated'}
            )
            
            return Response({
                'message': 'Transaction escalated for further review',
                'transaction': TransactionLogSerializer(transaction).data
            })
        
        return Response(
            {'error': 'Invalid action. Use "approve" or "escalate"'},
            status=status.HTTP_400_BAD_REQUEST
        )


class AuditorReportsView(APIView):
    """
    Generate compliance and audit reports.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.role not in [UserRole.AUDITOR, UserRole.ADMIN]:
            return Response(
                {'error': 'Not authorized'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Report period
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)
        
        transactions = TransactionLog.objects.filter(timestamp__gte=start_date)
        
        # Overall stats
        total_count = transactions.count()
        total_volume = transactions.filter(status='confirmed').aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        flagged_count = transactions.filter(is_flagged=True).count()
        avg_fraud_score = transactions.aggregate(avg=Avg('fraud_score'))['avg'] or 0
        
        # By transaction type
        by_type = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total=Sum('amount')
        )
        
        # By status
        by_status = transactions.values('status').annotate(count=Count('id'))
        
        # Campaign breakdown
        campaign_stats = []
        campaigns = AidCampaign.objects.filter(
            status__in=[CampaignStatus.ACTIVE, CampaignStatus.COMPLETED]
        )
        for campaign in campaigns:
            campaign_txs = transactions.filter(allocation__campaign=campaign)
            campaign_stats.append({
                'campaign_id': str(campaign.id),
                'campaign_name': campaign.name,
                'transaction_count': campaign_txs.count(),
                'total_volume': float(campaign_txs.aggregate(total=Sum('amount'))['total'] or 0),
                'flagged_count': campaign_txs.filter(is_flagged=True).count(),
            })
        
        return Response({
            'report_period': {
                'days': days,
                'start_date': start_date.isoformat(),
                'end_date': timezone.now().isoformat(),
            },
            'summary': {
                'total_transactions': total_count,
                'total_volume': float(total_volume),
                'flagged_transactions': flagged_count,
                'flagged_percentage': round((flagged_count / total_count * 100) if total_count > 0 else 0, 2),
                'average_fraud_score': round(float(avg_fraud_score), 4),
            },
            'by_type': [
                {'type': item['transaction_type'], 'count': item['count'], 'total': float(item['total'] or 0)}
                for item in by_type
            ],
            'by_status': [
                {'status': item['status'], 'count': item['count']}
                for item in by_status
            ],
            'by_campaign': campaign_stats,
        })
