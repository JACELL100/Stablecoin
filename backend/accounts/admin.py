"""
Django admin configuration for the accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Wallet, BeneficiaryProfile, ApprovedMerchant


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for User model."""
    list_display = ('email', 'full_name', 'role', 'verification_status', 'is_active', 'created_at')
    list_filter = ('role', 'verification_status', 'is_active', 'is_staff')
    search_fields = ('email', 'full_name', 'organization')
    ordering = ('-created_at',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'phone_number', 'organization', 'avatar_url')}),
        ('Role & Verification', {'fields': ('role', 'verification_status', 'verified_at', 'verified_by')}),
        ('Supabase', {'fields': ('supabase_uid',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at', 'last_login')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role'),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'last_login', 'supabase_uid')


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    """Admin configuration for Wallet model."""
    list_display = ('address_short', 'user', 'is_primary', 'is_whitelisted', 'on_chain_balance', 'created_at')
    list_filter = ('is_primary', 'is_whitelisted')
    search_fields = ('address', 'user__email', 'user__full_name')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'last_synced_at')
    
    def address_short(self, obj):
        return f"{obj.address[:10]}...{obj.address[-6:]}"
    address_short.short_description = 'Address'


@admin.register(BeneficiaryProfile)
class BeneficiaryProfileAdmin(admin.ModelAdmin):
    """Admin configuration for BeneficiaryProfile model."""
    list_display = ('user', 'region', 'household_size', 'risk_score', 'created_at')
    list_filter = ('region', 'has_children', 'has_elderly', 'has_disabled', 'needs_food', 'needs_medical', 'needs_shelter')
    search_fields = ('user__email', 'user__full_name', 'region', 'address')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'risk_score', 'risk_factors')
    filter_horizontal = ('campaigns',)
    
    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('Location', {'fields': ('region', 'address', 'coordinates')}),
        ('Household', {'fields': ('household_size', 'has_children', 'has_elderly', 'has_disabled')}),
        ('Needs', {'fields': ('needs_food', 'needs_medical', 'needs_shelter', 'special_needs')}),
        ('Risk Assessment', {'fields': ('risk_score', 'risk_factors')}),
        ('Documents', {'fields': ('id_document_type', 'id_document_hash')}),
        ('Campaigns', {'fields': ('campaigns',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(ApprovedMerchant)
class ApprovedMerchantAdmin(admin.ModelAdmin):
    """Admin configuration for ApprovedMerchant model."""
    list_display = ('business_name', 'category', 'wallet_short', 'is_active', 'is_registered_on_chain', 'total_received', 'transaction_count')
    list_filter = ('category', 'is_active', 'is_registered_on_chain')
    search_fields = ('business_name', 'wallet_address', 'business_address')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'registered_on_chain_at', 'total_received', 'transaction_count')
    filter_horizontal = ('campaigns',)
    
    def wallet_short(self, obj):
        return f"{obj.wallet_address[:10]}...{obj.wallet_address[-6:]}"
    wallet_short.short_description = 'Wallet'
    
    fieldsets = (
        ('Business Info', {'fields': ('business_name', 'category', 'business_address', 'business_license')}),
        ('Wallet', {'fields': ('wallet_address',)}),
        ('On-Chain Status', {'fields': ('is_registered_on_chain', 'registered_on_chain_at')}),
        ('Stats', {'fields': ('total_received', 'transaction_count')}),
        ('Approval', {'fields': ('is_active', 'approved_by')}),
        ('Campaigns', {'fields': ('campaigns',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    actions = ['activate_merchants', 'deactivate_merchants']
    
    @admin.action(description='Activate selected merchants')
    def activate_merchants(self, request, queryset):
        queryset.update(is_active=True)
    
    @admin.action(description='Deactivate selected merchants')
    def deactivate_merchants(self, request, queryset):
        queryset.update(is_active=False)
