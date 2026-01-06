import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await api.getCampaigns();
        setCampaigns(response.data || []);
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const filteredCampaigns = campaigns.filter((campaign) => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-gray-100 text-gray-700',
      paused: 'bg-red-100 text-red-700',
    };
    return styles[status] || styles.pending;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">Manage your relief campaigns</p>
        </div>
        <Link
          to="/admin/campaigns/new"
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'pending', 'completed', 'paused'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaign Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gradient-to-br from-primary-500 to-primary-700 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl opacity-50">🌍</span>
                </div>
                <div className="absolute top-3 right-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                      campaign.status
                    )}`}
                  >
                    {campaign.status}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {campaign.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {campaign.description || 'No description available'}
                </p>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">
                      {campaign.target_amount
                        ? Math.round(
                            (campaign.current_amount / campaign.target_amount) * 100
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Raised</p>
                    <p className="font-semibold text-gray-900">
                      ${(campaign.current_amount || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Target</p>
                    <p className="font-semibold text-gray-900">
                      ${(campaign.target_amount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/admin/campaigns/${campaign.id}`}
                    className="flex-1 text-center px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
                  >
                    View Details
                  </Link>
                  <button className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                    ⋮
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center">
          <span className="text-6xl mb-4 block">📁</span>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No campaigns found
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first relief campaign.
          </p>
          <Link
            to="/admin/campaigns/new"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Create Campaign
          </Link>
        </div>
      )}
    </div>
  );
}
