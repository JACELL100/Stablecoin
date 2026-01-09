"""
Django admin configuration for the transactions app.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import TransactionLog, AuditEvent, SpendingAnalytics, BlockchainSync


@admin.register(TransactionLog)
class TransactionLogAdmin(admin.ModelAdmin):
    """Admin configuration for TransactionLog model."""
    list_display = ('tx_hash_short', 'transaction_type', 'amount', 'status', 'is_flagged_display', 'category', 'timestamp')
    list_filter = ('transaction_type', 'status', 'category', 'is_flagged', 'timestamp')
    search_fields = ('tx_hash', 'from_address', 'to_address', 'reference')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp', 'confirmed_at', 'fraud_score')
    date_hierarchy = 'timestamp'
    
    def tx_hash_short(self, obj):
        if obj.tx_hash:
            return f"{obj.tx_hash[:10]}...{obj.tx_hash[-6:]}"
        return '-'
    tx_hash_short.short_description = 'TX Hash'
    
    def is_flagged_display(self, obj):
        if obj.is_flagged:
            return format_html('<span style="color:red; font-weight:bold;">⚠️ FLAGGED</span>')
        return format_html('<span style="color:green;">✓</span>')
    is_flagged_display.short_description = 'Flagged'
    
    fieldsets = (
        ('Transaction', {'fields': ('tx_hash', 'transaction_type', 'status')}),
        ('Addresses', {'fields': ('from_address', 'to_address')}),
        ('Amount', {'fields': ('amount', 'category')}),
        ('Related Objects', {'fields': ('campaign', 'allocation', 'merchant')}),
        ('Details', {'fields': ('reference', 'notes', 'metadata')}),
        ('Gas', {'fields': ('gas_used', 'gas_price')}),
        ('Fraud Detection', {'fields': ('is_flagged', 'flag_reason', 'fraud_score')}),
        ('Timestamps', {'fields': ('timestamp', 'confirmed_at')}),
    )
    
    actions = ['clear_flags', 'mark_confirmed']
    
    @admin.action(description='Clear flags on selected transactions')
    def clear_flags(self, request, queryset):
        queryset.update(is_flagged=False, flag_reason='')
    
    @admin.action(description='Mark selected transactions as confirmed')
    def mark_confirmed(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='confirmed', confirmed_at=timezone.now())


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    """Admin configuration for AuditEvent model."""
    list_display = ('event_type', 'actor', 'title', 'campaign', 'timestamp')
    list_filter = ('event_type', 'timestamp')
    search_fields = ('actor__email', 'title', 'description')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
    
    fieldsets = (
        ('Event', {'fields': ('event_type', 'title', 'description')}),
        ('Actor', {'fields': ('actor',)}),
        ('Related', {'fields': ('campaign', 'transaction')}),
        ('Metadata', {'fields': ('metadata',)}),
        ('Timestamp', {'fields': ('timestamp',)}),
    )


@admin.register(SpendingAnalytics)
class SpendingAnalyticsAdmin(admin.ModelAdmin):
    """Admin configuration for SpendingAnalytics model."""
    list_display = ('date', 'campaign', 'total_spent_display', 'transaction_count', 'unique_beneficiaries', 'flagged_transactions')
    list_filter = ('date', 'campaign')
    search_fields = ('campaign__name',)
    ordering = ('-date',)
    date_hierarchy = 'date'
    
    def total_spent_display(self, obj):
        return f"${obj.total_spent:.2f}"
    total_spent_display.short_description = 'Total Spent'
    
    fieldsets = (
        ('Date & Campaign', {'fields': ('date', 'campaign')}),
        ('By Category', {'fields': ('food_spent', 'medical_spent', 'shelter_spent', 'utilities_spent', 'transport_spent')}),
        ('Counts', {'fields': ('transaction_count', 'unique_beneficiaries', 'unique_merchants')}),
        ('Anomalies', {'fields': ('flagged_transactions',)}),
    )


@admin.register(BlockchainSync)
class BlockchainSyncAdmin(admin.ModelAdmin):
    """Admin configuration for BlockchainSync model."""
    list_display = ('chain_id', 'contract_address_short', 'last_synced_block', 'last_synced_at')
    list_filter = ('chain_id',)
    search_fields = ('contract_address',)
    readonly_fields = ('last_synced_at',)
    
    def contract_address_short(self, obj):
        return f"{obj.contract_address[:10]}...{obj.contract_address[-6:]}"
    contract_address_short.short_description = 'Contract'
