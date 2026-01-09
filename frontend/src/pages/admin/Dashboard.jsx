import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignApi, beneficiaryApi, transactionApi, adminApi, approvedMerchantApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalFunds: 0,
    activeCampaigns: 0,
    totalBeneficiaries: 0,
    pendingApprovals: 0,
    totalMerchants: 0,
    distributedAmount: 0,
  });
  const [campaigns, setCampaigns] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingBeneficiaries, setPendingBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [campaignsRes, beneficiariesRes, merchantsRes, pendingRes] = await Promise.all([
        campaignApi.list(),
        beneficiaryApi.list(),
        approvedMerchantApi.list(),
        beneficiaryApi.pending().catch(() => ({ data: [] })),
      ]);

      const campaignsData = campaignsRes.data?.results || campaignsRes.data || [];
      const beneficiariesData = beneficiariesRes.data?.results || beneficiariesRes.data || [];
      const merchantsData = merchantsRes.data?.results || merchantsRes.data || [];
      const pendingData = pendingRes.data?.results || pendingRes.data || [];

      setCampaigns(campaignsData.slice(0, 3));
      setPendingBeneficiaries(pendingData.slice(0, 5));

      const totalRaised = campaignsData.reduce((sum, c) => sum + parseFloat(c.raised_amount || 0), 0);
      const totalDistributed = campaignsData.reduce((sum, c) => sum + parseFloat(c.distributed_amount || 0), 0);

      setStats({
        totalFunds: totalRaised,
        activeCampaigns: campaignsData.filter(c => c.status === 'active').length,
        totalBeneficiaries: beneficiariesData.length,
        pendingApprovals: pendingData.length,
        totalMerchants: merchantsData.length,
        distributedAmount: totalDistributed,
      });

      // Try to get recent transactions
      try {
        const txRes = await transactionApi.list({ limit: 5 });
        setRecentTransactions(txRes.data?.results || txRes.data || []);
      } catch (e) {
        console.log('Could not load transactions');
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyBeneficiary = async (userId, status) => {
    try {
      await beneficiaryApi.verify(userId, status, '');
      toast.success(status === 'verified' ? 'Beneficiary verified!' : 'Beneficiary rejected');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update beneficiary status');
    }
  };

  const statCards = [
    {
      title: 'Total Funds Raised',
      value: `$${stats.totalFunds.toLocaleString()}`,
      icon: '💰',
      subtitle: `$${stats.distributedAmount.toLocaleString()} distributed`,
      color: 'primary',
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      icon: '📁',
      subtitle: 'Currently running',
      color: 'blue',
    },
    {
      title: 'Verified Beneficiaries',
      value: stats.totalBeneficiaries.toLocaleString(),
      icon: '👥',
      subtitle: 'Receiving aid',
      color: 'green',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: '⏳',
      subtitle: 'Awaiting review',
      color: 'yellow',
    },
    {
      title: 'Approved Merchants',
      value: stats.totalMerchants,
      icon: '🏪',
      subtitle: 'Active vendors',
      color: 'purple',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your relief operations</p>
        </div>
        <Link
          to="/admin/campaigns/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {card.value}
            </div>
            <div className="text-sm text-gray-500">{card.title}</div>
            <div className="text-xs text-gray-400 mt-1">{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Link
          to="/admin/campaigns"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📁
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Campaigns</h3>
              <p className="text-sm text-gray-500">View and edit relief campaigns</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/beneficiaries"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              👥
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Beneficiaries</h3>
              <p className="text-sm text-gray-500">Manage enrolled beneficiaries</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/merchants"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🏪
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Merchants</h3>
              <p className="text-sm text-gray-500">Manage approved vendors</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/analytics"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📊
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-500">View distribution metrics</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Pending Beneficiaries & Recent Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Beneficiaries */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Pending Beneficiary Approvals
              </h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {pendingBeneficiaries.length} pending
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingBeneficiaries.length > 0 ? (
              pendingBeneficiaries.map((beneficiary) => (
                <div key={beneficiary.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                      👤
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {beneficiary.user?.first_name || beneficiary.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {beneficiary.id_type}: {beneficiary.id_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerifyBeneficiary(beneficiary.user_id || beneficiary.id, 'verified')}
                      className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-200"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerifyBeneficiary(beneficiary.user_id || beneficiary.id, 'rejected')}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No pending approvals
              </div>
            )}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Active Campaigns
              </h2>
              <Link
                to="/admin/campaigns"
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  to={`/admin/campaigns/${campaign.id}`}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-sm text-gray-500">{campaign.disaster_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${parseFloat(campaign.raised_amount || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      of ${parseFloat(campaign.target_amount || 0).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                No active campaigns
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h2>
            <Link
              to="/admin/transactions"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all →
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      tx.transaction_type === 'distribution'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    {tx.transaction_type === 'distribution' ? '↗️' : '↙️'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tx.transaction_type === 'distribution'
                        ? 'Distribution'
                        : 'Donation'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    ${tx.amount?.toLocaleString() || '0'}
                  </p>
                  <a
                    href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline"
                  >
                    View on Etherscan ↗
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No recent transactions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
