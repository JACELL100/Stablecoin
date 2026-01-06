import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalFunds: 0,
    activeCampaigns: 0,
    totalBeneficiaries: 0,
    pendingApprovals: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, transactionsRes] = await Promise.all([
          api.getCampaigns(),
          api.getTransactions(),
        ]);

        // Calculate stats from campaigns
        const campaigns = statsRes.data || [];
        const transactions = transactionsRes.data || [];

        setStats({
          totalFunds: campaigns.reduce((sum, c) => sum + (c.current_amount || 0), 0),
          activeCampaigns: campaigns.filter((c) => c.status === 'active').length,
          totalBeneficiaries: campaigns.reduce(
            (sum, c) => sum + (c.beneficiary_count || 0),
            0
          ),
          pendingApprovals: 5, // Mock data
        });

        setRecentTransactions(transactions.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Total Funds',
      value: `$${stats.totalFunds.toLocaleString()}`,
      icon: '💰',
      change: '+12.5%',
      changeType: 'positive',
    },
    {
      title: 'Active Campaigns',
      value: stats.activeCampaigns,
      icon: '📁',
      change: '+3',
      changeType: 'positive',
    },
    {
      title: 'Beneficiaries',
      value: stats.totalBeneficiaries.toLocaleString(),
      icon: '👥',
      change: '+156',
      changeType: 'positive',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: '⏳',
      change: '-2',
      changeType: 'negative',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{card.icon}</span>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-full ${
                  card.changeType === 'positive'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {card.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {card.value}
            </div>
            <div className="text-sm text-gray-500">{card.title}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
