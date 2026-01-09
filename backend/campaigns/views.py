"""
Views for the campaigns app.
"""
import logging
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsAdminOrReadOnly
from accounts.models import BeneficiaryProfile, Wallet, VerificationStatus
from core.blockchain import blockchain_service
from .models import (
    AidCampaign, FundAllocation, CategorySpendingLimit, Donation,
    CampaignStatus, SpendingCategory
)
from .serializers import (
    AidCampaignSerializer, AidCampaignCreateSerializer,
    FundAllocationSerializer, FundAllocationCreateSerializer,
    CategorySpendingLimitSerializer, DonationSerializer,
    CampaignStatsSerializer, MintFundsSerializer, DistributeFundsSerializer
)

logger = logging.getLogger(__name__)


class AidCampaignViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing aid campaigns.
    
    Provides CRUD operations and campaign-specific actions like minting and distribution.
    """
    queryset = AidCampaign.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AidCampaignCreateSerializer
        return AidCampaignSerializer
    
    def get_queryset(self):
        queryset = AidCampaign.objects.prefetch_related('spending_limits', 'allocations')
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by disaster type
        disaster_type = self.request.query_params.get('disaster_type')
        if disaster_type:
            queryset = queryset.filter(disaster_type=disaster_type)
        
        # Filter by region
        region = self.request.query_params.get('region')
        if region:
            queryset = queryset.filter(region__icontains=region)
        
        return queryset
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def activate(self, request, pk=None):
        """Activate a campaign."""
        campaign = self.get_object()
        campaign.status = CampaignStatus.ACTIVE
        campaign.save()
        
        # TODO: Activate on blockchain
        
        return Response({
            'message': 'Campaign activated successfully',
            'campaign': AidCampaignSerializer(campaign).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def pause(self, request, pk=None):
        """Pause a campaign."""
        campaign = self.get_object()
        campaign.status = CampaignStatus.PAUSED
        campaign.save()
        
        return Response({
            'message': 'Campaign paused',
            'campaign': AidCampaignSerializer(campaign).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def complete(self, request, pk=None):
        """Mark a campaign as completed."""
        campaign = self.get_object()
        campaign.status = CampaignStatus.COMPLETED
        campaign.save()
        
        return Response({
            'message': 'Campaign completed',
            'campaign': AidCampaignSerializer(campaign).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def mint_funds(self, request, pk=None):
        """
        Mint relief stablecoins for a campaign.
        
        This triggers the on-chain minting process.
        """
        campaign = self.get_object()
        serializer = MintFundsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        amount = Decimal(str(serializer.validated_data['amount']))
        purpose = serializer.validated_data['purpose']
        
        tx_hash = None
        
        # Call blockchain service to mint tokens
        try:
            # Mint to admin wallet (will be distributed later)
            admin_wallet = request.user.wallets.filter(is_primary=True).first()
            if admin_wallet:
                tx_hash = blockchain_service.mint_tokens(
                    to_address=admin_wallet.address,
                    amount=amount,
                    campaign_id=str(campaign.id),
                    purpose=purpose
                )
                logger.info(f"Minted {amount} drUSD on-chain, tx: {tx_hash}")
        except Exception as e:
            logger.warning(f"Blockchain minting failed (continuing off-chain): {e}")
        
        # Update campaign regardless of blockchain result
        campaign.raised_amount += amount
        campaign.save()
        
        logger.info(f"Minted {amount} drUSD for campaign {campaign.name}")
        
        return Response({
            'message': f'Minted {amount} drUSD for campaign',
            'campaign': AidCampaignSerializer(campaign).data,
            'tx_hash': tx_hash
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def distribute(self, request, pk=None):
        """
        Distribute funds to a beneficiary.
        This whitelists them on-chain (if not already) and transfers tokens.
        """
        campaign = self.get_object()
        serializer = DistributeFundsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        beneficiary_id = serializer.validated_data['beneficiary_id']
        amount = Decimal(str(serializer.validated_data['amount']))
        
        # Get beneficiary and wallet
        try:
            beneficiary = BeneficiaryProfile.objects.get(id=beneficiary_id)
        except BeneficiaryProfile.DoesNotExist:
            return Response({'error': 'Beneficiary not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if beneficiary is verified
        if beneficiary.user.verification_status != VerificationStatus.VERIFIED:
            return Response({
                'error': 'Beneficiary must be verified before receiving funds'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        wallet = beneficiary.user.wallets.filter(is_primary=True).first()
        if not wallet:
            return Response({'error': 'Beneficiary has no wallet'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check available funds
        if amount > campaign.remaining_amount:
            return Response({
                'error': f'Insufficient funds. Available: {campaign.remaining_amount}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        tx_hash = None
        whitelist_tx = None
        allowance_tx = None
        
        # Blockchain operations
        try:
            # 1. Whitelist beneficiary if not already
            if not wallet.is_whitelisted:
                try:
                    is_on_chain_whitelisted = blockchain_service.is_whitelisted(wallet.address)
                    if not is_on_chain_whitelisted:
                        whitelist_tx = blockchain_service.whitelist_beneficiary(
                            address=wallet.address,
                            name=beneficiary.user.full_name or 'Beneficiary',
                            region=beneficiary.region
                        )
                        logger.info(f"Whitelisted beneficiary on-chain: {whitelist_tx}")
                    
                    wallet.is_whitelisted = True
                    wallet.whitelisted_at = timezone.now()
                    wallet.save()
                except Exception as e:
                    logger.warning(f"On-chain whitelist check/set failed: {e}")
            
            # 2. Transfer funds
            try:
                tx_hash = blockchain_service.distribute_funds(
                    to_address=wallet.address,
                    amount=amount
                )
                logger.info(f"Distributed funds on-chain: {tx_hash}")
            except Exception as e:
                logger.warning(f"On-chain distribution failed: {e}")
            
            # 3. Set spending allowances by category
            food = Decimal(str(serializer.validated_data.get('food_allowance', 0)))
            medical = Decimal(str(serializer.validated_data.get('medical_allowance', 0)))
            shelter = Decimal(str(serializer.validated_data.get('shelter_allowance', 0)))
            utilities = Decimal(str(serializer.validated_data.get('utilities_allowance', 0)))
            transport = Decimal(str(serializer.validated_data.get('transport_allowance', 0)))
            
            if food or medical or shelter or utilities or transport:
                try:
                    allowance_tx = blockchain_service.set_beneficiary_allowances(
                        address=wallet.address,
                        food=food,
                        medical=medical,
                        shelter=shelter,
                        utilities=utilities,
                        transport=transport
                    )
                    logger.info(f"Set allowances on-chain: {allowance_tx}")
                except Exception as e:
                    logger.warning(f"On-chain allowance setting failed: {e}")
                    
        except Exception as e:
            logger.error(f"Blockchain operations failed: {e}")
        
        # Create or update allocation (database)
        allocation, created = FundAllocation.objects.get_or_create(
            campaign=campaign,
            beneficiary=beneficiary,
            defaults={
                'wallet': wallet,
                'total_amount': amount,
                'food_allowance': serializer.validated_data.get('food_allowance', 0),
                'medical_allowance': serializer.validated_data.get('medical_allowance', 0),
                'shelter_allowance': serializer.validated_data.get('shelter_allowance', 0),
                'utilities_allowance': serializer.validated_data.get('utilities_allowance', 0),
                'transport_allowance': serializer.validated_data.get('transport_allowance', 0),
                'notes': serializer.validated_data.get('notes', '')
            }
        )
        
        if not created:
            allocation.total_amount += amount
            allocation.food_allowance += Decimal(str(serializer.validated_data.get('food_allowance', 0)))
            allocation.medical_allowance += Decimal(str(serializer.validated_data.get('medical_allowance', 0)))
            allocation.shelter_allowance += Decimal(str(serializer.validated_data.get('shelter_allowance', 0)))
            allocation.utilities_allowance += Decimal(str(serializer.validated_data.get('utilities_allowance', 0)))
            allocation.transport_allowance += Decimal(str(serializer.validated_data.get('transport_allowance', 0)))
            allocation.save()
        
        allocation.distributed_amount = allocation.total_amount
        allocation.distributed_at = timezone.now()
        allocation.distribution_tx_hash = tx_hash or ''
        allocation.save()
        
        # Update campaign
        campaign.distributed_amount += amount
        campaign.save()
        
        logger.info(f"Distributed {amount} drUSD to {beneficiary.user.email}")
        
        return Response({
            'message': f'Distributed {amount} drUSD to beneficiary',
            'allocation': FundAllocationSerializer(allocation).data,
            'tx_hash': tx_hash,
            'whitelist_tx': whitelist_tx,
            'allowance_tx': allowance_tx
        })
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get detailed statistics for a campaign."""
        campaign = self.get_object()
        
        # Get spending by category
        from transactions.models import TransactionLog
        
        spending_by_category = {}
        for category in SpendingCategory.choices:
            total = TransactionLog.objects.filter(
                allocation__campaign=campaign,
                category=category[0],
                transaction_type='spend'
            ).aggregate(total=Sum('amount'))['total'] or 0
            spending_by_category[category[0]] = float(total)
        
        # Get recent transactions
        recent_txs = TransactionLog.objects.filter(
            allocation__campaign=campaign
        ).order_by('-timestamp')[:10]
        
        from transactions.serializers import TransactionLogSerializer
        
        return Response({
            'campaign_id': str(campaign.id),
            'total_raised': float(campaign.raised_amount),
            'total_distributed': float(campaign.distributed_amount),
            'total_spent': float(campaign.spent_amount),
            'beneficiary_count': campaign.allocations.count(),
            'spending_by_category': spending_by_category,
            'recent_transactions': TransactionLogSerializer(recent_txs, many=True).data
        })
    
    @action(detail=True, methods=['get'])
    def beneficiaries(self, request, pk=None):
        """Get all beneficiaries for a campaign."""
        campaign = self.get_object()
        allocations = campaign.allocations.select_related(
            'beneficiary', 'beneficiary__user', 'wallet'
        )
        return Response(FundAllocationSerializer(allocations, many=True).data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request):
        """Get public campaign data for the transparency dashboard."""
        campaigns = AidCampaign.objects.filter(
            status__in=[CampaignStatus.ACTIVE, CampaignStatus.COMPLETED]
        )
        
        return Response(AidCampaignSerializer(campaigns, many=True).data)


class FundAllocationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing fund allocations.
    """
    queryset = FundAllocation.objects.select_related(
        'campaign', 'beneficiary', 'beneficiary__user', 'wallet'
    )
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return FundAllocationCreateSerializer
        return FundAllocationSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by campaign
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        
        # Filter by beneficiary
        beneficiary_id = self.request.query_params.get('beneficiary')
        if beneficiary_id:
            queryset = queryset.filter(beneficiary_id=beneficiary_id)
        
        return queryset


class DonationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing donations.
    """
    queryset = Donation.objects.select_related('campaign', 'donor')
    serializer_class = DonationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by campaign
        campaign_id = self.request.query_params.get('campaign')
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(donor=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.AllowAny])
    def public(self, request):
        """Get public donation data (anonymized)."""
        campaign_id = request.query_params.get('campaign')
        
        queryset = self.get_queryset()
        if campaign_id:
            queryset = queryset.filter(campaign_id=campaign_id)
        
        # Anonymize donor info
        donations = []
        for d in queryset[:50]:
            donations.append({
                'amount': float(d.amount),
                'currency': d.currency,
                'donor': 'Anonymous' if d.is_anonymous else (d.donor.full_name[:1] + '***' if d.donor else 'Unknown'),
                'message': d.message,
                'donated_at': d.donated_at.isoformat()
            })
        
        return Response(donations)
