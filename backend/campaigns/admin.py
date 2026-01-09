"""
Django admin configuration for the campaigns app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import AidCampaign, FundAllocation, Donation, CampaignStatus, CategorySpendingLimit


@admin.register(AidCampaign)
class AidCampaignAdmin(admin.ModelAdmin):
    """Admin configuration for AidCampaign model."""
    list_display = ('name', 'status', 'target_amount', 'raised_amount', 'progress_bar', 'region', 'created_by', 'created_at')
    list_filter = ('status', 'disaster_type', 'region', 'created_at')
    search_fields = ('name', 'description', 'region')
    ordering = ('-created_at',)
    readonly_fields = ('created_at', 'updated_at', 'on_chain_id')
    date_hierarchy = 'created_at'
    
    def progress_bar(self, obj):
        percentage = obj.progress_percentage
        color = 'green' if percentage >= 100 else 'blue' if percentage >= 50 else 'orange'
        return format_html(
            '<div style="width:100px; background:#eee; border-radius:4px;">'
            '<div style="width:{}%; background:{}; height:20px; border-radius:4px; text-align:center; color:white; font-size:12px; line-height:20px;">'
            '{}%</div></div>',
            min(percentage, 100), color, round(percentage)
        )
    progress_bar.short_description = 'Progress'
    
    fieldsets = (
        ('Campaign Info', {'fields': ('name', 'description', 'disaster_type', 'region')}),
        ('Funding', {'fields': ('target_amount', 'raised_amount', 'distributed_amount', 'spent_amount')}),
        ('Status & Timeline', {'fields': ('status', 'start_date', 'end_date')}),
        ('On-Chain', {'fields': ('on_chain_id',)}),
        ('Media', {'fields': ('image_url', 'metadata_uri')}),
        ('Admin', {'fields': ('created_by',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    
    actions = ['activate_campaigns', 'pause_campaigns', 'complete_campaigns']
    
    @admin.action(description='Activate selected campaigns')
    def activate_campaigns(self, request, queryset):
        queryset.update(status=CampaignStatus.ACTIVE)
    
    @admin.action(description='Pause selected campaigns')
    def pause_campaigns(self, request, queryset):
        queryset.update(status=CampaignStatus.PAUSED)
    
    @admin.action(description='Mark selected campaigns as completed')
    def complete_campaigns(self, request, queryset):
        queryset.update(status=CampaignStatus.COMPLETED)


@admin.register(FundAllocation)
class FundAllocationAdmin(admin.ModelAdmin):
    """Admin configuration for FundAllocation model."""
    list_display = ('beneficiary', 'campaign', 'total_amount', 'distributed_amount', 'is_active', 'allocated_at')
    list_filter = ('is_active', 'campaign', 'allocated_at')
    search_fields = ('beneficiary__user__email', 'beneficiary__user__full_name', 'campaign__name')
    ordering = ('-allocated_at',)
    readonly_fields = ('allocated_at', 'distributed_at', 'distribution_tx_hash')
    
    fieldsets = (
        ('Allocation', {'fields': ('campaign', 'beneficiary', 'wallet')}),
        ('Amounts', {'fields': ('total_amount', 'distributed_amount')}),
        ('Category Allowances', {'fields': ('food_allowance', 'medical_allowance', 'shelter_allowance', 'utilities_allowance', 'transport_allowance')}),
        ('Status', {'fields': ('is_active', 'distributed_at')}),
        ('On-Chain', {'fields': ('distribution_tx_hash',)}),
        ('Notes', {'fields': ('notes',)}),
        ('Timestamps', {'fields': ('allocated_at',)}),
    )


@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    """Admin configuration for Donation model."""
    list_display = ('donor_display', 'campaign', 'amount', 'currency', 'is_anonymous', 'donated_at')
    list_filter = ('is_anonymous', 'currency', 'donated_at')
    search_fields = ('donor__email', 'donor__full_name', 'campaign__name')
    ordering = ('-donated_at',)
    readonly_fields = ('donated_at',)
    
    def donor_display(self, obj):
        if obj.is_anonymous:
            return 'Anonymous'
        if obj.donor:
            return obj.donor.full_name or obj.donor.email
        return 'Unknown'
    donor_display.short_description = 'Donor'
    
    fieldsets = (
        ('Donation', {'fields': ('donor', 'campaign', 'amount', 'currency')}),
        ('Options', {'fields': ('is_anonymous',)}),
        ('Message', {'fields': ('message',)}),
        ('Timestamp', {'fields': ('donated_at',)}),
    )


@admin.register(CategorySpendingLimit)
class CategorySpendingLimitAdmin(admin.ModelAdmin):
    """Admin configuration for CategorySpendingLimit model."""
    list_display = ('campaign', 'category', 'max_per_transaction', 'max_daily', 'max_total')
    list_filter = ('category', 'campaign')
    search_fields = ('campaign__name',)

