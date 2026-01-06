"""
Serializers for the campaigns app.
"""
from rest_framework import serializers
from .models import AidCampaign, FundAllocation, CategorySpendingLimit, Donation, SpendingCategory


class CategorySpendingLimitSerializer(serializers.ModelSerializer):
    """Serializer for spending limits."""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = CategorySpendingLimit
        fields = [
            'id', 'category', 'category_display',
            'max_per_transaction', 'max_daily', 'max_total'
        ]


class FundAllocationSerializer(serializers.ModelSerializer):
    """Serializer for fund allocations."""
    beneficiary_name = serializers.CharField(source='beneficiary.user.full_name', read_only=True)
    beneficiary_email = serializers.CharField(source='beneficiary.user.email', read_only=True)
    wallet_address = serializers.CharField(source='wallet.address', read_only=True)
    
    class Meta:
        model = FundAllocation
        fields = [
            'id', 'campaign', 'beneficiary', 'beneficiary_name', 'beneficiary_email',
            'wallet', 'wallet_address', 'total_amount', 'distributed_amount',
            'food_allowance', 'medical_allowance', 'shelter_allowance',
            'utilities_allowance', 'transport_allowance',
            'is_active', 'notes', 'allocated_at', 'distributed_at', 'distribution_tx_hash'
        ]
        read_only_fields = ['id', 'distributed_at', 'distribution_tx_hash']


class FundAllocationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating fund allocations."""
    
    class Meta:
        model = FundAllocation
        fields = [
            'campaign', 'beneficiary', 'wallet', 'total_amount',
            'food_allowance', 'medical_allowance', 'shelter_allowance',
            'utilities_allowance', 'transport_allowance', 'notes'
        ]
    
    def validate(self, data):
        # Ensure allowances don't exceed total
        total_allowances = (
            data.get('food_allowance', 0) +
            data.get('medical_allowance', 0) +
            data.get('shelter_allowance', 0) +
            data.get('utilities_allowance', 0) +
            data.get('transport_allowance', 0)
        )
        if total_allowances > data['total_amount']:
            raise serializers.ValidationError(
                "Total category allowances cannot exceed the total allocation amount"
            )
        return data


class DonationSerializer(serializers.ModelSerializer):
    """Serializer for donations."""
    donor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Donation
        fields = [
            'id', 'campaign', 'donor', 'donor_name', 'amount', 'currency',
            'is_anonymous', 'message', 'donated_at'
        ]
        read_only_fields = ['id', 'donated_at']
    
    def get_donor_name(self, obj):
        if obj.is_anonymous:
            return "Anonymous"
        return obj.donor.full_name if obj.donor else "Unknown"


class AidCampaignSerializer(serializers.ModelSerializer):
    """Serializer for aid campaigns."""
    disaster_type_display = serializers.CharField(source='get_disaster_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    progress_percentage = serializers.FloatField(read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=20, decimal_places=6, read_only=True)
    beneficiary_count = serializers.SerializerMethodField()
    spending_limits = CategorySpendingLimitSerializer(many=True, read_only=True)
    
    class Meta:
        model = AidCampaign
        fields = [
            'id', 'name', 'description', 'region', 
            'disaster_type', 'disaster_type_display',
            'status', 'status_display',
            'target_amount', 'raised_amount', 'distributed_amount', 'spent_amount',
            'progress_percentage', 'remaining_amount',
            'start_date', 'end_date',
            'created_by', 'created_by_name',
            'on_chain_id', 'image_url', 'metadata_uri',
            'beneficiary_count', 'spending_limits',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'raised_amount', 'distributed_amount', 'spent_amount',
            'on_chain_id', 'created_at', 'updated_at'
        ]
    
    def get_beneficiary_count(self, obj):
        return obj.allocations.count()


class AidCampaignCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating campaigns."""
    spending_limits = CategorySpendingLimitSerializer(many=True, required=False)
    
    class Meta:
        model = AidCampaign
        fields = [
            'name', 'description', 'region', 'disaster_type',
            'target_amount', 'start_date', 'end_date',
            'image_url', 'metadata_uri', 'spending_limits'
        ]
    
    def validate(self, data):
        if data['end_date'] <= data['start_date']:
            raise serializers.ValidationError("End date must be after start date")
        return data
    
    def create(self, validated_data):
        spending_limits_data = validated_data.pop('spending_limits', [])
        validated_data['created_by'] = self.context['request'].user
        
        campaign = AidCampaign.objects.create(**validated_data)
        
        # Create spending limits
        for limit_data in spending_limits_data:
            CategorySpendingLimit.objects.create(campaign=campaign, **limit_data)
        
        return campaign


class CampaignStatsSerializer(serializers.Serializer):
    """Serializer for campaign statistics."""
    total_raised = serializers.DecimalField(max_digits=20, decimal_places=6)
    total_distributed = serializers.DecimalField(max_digits=20, decimal_places=6)
    total_spent = serializers.DecimalField(max_digits=20, decimal_places=6)
    beneficiary_count = serializers.IntegerField()
    spending_by_category = serializers.DictField()
    recent_transactions = serializers.ListField()


class MintFundsSerializer(serializers.Serializer):
    """Serializer for minting relief funds."""
    amount = serializers.DecimalField(max_digits=20, decimal_places=6)
    purpose = serializers.CharField(max_length=255)


class DistributeFundsSerializer(serializers.Serializer):
    """Serializer for distributing funds to a beneficiary."""
    beneficiary_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=20, decimal_places=6)
    food_allowance = serializers.DecimalField(max_digits=20, decimal_places=6, default=0)
    medical_allowance = serializers.DecimalField(max_digits=20, decimal_places=6, default=0)
    shelter_allowance = serializers.DecimalField(max_digits=20, decimal_places=6, default=0)
    utilities_allowance = serializers.DecimalField(max_digits=20, decimal_places=6, default=0)
    transport_allowance = serializers.DecimalField(max_digits=20, decimal_places=6, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)
