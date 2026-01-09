"""
Donor-specific views for the campaigns app.
"""
from django.db.models import Sum, Count
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.models import UserRole
from .models import Donation, AidCampaign, CampaignStatus
from .serializers import DonationSerializer, AidCampaignSerializer


class DonorDashboardView(APIView):
    """
    Dashboard statistics for donors.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get donor's donations
        donations = Donation.objects.filter(donor=user)
        
        # Calculate stats
        total_donated = donations.aggregate(total=Sum('amount'))['total'] or 0
        campaigns_supported = donations.values('campaign').distinct().count()
        
        # Get impact stats (beneficiaries helped through campaigns the donor supported)
        supported_campaign_ids = donations.values_list('campaign_id', flat=True)
        from accounts.models import BeneficiaryProfile
        from .models import FundAllocation
        
        beneficiaries_helped = FundAllocation.objects.filter(
            campaign_id__in=supported_campaign_ids,
            distributed_amount__gt=0
        ).values('beneficiary').distinct().count()
        
        # Recent donations
        recent_donations = donations.order_by('-donated_at')[:10]
        
        # Active campaigns to donate to
        active_campaigns = AidCampaign.objects.filter(
            status=CampaignStatus.ACTIVE
        ).order_by('-created_at')[:6]
        
        # Calculate impact score (simple formula)
        impact_score = min(100, (float(total_donated) / 100) + (beneficiaries_helped * 2))
        
        return Response({
            'stats': {
                'total_donated': float(total_donated),
                'campaigns_supported': campaigns_supported,
                'beneficiaries_helped': beneficiaries_helped,
                'impact_score': round(impact_score, 1),
                'donation_count': donations.count(),
            },
            'recent_donations': DonationSerializer(recent_donations, many=True).data,
            'active_campaigns': AidCampaignSerializer(active_campaigns, many=True).data,
        })


class DonorDonationsView(APIView):
    """
    Paginated list of donor's donations.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        donations = Donation.objects.filter(donor=user).order_by('-donated_at')
        
        # Get campaign filter if provided
        campaign_id = request.query_params.get('campaign')
        if campaign_id:
            donations = donations.filter(campaign_id=campaign_id)
        
        return Response(DonationSerializer(donations, many=True).data)


class DonorImpactView(APIView):
    """
    Detailed impact report for a donor.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get supported campaigns
        supported_campaign_ids = Donation.objects.filter(
            donor=user
        ).values_list('campaign_id', flat=True).distinct()
        
        campaigns = AidCampaign.objects.filter(id__in=supported_campaign_ids)
        
        # Impact per campaign
        campaign_impacts = []
        for campaign in campaigns:
            user_donation = Donation.objects.filter(
                donor=user, campaign=campaign
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            from .models import FundAllocation
            beneficiaries = campaign.allocations.filter(
                distributed_amount__gt=0
            ).count()
            
            campaign_impacts.append({
                'campaign': AidCampaignSerializer(campaign).data,
                'your_donation': float(user_donation),
                'campaign_total': float(campaign.raised_amount),
                'contribution_percentage': round(
                    (float(user_donation) / float(campaign.raised_amount) * 100) 
                    if campaign.raised_amount > 0 else 0, 2
                ),
                'beneficiaries_helped': beneficiaries,
                'amount_distributed': float(campaign.distributed_amount),
                'amount_spent': float(campaign.spent_amount),
            })
        
        return Response({
            'campaigns_supported': len(campaign_impacts),
            'impact_by_campaign': campaign_impacts,
        })


class MakeDonationView(APIView):
    """
    Make a donation to a campaign.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        campaign_id = request.data.get('campaign_id')
        amount = request.data.get('amount')
        is_anonymous = request.data.get('is_anonymous', False)
        message = request.data.get('message', '')
        
        if not campaign_id or not amount:
            return Response(
                {'error': 'campaign_id and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            campaign = AidCampaign.objects.get(id=campaign_id)
        except AidCampaign.DoesNotExist:
            return Response(
                {'error': 'Campaign not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if campaign.status != CampaignStatus.ACTIVE:
            return Response(
                {'error': 'Campaign is not accepting donations'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create donation
        donation = Donation.objects.create(
            campaign=campaign,
            donor=request.user,
            amount=amount,
            is_anonymous=is_anonymous,
            message=message
        )
        
        # Update campaign raised amount
        campaign.raised_amount += donation.amount
        campaign.save()
        
        return Response({
            'message': 'Donation successful!',
            'donation': DonationSerializer(donation).data
        }, status=status.HTTP_201_CREATED)
