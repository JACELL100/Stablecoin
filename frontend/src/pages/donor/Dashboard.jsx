import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { donorApi, campaignApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function DonorDashboard() {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonated: 0,
    campaignsSupported: 0,
    beneficiariesHelped: 0,
    impactScore: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Try to load from donor dashboard API
      try {
        const dashboardRes = await donorApi.getDashboard();
        const data = dashboardRes.data;
        
        setStats({
          totalDonated: data.stats?.total_donated || 0,
          campaignsSupported: data.stats?.campaigns_supported || 0,
          beneficiariesHelped: data.stats?.beneficiaries_helped || 0,
          impactScore: data.stats?.impact_score || 0,
        });
        
        setDonations(data.recent_donations || []);
        setCampaigns(data.active_campaigns || []);
      } catch (e) {
        console.log('Using fallback data:', e);
        // Fallback to campaign list
        const campaignRes = await campaignApi.list({ status: 'active' });
        setCampaigns(campaignRes.data?.results || campaignRes.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleDonate = (campaignId) => {
    toast.success('Donation feature coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.full_name || 'Donor'}! 💝</h1>
        <p className="text-pink-100 mt-1">Your generosity is making a real difference</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Donated</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalDonated.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 bg-pink-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Campaigns Supported</p>
              <p className="text-2xl font-bold text-gray-900">{stats.campaignsSupported}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Beneficiaries Helped</p>
              <p className="text-2xl font-bold text-gray-900">{stats.beneficiariesHelped}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Impact Score</p>
              <p className="text-2xl font-bold text-gray-900">{stats.impactScore}%</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Campaigns */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Active Campaigns</h2>
          <p className="text-sm text-gray-500">Support relief efforts around the world</p>
        </div>
        <div className="p-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-2 block">📋</span>
              <p>No active campaigns at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{campaign.description}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      Active
                    </span>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Progress</span>
                      <span className="font-medium">{Math.round((campaign.current_amount / campaign.target_amount) * 100) || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full" 
                        style={{ width: `${Math.min((campaign.current_amount / campaign.target_amount) * 100, 100) || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>${(campaign.current_amount || 0).toLocaleString()} raised</span>
                      <span>Goal: ${(campaign.target_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDonate(campaign.id)}
                    className="mt-4 w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Donate Now
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donation History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Your Donation History</h2>
          <p className="text-sm text-gray-500">Track all your contributions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {donations.map((donation) => (
                <tr key={donation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {donation.campaign}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${donation.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {donation.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      {donation.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
