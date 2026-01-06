"""
Models for the transactions app.

Tracks all on-chain and off-chain transactions for audit purposes.
"""
from django.db import models
from django.conf import settings
import uuid


class TransactionType(models.TextChoices):
    """Types of transactions in the system."""
    MINT = 'mint', 'Fund Minting'
    DISTRIBUTE = 'distribute', 'Fund Distribution'
    SPEND = 'spend', 'Beneficiary Spending'
    TRANSFER = 'transfer', 'Token Transfer'
    REFUND = 'refund', 'Refund'


class TransactionStatus(models.TextChoices):
    """Status of a transaction."""
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    FAILED = 'failed', 'Failed'


class TransactionLog(models.Model):
    """
    Comprehensive transaction log for audit trail.
    
    Records all token movements with full context for transparency.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Transaction type and status
    transaction_type = models.CharField(max_length=20, choices=TransactionType.choices)
    status = models.CharField(
        max_length=20, 
        choices=TransactionStatus.choices,
        default=TransactionStatus.PENDING
    )
    
    # Blockchain data
    tx_hash = models.CharField(max_length=66, unique=True, null=True, blank=True)
    block_number = models.PositiveBigIntegerField(null=True, blank=True)
    chain_id = models.PositiveIntegerField(default=11155111)  # Sepolia by default
    
    # Addresses
    from_address = models.CharField(max_length=42)
    to_address = models.CharField(max_length=42)
    
    # Amount and category
    amount = models.DecimalField(max_digits=30, decimal_places=6)
    category = models.CharField(max_length=20, blank=True)
    
    # Related objects
    wallet = models.ForeignKey(
        'accounts.Wallet',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    allocation = models.ForeignKey(
        'campaigns.FundAllocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    
    # Merchant info (for spend transactions)
    merchant = models.ForeignKey(
        'accounts.MerchantProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_transactions'
    )
    
    # Additional context
    reference = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Gas info
    gas_used = models.PositiveBigIntegerField(null=True, blank=True)
    gas_price = models.PositiveBigIntegerField(null=True, blank=True)
    
    # Anomaly detection
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True)
    fraud_score = models.FloatField(default=0.0)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Transaction Log'
        verbose_name_plural = 'Transaction Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['tx_hash']),
            models.Index(fields=['from_address']),
            models.Index(fields=['to_address']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['is_flagged']),
        ]
    
    def __str__(self):
        return f"{self.transaction_type}: {self.amount} drUSD ({self.status})"


class BlockchainSync(models.Model):
    """
    Tracks blockchain synchronization state.
    
    Used to resume syncing from the last processed block.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    chain_id = models.PositiveIntegerField()
    contract_address = models.CharField(max_length=42)
    last_synced_block = models.PositiveBigIntegerField(default=0)
    last_synced_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['chain_id', 'contract_address']
    
    def __str__(self):
        return f"Chain {self.chain_id} - Block {self.last_synced_block}"


class AuditEvent(models.Model):
    """
    High-level audit events for the transparency dashboard.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    event_type = models.CharField(max_length=50)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Event details
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    # Related campaign
    campaign = models.ForeignKey(
        'campaigns.AidCampaign',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events'
    )
    
    # Related transaction
    transaction = models.ForeignKey(
        TransactionLog,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events'
    )
    
    # Additional data
    metadata = models.JSONField(default=dict, blank=True)
    
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.event_type}: {self.title}"


class SpendingAnalytics(models.Model):
    """
    Aggregated spending analytics for dashboards.
    
    Pre-computed for performance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Aggregation level
    date = models.DateField()
    campaign = models.ForeignKey(
        'campaigns.AidCampaign',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='analytics'
    )
    
    # Totals by category
    food_spent = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    medical_spent = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    shelter_spent = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    utilities_spent = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    transport_spent = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    
    # Counts
    transaction_count = models.PositiveIntegerField(default=0)
    unique_beneficiaries = models.PositiveIntegerField(default=0)
    unique_merchants = models.PositiveIntegerField(default=0)
    
    # Anomaly stats
    flagged_transactions = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['date', 'campaign']
        ordering = ['-date']
    
    def __str__(self):
        return f"Analytics for {self.date}"
    
    @property
    def total_spent(self):
        return (
            self.food_spent + self.medical_spent + self.shelter_spent +
            self.utilities_spent + self.transport_spent
        )
