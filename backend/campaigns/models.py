"""
Models for the campaigns app.

Defines aid campaigns, fund allocations, and spending categories.
"""
from django.db import models
from django.conf import settings
import uuid


class DisasterType(models.TextChoices):
    """Types of disasters for campaign categorization."""
    EARTHQUAKE = 'earthquake', 'Earthquake'
    FLOOD = 'flood', 'Flood'
    HURRICANE = 'hurricane', 'Hurricane'
    WILDFIRE = 'wildfire', 'Wildfire'
    PANDEMIC = 'pandemic', 'Pandemic'
    CONFLICT = 'conflict', 'Conflict'
    DROUGHT = 'drought', 'Drought'
    OTHER = 'other', 'Other'


class CampaignStatus(models.TextChoices):
    """Status of an aid campaign."""
    DRAFT = 'draft', 'Draft'
    ACTIVE = 'active', 'Active'
    PAUSED = 'paused', 'Paused'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'


class SpendingCategory(models.TextChoices):
    """Categories for controlled spending."""
    FOOD = 'food', 'Food & Groceries'
    MEDICAL = 'medical', 'Medical & Healthcare'
    SHELTER = 'shelter', 'Shelter & Housing'
    UTILITIES = 'utilities', 'Utilities'
    TRANSPORT = 'transport', 'Transportation'


class AidCampaign(models.Model):
    """
    Represents a disaster relief campaign.
    
    Tracks the full lifecycle of a relief effort from creation to completion.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic info
    name = models.CharField(max_length=255)
    description = models.TextField()
    region = models.CharField(max_length=255, help_text="Affected geographic region")
    disaster_type = models.CharField(max_length=20, choices=DisasterType.choices)
    status = models.CharField(max_length=20, choices=CampaignStatus.choices, default=CampaignStatus.DRAFT)
    
    # Financial targets
    target_amount = models.DecimalField(
        max_digits=20, 
        decimal_places=6,
        help_text="Target amount in drUSD"
    )
    raised_amount = models.DecimalField(
        max_digits=20, 
        decimal_places=6, 
        default=0,
        help_text="Total amount raised/minted"
    )
    distributed_amount = models.DecimalField(
        max_digits=20, 
        decimal_places=6, 
        default=0,
        help_text="Amount distributed to beneficiaries"
    )
    spent_amount = models.DecimalField(
        max_digits=20, 
        decimal_places=6, 
        default=0,
        help_text="Amount spent by beneficiaries"
    )
    
    # Dates
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    
    # Management
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_campaigns'
    )
    
    # On-chain reference
    on_chain_id = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Campaign ID on the blockchain"
    )
    
    # Media and docs
    image_url = models.URLField(blank=True)
    metadata_uri = models.URLField(blank=True, help_text="IPFS URI for additional metadata")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Aid Campaign'
        verbose_name_plural = 'Aid Campaigns'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.region} ({self.status})"
    
    @property
    def progress_percentage(self):
        if self.target_amount == 0:
            return 0
        return round((self.raised_amount / self.target_amount) * 100, 2)
    
    @property
    def remaining_amount(self):
        return self.raised_amount - self.distributed_amount


class FundAllocation(models.Model):
    """
    Tracks fund allocations from campaigns to beneficiaries.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    campaign = models.ForeignKey(
        AidCampaign,
        on_delete=models.CASCADE,
        related_name='allocations'
    )
    beneficiary = models.ForeignKey(
        'accounts.BeneficiaryProfile',
        on_delete=models.CASCADE,
        related_name='allocations'
    )
    wallet = models.ForeignKey(
        'accounts.Wallet',
        on_delete=models.CASCADE,
        related_name='allocations'
    )
    
    # Allocation details
    total_amount = models.DecimalField(max_digits=20, decimal_places=6)
    distributed_amount = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    
    # Category allowances (in drUSD)
    food_allowance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    medical_allowance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    shelter_allowance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    utilities_allowance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    transport_allowance = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    # Timestamps
    allocated_at = models.DateTimeField(auto_now_add=True)
    distributed_at = models.DateTimeField(null=True, blank=True)
    
    # On-chain reference
    distribution_tx_hash = models.CharField(max_length=66, blank=True)
    
    class Meta:
        verbose_name = 'Fund Allocation'
        verbose_name_plural = 'Fund Allocations'
        unique_together = ['campaign', 'beneficiary']
    
    def __str__(self):
        return f"{self.campaign.name} -> {self.beneficiary.user.email}: {self.total_amount} drUSD"


class CategorySpendingLimit(models.Model):
    """
    Defines default spending limits by category for campaigns.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    campaign = models.ForeignKey(
        AidCampaign,
        on_delete=models.CASCADE,
        related_name='spending_limits'
    )
    category = models.CharField(max_length=20, choices=SpendingCategory.choices)
    
    # Limits
    max_per_transaction = models.DecimalField(max_digits=20, decimal_places=6)
    max_daily = models.DecimalField(max_digits=20, decimal_places=6)
    max_total = models.DecimalField(max_digits=20, decimal_places=6)
    
    class Meta:
        unique_together = ['campaign', 'category']
    
    def __str__(self):
        return f"{self.campaign.name} - {self.category}: max {self.max_total}"


class Donation(models.Model):
    """
    Tracks donations to campaigns (for traditional fiat donations).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    campaign = models.ForeignKey(
        AidCampaign,
        on_delete=models.CASCADE,
        related_name='donations'
    )
    donor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='donations'
    )
    
    amount = models.DecimalField(max_digits=20, decimal_places=6)
    currency = models.CharField(max_length=10, default='USD')
    
    # Status
    is_anonymous = models.BooleanField(default=False)
    message = models.TextField(blank=True)
    
    # Timestamps
    donated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-donated_at']
    
    def __str__(self):
        donor_name = "Anonymous" if self.is_anonymous else (self.donor.email if self.donor else "Unknown")
        return f"{donor_name} -> {self.campaign.name}: {self.amount} {self.currency}"
