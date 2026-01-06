"""
Serializers for the accounts app.
"""
from rest_framework import serializers
from .models import User, Wallet, BeneficiaryProfile, MerchantProfile, UserRole, VerificationStatus


class WalletSerializer(serializers.ModelSerializer):
    """Serializer for wallet data."""
    
    class Meta:
        model = Wallet
        fields = [
            'id', 'address', 'is_primary', 'is_whitelisted',
            'whitelisted_at', 'on_chain_balance', 'created_at'
        ]
        read_only_fields = ['id', 'is_whitelisted', 'whitelisted_at', 'on_chain_balance', 'created_at']


class WalletCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new wallet."""
    signature = serializers.CharField(write_only=True, required=False)
    message = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Wallet
        fields = ['address', 'is_primary', 'signature', 'message']
    
    def validate_address(self, value):
        """Validate Ethereum address format."""
        if not value.startswith('0x') or len(value) != 42:
            raise serializers.ValidationError("Invalid Ethereum address format")
        return value.lower()  # Normalize to lowercase
    
    def create(self, validated_data):
        validated_data.pop('signature', None)
        validated_data.pop('message', None)
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BeneficiaryProfileSerializer(serializers.ModelSerializer):
    """Serializer for beneficiary profile data."""
    
    class Meta:
        model = BeneficiaryProfile
        fields = [
            'id', 'region', 'address', 'coordinates',
            'household_size', 'has_children', 'has_elderly', 'has_disabled',
            'needs_food', 'needs_medical', 'needs_shelter', 'special_needs',
            'risk_score', 'created_at'
        ]
        read_only_fields = ['id', 'risk_score', 'created_at']


class MerchantProfileSerializer(serializers.ModelSerializer):
    """Serializer for merchant profile data."""
    
    class Meta:
        model = MerchantProfile
        fields = [
            'id', 'business_name', 'category', 'business_address',
            'business_license', 'is_registered_on_chain', 'total_received',
            'transaction_count', 'created_at'
        ]
        read_only_fields = ['id', 'is_registered_on_chain', 'total_received', 'transaction_count', 'created_at']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user data."""
    wallets = WalletSerializer(many=True, read_only=True)
    beneficiary_profile = BeneficiaryProfileSerializer(read_only=True)
    merchant_profile = MerchantProfileSerializer(read_only=True)
    primary_wallet = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'full_name', 'phone_number', 'organization',
            'avatar_url', 'role', 'verification_status', 'verified_at',
            'wallets', 'primary_wallet', 'beneficiary_profile', 'merchant_profile',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'email', 'verification_status', 'verified_at', 'created_at', 'updated_at']
    
    def get_primary_wallet(self, obj):
        wallet = obj.wallets.filter(is_primary=True).first()
        return WalletSerializer(wallet).data if wallet else None


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""
    
    class Meta:
        model = User
        fields = ['full_name', 'phone_number', 'organization', 'avatar_url']


class BeneficiaryRegistrationSerializer(serializers.Serializer):
    """Serializer for beneficiary registration."""
    # User info
    full_name = serializers.CharField(max_length=255)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Wallet
    wallet_address = serializers.CharField(max_length=42)
    
    # Beneficiary profile
    region = serializers.CharField(max_length=255)
    address = serializers.CharField(required=False, allow_blank=True)
    household_size = serializers.IntegerField(min_value=1, default=1)
    has_children = serializers.BooleanField(default=False)
    has_elderly = serializers.BooleanField(default=False)
    has_disabled = serializers.BooleanField(default=False)
    needs_food = serializers.BooleanField(default=True)
    needs_medical = serializers.BooleanField(default=False)
    needs_shelter = serializers.BooleanField(default=False)
    special_needs = serializers.CharField(required=False, allow_blank=True)
    
    def validate_wallet_address(self, value):
        if not value.startswith('0x') or len(value) != 42:
            raise serializers.ValidationError("Invalid Ethereum address format")
        if Wallet.objects.filter(address__iexact=value).exists():
            raise serializers.ValidationError("This wallet is already registered")
        return value.lower()
    
    def create(self, validated_data):
        user = self.context['request'].user
        
        # Update user info
        user.full_name = validated_data['full_name']
        user.phone_number = validated_data.get('phone_number', '')
        user.role = UserRole.BENEFICIARY
        user.save()
        
        # Create wallet
        wallet = Wallet.objects.create(
            user=user,
            address=validated_data['wallet_address'],
            is_primary=True
        )
        
        # Create beneficiary profile
        profile = BeneficiaryProfile.objects.create(
            user=user,
            region=validated_data['region'],
            address=validated_data.get('address', ''),
            household_size=validated_data['household_size'],
            has_children=validated_data['has_children'],
            has_elderly=validated_data['has_elderly'],
            has_disabled=validated_data['has_disabled'],
            needs_food=validated_data['needs_food'],
            needs_medical=validated_data['needs_medical'],
            needs_shelter=validated_data['needs_shelter'],
            special_needs=validated_data.get('special_needs', '')
        )
        
        return user


class VerifyBeneficiarySerializer(serializers.Serializer):
    """Serializer for admin verification of beneficiaries."""
    user_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=[
        (VerificationStatus.VERIFIED, 'Verified'),
        (VerificationStatus.REJECTED, 'Rejected')
    ])
    notes = serializers.CharField(required=False, allow_blank=True)


class GoogleAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth authentication."""
    access_token = serializers.CharField()
    

class ConnectWalletSerializer(serializers.Serializer):
    """Serializer for connecting a wallet to an account."""
    address = serializers.CharField(max_length=42)
    signature = serializers.CharField()
    message = serializers.CharField()
    
    def validate_address(self, value):
        if not value.startswith('0x') or len(value) != 42:
            raise serializers.ValidationError("Invalid Ethereum address format")
        return value.lower()
    
    def validate(self, data):
        """Verify the wallet signature."""
        try:
            from eth_account.messages import encode_defunct
            from eth_account import Account
            
            message_hash = encode_defunct(text=data['message'])
            recovered_address = Account.recover_message(message_hash, signature=data['signature'])
            
            if recovered_address.lower() != data['address'].lower():
                raise serializers.ValidationError("Invalid wallet signature")
        except Exception as e:
            raise serializers.ValidationError(f"Signature verification failed: {str(e)}")
        
        return data
