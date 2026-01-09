"""
Views for the accounts app.
"""
import logging
from datetime import timezone
from django.conf import settings
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone as dj_timezone

from core.blockchain import blockchain_service
from .models import User, Wallet, BeneficiaryProfile, ApprovedMerchant, UserRole, VerificationStatus
from .serializers import (
    UserSerializer, UserUpdateSerializer, WalletSerializer, WalletCreateSerializer,
    BeneficiaryProfileSerializer, ApprovedMerchantSerializer,
    BeneficiaryRegistrationSerializer, VerifyBeneficiarySerializer,
    GoogleAuthSerializer, ConnectWalletSerializer
)
from .permissions import IsAdmin, IsAdminOrReadOnly, IsOwnerOrAdmin

logger = logging.getLogger(__name__)


class GoogleAuthView(APIView):
    """
    Handle Google OAuth authentication via Supabase.
    
    POST: Validate the Supabase access token and return user data.
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # The actual authentication is handled by SupabaseAuthentication middleware
        # This endpoint is for explicit token validation
        
        # Here we would validate the token with Supabase
        # For the MVP, the token is validated in the authentication middleware
        
        return Response({
            'message': 'Authentication successful',
            'user': UserSerializer(request.user).data if request.user.is_authenticated else None
        })


class ConnectWalletView(APIView):
    """
    Connect a wallet to the authenticated user's account.
    
    POST: Verify wallet ownership and connect it.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ConnectWalletSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        address = serializer.validated_data['address']
        
        # Check if wallet already exists
        existing_wallet = Wallet.objects.filter(address__iexact=address).first()
        if existing_wallet:
            if existing_wallet.user == request.user:
                return Response({
                    'message': 'Wallet already connected to your account',
                    'wallet': WalletSerializer(existing_wallet).data
                })
            else:
                return Response({
                    'error': 'This wallet is connected to another account'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create new wallet
        is_first_wallet = not request.user.wallets.exists()
        wallet = Wallet.objects.create(
            user=request.user,
            address=address,
            is_primary=is_first_wallet
        )
        
        logger.info(f"Wallet {address} connected to user {request.user.email}")
        
        return Response({
            'message': 'Wallet connected successfully',
            'wallet': WalletSerializer(wallet).data
        }, status=status.HTTP_201_CREATED)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=user.id)
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current user's profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Update the current user's profile."""
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class WalletViewSet(viewsets.ModelViewSet):
    """
    ViewSet for wallet management.
    """
    serializer_class = WalletSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Wallet.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return WalletCreateSerializer
        return WalletSerializer
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """Set a wallet as the primary wallet."""
        wallet = self.get_object()
        wallet.is_primary = True
        wallet.save()
        return Response(WalletSerializer(wallet).data)


class BeneficiaryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for beneficiary management.
    """
    queryset = BeneficiaryProfile.objects.select_related('user').all()
    serializer_class = BeneficiaryProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return BeneficiaryProfile.objects.all()
        return BeneficiaryProfile.objects.filter(user=user)
    
    @action(detail=False, methods=['post'])
    def register(self, request):
        """Register the current user as a beneficiary."""
        if hasattr(request.user, 'beneficiary_profile'):
            return Response({
                'error': 'User is already registered as a beneficiary'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = BeneficiaryRegistrationSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Beneficiary registration successful',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAdmin])
    def verify(self, request):
        """Admin endpoint to verify or reject a beneficiary."""
        serializer = VerifyBeneficiarySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = User.objects.get(id=serializer.validated_data['user_id'])
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        user.verification_status = serializer.validated_data['status']
        user.verified_at = dj_timezone.now()
        user.verified_by = request.user
        user.save()
        
        tx_hash = None
        
        # If verified, whitelist the wallet on-chain
        if user.verification_status == VerificationStatus.VERIFIED:
            wallet = user.wallets.filter(is_primary=True).first()
            if wallet and hasattr(user, 'beneficiary_profile'):
                try:
                    tx_hash = blockchain_service.whitelist_beneficiary(
                        address=wallet.address,
                        name=user.full_name or 'Beneficiary',
                        region=user.beneficiary_profile.region
                    )
                    wallet.is_whitelisted = True
                    wallet.whitelisted_at = dj_timezone.now()
                    wallet.save()
                    logger.info(f"Beneficiary {user.email} whitelisted on-chain, tx: {tx_hash}")
                except Exception as e:
                    logger.warning(f"Failed to whitelist on-chain: {e}")
            
            logger.info(f"Beneficiary {user.email} verified by {request.user.email}")
        
        return Response({
            'message': f'Beneficiary {user.verification_status}',
            'user': UserSerializer(user).data,
            'tx_hash': tx_hash
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdmin])
    def pending(self, request):
        """Get all pending beneficiary verifications."""
        pending_users = User.objects.filter(
            role=UserRole.BENEFICIARY,
            verification_status=VerificationStatus.PENDING
        ).select_related('beneficiary_profile')
        
        return Response(UserSerializer(pending_users, many=True).data)
    
    @action(detail=True, methods=['get'])
    def spending(self, request, pk=None):
        """Get spending history for a beneficiary."""
        profile = self.get_object()
        
        # Get transactions from transactions app
        from transactions.models import TransactionLog
        transactions = TransactionLog.objects.filter(
            wallet__user=profile.user
        ).order_by('-timestamp')[:50]
        
        from transactions.serializers import TransactionLogSerializer
        return Response(TransactionLogSerializer(transactions, many=True).data)


class ApprovedMerchantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing approved merchant addresses.
    Admins can add/remove approved merchants where beneficiaries can spend.
    """
    queryset = ApprovedMerchant.objects.all()
    serializer_class = ApprovedMerchantSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(approved_by=self.request.user)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def register_on_chain(self, request, pk=None):
        """Register a merchant on the blockchain."""
        merchant = self.get_object()
        
        tx_hash = None
        try:
            tx_hash = blockchain_service.register_merchant(
                address=merchant.wallet_address,
                name=merchant.business_name,
                category=merchant.category,
                location=merchant.business_address
            )
            logger.info(f"Merchant {merchant.business_name} registered on-chain, tx: {tx_hash}")
        except Exception as e:
            logger.warning(f"Failed to register merchant on-chain: {e}")
        
        merchant.is_registered_on_chain = True
        merchant.registered_on_chain_at = dj_timezone.now()
        merchant.save()
        
        return Response({
            'message': 'Merchant registered on blockchain',
            'merchant': ApprovedMerchantSerializer(merchant).data,
            'tx_hash': tx_hash
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def toggle_active(self, request, pk=None):
        """Enable/disable a merchant."""
        merchant = self.get_object()
        merchant.is_active = not merchant.is_active
        merchant.save()
        
        status_text = 'activated' if merchant.is_active else 'deactivated'
        return Response({
            'message': f'Merchant {status_text}',
            'merchant': ApprovedMerchantSerializer(merchant).data
        })


class AdminStatsView(APIView):
    """
    Admin dashboard statistics.
    """
    permission_classes = [IsAdmin]
    
    def get(self, request):
        from campaigns.models import AidCampaign
        from transactions.models import TransactionLog
        from django.db.models import Sum, Count
        
        stats = {
            'users': {
                'total': User.objects.count(),
                'admins': User.objects.filter(role=UserRole.ADMIN).count(),
                'donors': User.objects.filter(role=UserRole.DONOR).count(),
                'beneficiaries': User.objects.filter(role=UserRole.BENEFICIARY).count(),
                'auditors': User.objects.filter(role=UserRole.AUDITOR).count(),
            },
            'beneficiaries': {
                'total': BeneficiaryProfile.objects.count(),
                'pending_verification': User.objects.filter(
                    role=UserRole.BENEFICIARY,
                    verification_status=VerificationStatus.PENDING
                ).count(),
                'verified': User.objects.filter(
                    role=UserRole.BENEFICIARY,
                    verification_status=VerificationStatus.VERIFIED
                ).count(),
            },
            'wallets': {
                'total': Wallet.objects.count(),
                'whitelisted': Wallet.objects.filter(is_whitelisted=True).count(),
            },
            'merchants': {
                'total': ApprovedMerchant.objects.count(),
                'active': ApprovedMerchant.objects.filter(is_active=True).count(),
                'on_chain': ApprovedMerchant.objects.filter(is_registered_on_chain=True).count(),
            },
            'campaigns': {
                'total': AidCampaign.objects.count(),
                'active': AidCampaign.objects.filter(status='active').count(),
            }
        }
        
        return Response(stats)
