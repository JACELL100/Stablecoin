"""
Serializers for the transactions app.
"""
from rest_framework import serializers
from .models import TransactionLog, AuditEvent, SpendingAnalytics


class TransactionLogSerializer(serializers.ModelSerializer):
    """Serializer for transaction logs."""
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    campaign_name = serializers.SerializerMethodField()
    beneficiary_name = serializers.SerializerMethodField()
    merchant_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TransactionLog
        fields = [
            'id', 'transaction_type', 'transaction_type_display',
            'status', 'status_display',
            'tx_hash', 'block_number', 'chain_id',
            'from_address', 'to_address',
            'amount', 'category',
            'campaign_name', 'beneficiary_name', 'merchant_name',
            'reference', 'notes',
            'gas_used', 'gas_price',
            'is_flagged', 'flag_reason', 'fraud_score',
            'timestamp', 'confirmed_at'
        ]
        read_only_fields = fields
    
    def get_campaign_name(self, obj):
        if obj.allocation and obj.allocation.campaign:
            return obj.allocation.campaign.name
        return None
    
    def get_beneficiary_name(self, obj):
        if obj.wallet and obj.wallet.user:
            return obj.wallet.user.full_name or obj.wallet.user.email
        return None
    
    def get_merchant_name(self, obj):
        if obj.merchant:
            return obj.merchant.business_name
        return None


class TransactionLogPublicSerializer(serializers.ModelSerializer):
    """Public serializer for transaction logs (limited data)."""
    
    class Meta:
        model = TransactionLog
        fields = [
            'id', 'transaction_type', 'status',
            'tx_hash', 'block_number',
            'from_address', 'to_address',
            'amount', 'category',
            'timestamp'
        ]


class AuditEventSerializer(serializers.ModelSerializer):
    """Serializer for audit events."""
    actor_name = serializers.SerializerMethodField()
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    
    class Meta:
        model = AuditEvent
        fields = [
            'id', 'event_type',
            'actor', 'actor_name',
            'title', 'description',
            'campaign', 'campaign_name',
            'transaction', 'metadata',
            'timestamp'
        ]
        read_only_fields = fields
    
    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.full_name or obj.actor.email
        return 'System'


class SpendingAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for spending analytics."""
    total_spent = serializers.DecimalField(max_digits=20, decimal_places=6, read_only=True)
    campaign_name = serializers.CharField(source='campaign.name', read_only=True)
    
    class Meta:
        model = SpendingAnalytics
        fields = [
            'id', 'date', 'campaign', 'campaign_name',
            'food_spent', 'medical_spent', 'shelter_spent',
            'utilities_spent', 'transport_spent', 'total_spent',
            'transaction_count', 'unique_beneficiaries', 'unique_merchants',
            'flagged_transactions'
        ]
        read_only_fields = fields


class TransparencyDashboardSerializer(serializers.Serializer):
    """Serializer for the public transparency dashboard."""
    total_raised = serializers.DecimalField(max_digits=20, decimal_places=6)
    total_distributed = serializers.DecimalField(max_digits=20, decimal_places=6)
    total_spent = serializers.DecimalField(max_digits=20, decimal_places=6)
    
    active_campaigns = serializers.IntegerField()
    total_beneficiaries = serializers.IntegerField()
    total_merchants = serializers.IntegerField()
    
    spending_by_category = serializers.DictField()
    spending_over_time = serializers.ListField()
    recent_transactions = TransactionLogPublicSerializer(many=True)
    
    campaigns = serializers.ListField()


class ExportSerializer(serializers.Serializer):
    """Serializer for export options."""
    format = serializers.ChoiceField(choices=['csv', 'json'])
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    campaign_id = serializers.UUIDField(required=False)
    transaction_type = serializers.CharField(required=False)
