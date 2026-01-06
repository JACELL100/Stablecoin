"""
User and Profile models for the Disaster Relief System.

Defines the core user model with role-based access control,
wallet management, and beneficiary profiles.
"""
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator
import uuid


class UserRole(models.TextChoices):
    """User roles for role-based access control."""
    ADMIN = 'admin', 'Admin/NGO'
    DONOR = 'donor', 'Donor'
    BENEFICIARY = 'beneficiary', 'Beneficiary'
    AUDITOR = 'auditor', 'Auditor'
    MERCHANT = 'merchant', 'Merchant'


class VerificationStatus(models.TextChoices):
    """Verification status for users and beneficiaries."""
    PENDING = 'pending', 'Pending Verification'
    VERIFIED = 'verified', 'Verified'
    REJECTED = 'rejected', 'Rejected'
    SUSPENDED = 'suspended', 'Suspended'


class UserManager(BaseUserManager):
    """Custom user manager for the User model."""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', UserRole.ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model for the Disaster Relief System.
    
    Integrates with Supabase for OAuth and supports wallet connections.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = None  # Remove username, use email instead
    email = models.EmailField(unique=True)
    
    # Supabase integration
    supabase_uid = models.CharField(
        max_length=255, 
        unique=True, 
        null=True, 
        blank=True,
        help_text="Supabase user ID from Google OAuth"
    )
    
    # Role-based access control
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.DONOR,
        help_text="User's role in the system"
    )
    
    # Profile information
    full_name = models.CharField(max_length=255, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    organization = models.CharField(max_length=255, blank=True, help_text="NGO or organization name")
    avatar_url = models.URLField(blank=True)
    
    # Verification
    verification_status = models.CharField(
        max_length=20,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_users'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email} ({self.role})"
    
    @property
    def is_admin(self):
        return self.role == UserRole.ADMIN
    
    @property
    def is_beneficiary(self):
        return self.role == UserRole.BENEFICIARY
    
    @property
    def is_verified(self):
        return self.verification_status == VerificationStatus.VERIFIED


# Ethereum address validator
eth_address_validator = RegexValidator(
    regex=r'^0x[a-fA-F0-9]{40}$',
    message='Enter a valid Ethereum address'
)


class Wallet(models.Model):
    """
    Wallet model for storing user's connected wallets.
    
    Each user can have multiple wallets, with one primary wallet.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallets')
    
    address = models.CharField(
        max_length=42,
        unique=True,
        validators=[eth_address_validator],
        help_text="Ethereum wallet address"
    )
    
    is_primary = models.BooleanField(default=False, help_text="Primary wallet for receiving funds")
    is_whitelisted = models.BooleanField(default=False, help_text="Whitelisted on-chain for receiving relief funds")
    whitelisted_at = models.DateTimeField(null=True, blank=True)
    
    # On-chain sync
    last_synced_at = models.DateTimeField(null=True, blank=True)
    on_chain_balance = models.DecimalField(
        max_digits=30,
        decimal_places=6,
        default=0,
        help_text="Last known on-chain balance"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Wallet'
        verbose_name_plural = 'Wallets'
        ordering = ['-is_primary', '-created_at']
    
    def __str__(self):
        return f"{self.address[:10]}...{self.address[-8:]} ({self.user.email})"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary wallet per user
        if self.is_primary:
            Wallet.objects.filter(user=self.user, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class BeneficiaryProfile(models.Model):
    """
    Extended profile for beneficiaries with disaster relief specific information.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='beneficiary_profile')
    
    # Location information
    region = models.CharField(max_length=255, help_text="Disaster-affected region")
    address = models.TextField(blank=True, help_text="Physical address")
    coordinates = models.CharField(max_length=50, blank=True, help_text="GPS coordinates")
    
    # Family/household information
    household_size = models.PositiveIntegerField(default=1)
    has_children = models.BooleanField(default=False)
    has_elderly = models.BooleanField(default=False)
    has_disabled = models.BooleanField(default=False)
    
    # Needs assessment
    needs_food = models.BooleanField(default=True)
    needs_medical = models.BooleanField(default=False)
    needs_shelter = models.BooleanField(default=False)
    special_needs = models.TextField(blank=True)
    
    # Risk score from ML model
    risk_score = models.FloatField(default=0.0, help_text="ML-computed risk/priority score")
    risk_factors = models.JSONField(default=dict, blank=True)
    
    # Documents
    id_document_type = models.CharField(max_length=50, blank=True)
    id_document_hash = models.CharField(max_length=255, blank=True, help_text="Hash of ID document for verification")
    
    # Associated campaigns
    campaigns = models.ManyToManyField(
        'campaigns.AidCampaign',
        related_name='beneficiaries',
        blank=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Beneficiary Profile'
        verbose_name_plural = 'Beneficiary Profiles'
    
    def __str__(self):
        return f"Beneficiary: {self.user.full_name or self.user.email} - {self.region}"


class MerchantProfile(models.Model):
    """
    Profile for merchants who can receive relief fund payments.
    """
    class Category(models.TextChoices):
        FOOD = 'food', 'Food & Groceries'
        MEDICAL = 'medical', 'Medical & Healthcare'
        SHELTER = 'shelter', 'Shelter & Housing'
        UTILITIES = 'utilities', 'Utilities'
        TRANSPORT = 'transport', 'Transportation'
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='merchant_profile')
    
    business_name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=Category.choices)
    business_address = models.TextField()
    business_license = models.CharField(max_length=100, blank=True)
    
    # On-chain registration
    is_registered_on_chain = models.BooleanField(default=False)
    registered_on_chain_at = models.DateTimeField(null=True, blank=True)
    
    # Stats
    total_received = models.DecimalField(max_digits=20, decimal_places=6, default=0)
    transaction_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Merchant Profile'
        verbose_name_plural = 'Merchant Profiles'
    
    def __str__(self):
        return f"{self.business_name} ({self.category})"
