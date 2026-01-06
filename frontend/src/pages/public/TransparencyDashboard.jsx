import { useState, useEffect } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { api } from '../../services/api';

export default function TransparencyDashboard() {
  const [stats, setStats] = useState({
    totalFunds: 2456000,
    distributed: 1890000,
    beneficiaries: 12500,
    campaigns: 47,
  });
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getCampaigns();
        setCampaigns(response.data || []);
        
        // Calculate real stats
        const campaignsData = response.data || [];
        setStats({
          totalFunds: campaignsData.reduce((sum, c) => sum + (c.target_amount || 0), 0),
          distributed: campaignsData.reduce((sum, c) => sum + (c.current_amount || 0), 0),
          beneficiaries: campaignsData.reduce((sum, c) => sum + (c.beneficiary_count || 0), 0),
          campaigns: campaignsData.length,
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Use demo data
        setCampaigns([
          { id: 1, name: 'Kenya Flood Relief', current_amount: 124500, target_amount: 200000, status: 'active' },
          { id: 2, name: 'Philippines Typhoon Aid', current_amount: 89200, target_amount: 150000, status: 'active' },
          { id: 3, name: 'Turkey Earthquake Relief', current_amount: 256800, target_amount: 300000, status: 'active' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Transparency Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real-time visibility into how relief funds are collected and
            distributed. Every transaction is recorded on the blockchain.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">💰</span>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.totalFunds)}
            </p>
            <p className="text-sm text-gray-500">Total Funds Raised</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">📤</span>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.distributed)}
            </p>
            <p className="text-sm text-gray-500">Distributed</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">👥</span>
            <p className="text-3xl font-bold text-primary-600">
              {stats.beneficiaries.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Beneficiaries Helped</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">📁</span>
            <p className="text-3xl font-bold text-purple-600">{stats.campaigns}</p>
            <p className="text-sm text-gray-500">Active Campaigns</p>
          </div>
        </div>

        {/* Live Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-12">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              Active Campaigns
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">
                        {campaign.beneficiary_count || 0} beneficiaries enrolled
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600 rounded-full"
                        style={{
                          width: `${
                            campaign.target_amount
                              ? Math.min(
                                  (campaign.current_amount / campaign.target_amount) * 100,
                                  100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      ${(campaign.current_amount || 0).toLocaleString()} raised
                    </span>
                    <span className="font-medium text-primary-600">
                      {campaign.target_amount
                        ? Math.round(
                            (campaign.current_amount / campaign.target_amount) * 100
                          )
                        : 0}
                      % of ${(campaign.target_amount || 0).toLocaleString()} goal
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                No active campaigns
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Verification */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🔗</span>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Blockchain Verified
              </h3>
              <p className="text-gray-300 mb-4">
                All transactions are recorded on the Ethereum Sepolia testnet.
                Verify any transaction using the links in the Audit Explorer.
              </p>
              <a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
              >
                View on Etherscan ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
