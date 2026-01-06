"""
Views for the ML service.
"""
import logging
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from accounts.permissions import IsAdmin
from transactions.models import TransactionLog
from accounts.models import BeneficiaryProfile
from .fraud_detection import fraud_detector, risk_scorer

logger = logging.getLogger(__name__)


class FraudCheckView(APIView):
    """
    Check a transaction for potential fraud.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Analyze a transaction for fraud indicators.
        
        Request body:
            - transaction_id: UUID of the transaction to check
            OR
            - amount: Transaction amount
            - category: Spending category
            - beneficiary_id: UUID of the beneficiary
        """
        transaction_id = request.data.get('transaction_id')
        
        if transaction_id:
            # Check existing transaction
            try:
                transaction = TransactionLog.objects.get(id=transaction_id)
                transaction_data = {
                    'amount': float(transaction.amount),
                    'category': transaction.category,
                    'timestamp': transaction.timestamp,
                    'beneficiary_id': str(transaction.wallet.user.id) if transaction.wallet else None
                }
                
                # Get beneficiary history
                if transaction.wallet:
                    history_qs = TransactionLog.objects.filter(
                        wallet=transaction.wallet,
                        timestamp__lt=transaction.timestamp
                    ).order_by('-timestamp')[:100]
                    
                    history = [
                        {
                            'amount': float(h.amount),
                            'category': h.category,
                            'timestamp': h.timestamp
                        }
                        for h in history_qs
                    ]
                else:
                    history = []
                
            except TransactionLog.DoesNotExist:
                return Response({'error': 'Transaction not found'}, status=status.HTTP_404_NOT_FOUND)
        else:
            # Check new transaction data
            transaction_data = {
                'amount': request.data.get('amount', 0),
                'category': request.data.get('category', ''),
                'timestamp': None,
                'beneficiary_id': request.data.get('beneficiary_id')
            }
            
            beneficiary_id = request.data.get('beneficiary_id')
            if beneficiary_id:
                try:
                    beneficiary = BeneficiaryProfile.objects.get(id=beneficiary_id)
                    wallet = beneficiary.user.wallets.filter(is_primary=True).first()
                    
                    if wallet:
                        history_qs = TransactionLog.objects.filter(
                            wallet=wallet
                        ).order_by('-timestamp')[:100]
                        
                        history = [
                            {
                                'amount': float(h.amount),
                                'category': h.category,
                                'timestamp': h.timestamp
                            }
                            for h in history_qs
                        ]
                    else:
                        history = []
                except BeneficiaryProfile.DoesNotExist:
                    history = []
            else:
                history = []
        
        # Run fraud detection
        from django.utils import timezone
        if not transaction_data.get('timestamp'):
            transaction_data['timestamp'] = timezone.now()
        
        is_anomaly, fraud_score, reasons = fraud_detector.predict(transaction_data, history)
        
        return Response({
            'is_anomaly': is_anomaly,
            'fraud_score': fraud_score,
            'risk_level': 'high' if fraud_score > 0.7 else ('medium' if fraud_score > 0.4 else 'low'),
            'reasons': reasons,
            'recommendation': 'Block transaction' if is_anomaly else 'Allow transaction'
        })


class BeneficiaryRiskView(APIView):
    """
    Calculate risk score for a beneficiary.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, beneficiary_id):
        """Get risk score for a specific beneficiary."""
        try:
            beneficiary = BeneficiaryProfile.objects.select_related('user').get(id=beneficiary_id)
        except BeneficiaryProfile.DoesNotExist:
            return Response({'error': 'Beneficiary not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get beneficiary data
        beneficiary_data = {
            'verification_status': beneficiary.user.verification_status,
            'total_allowance': sum([
                float(a.total_amount) for a in beneficiary.allocations.all()
            ])
        }
        
        # Get transaction history
        wallet = beneficiary.user.wallets.filter(is_primary=True).first()
        if wallet:
            transactions = [
                {
                    'amount': float(t.amount),
                    'category': t.category,
                    'is_flagged': t.is_flagged,
                    'timestamp': t.timestamp
                }
                for t in TransactionLog.objects.filter(wallet=wallet)[:100]
            ]
        else:
            transactions = []
        
        # Calculate risk score
        risk_score, risk_factors = risk_scorer.calculate_risk_score(beneficiary_data, transactions)
        
        return Response({
            'beneficiary_id': str(beneficiary_id),
            'risk_score': risk_score,
            'risk_level': 'high' if risk_score > 0.6 else ('medium' if risk_score > 0.3 else 'low'),
            'risk_factors': risk_factors
        })


class TrainModelView(APIView):
    """
    Train or retrain the fraud detection model.
    """
    permission_classes = [IsAdmin]
    
    def post(self, request):
        """Train the fraud detection model on historical data."""
        # Get training data
        transactions_qs = TransactionLog.objects.filter(
            transaction_type='spend'
        ).select_related('wallet').order_by('timestamp')[:10000]
        
        if transactions_qs.count() < 10:
            return Response({
                'error': 'Insufficient data for training. Need at least 10 transactions.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        transactions = [
            {
                'amount': float(t.amount),
                'category': t.category,
                'timestamp': t.timestamp,
                'beneficiary_id': str(t.wallet.user.id) if t.wallet else None,
                'is_flagged': t.is_flagged
            }
            for t in transactions_qs
        ]
        
        # Train model
        fraud_detector.train(transactions)
        
        return Response({
            'message': 'Model trained successfully',
            'transactions_used': len(transactions)
        })


class ModelStatusView(APIView):
    """
    Get status of the fraud detection model.
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        return Response({
            'is_fitted': fraud_detector.is_fitted,
            'feature_names': fraud_detector.feature_names,
            'contamination': fraud_detector.contamination
        })


class AnalyzeAllView(APIView):
    """
    Analyze all recent transactions for anomalies.
    """
    permission_classes = [IsAdmin]
    
    def post(self, request):
        """Analyze transactions and flag anomalies."""
        limit = int(request.data.get('limit', 100))
        
        transactions = TransactionLog.objects.filter(
            transaction_type='spend',
            is_flagged=False
        ).select_related('wallet').order_by('-timestamp')[:limit]
        
        flagged_count = 0
        results = []
        
        for tx in transactions:
            if tx.wallet:
                history_qs = TransactionLog.objects.filter(
                    wallet=tx.wallet,
                    timestamp__lt=tx.timestamp
                ).order_by('-timestamp')[:50]
                
                history = [
                    {
                        'amount': float(h.amount),
                        'category': h.category,
                        'timestamp': h.timestamp
                    }
                    for h in history_qs
                ]
            else:
                history = []
            
            transaction_data = {
                'amount': float(tx.amount),
                'category': tx.category,
                'timestamp': tx.timestamp
            }
            
            is_anomaly, fraud_score, reasons = fraud_detector.predict(transaction_data, history)
            
            if is_anomaly:
                tx.is_flagged = True
                tx.fraud_score = fraud_score
                tx.flag_reason = '; '.join(reasons)
                tx.save()
                flagged_count += 1
                
                results.append({
                    'transaction_id': str(tx.id),
                    'fraud_score': fraud_score,
                    'reasons': reasons
                })
        
        return Response({
            'analyzed': len(transactions),
            'flagged': flagged_count,
            'flagged_transactions': results
        })
