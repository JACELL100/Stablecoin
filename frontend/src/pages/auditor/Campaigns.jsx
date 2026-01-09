import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function AuditorCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await api.get('/campaigns/');
        setCampaigns(response.data.results || response.data);
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const calculateProgress = (current, goal) => {
    if (!goal) return 0;
    return Math.min(100, (current / goal) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Audit</h1>
        <p className="text-gray-500">Review and audit all disaster relief campaigns</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Campaigns</p>
          <p className="text-3xl font-bold text-gray-900">{campaigns.length}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Active Campaigns</p>
          <p className="text-3xl font-bold text-green-600">
            {campaigns.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Funds</p>
          <p className="text-3xl font-bold text-purple-600">
            ${campaigns.reduce((sum, c) => sum + parseFloat(c.current_amount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Distributed</p>
          <p className="text-3xl font-bold text-blue-600">
            ${campaigns.reduce((sum, c) => sum + parseFloat(c.distributed_amount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Campaigns</h2>
        </div>
        
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📋</span>
            <p className="mt-2 text-gray-500">No campaigns found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <div 
                key={campaign.id} 
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedCampaign(selectedCampaign?.id === campaign.id ? null : campaign)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{campaign.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{campaign.description?.slice(0, 100)}...</p>
                    
                    <div className="mt-4 flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Goal:</span>
                        <span className="ml-2 font-medium">${parseFloat(campaign.goal_amount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Raised:</span>
                        <span className="ml-2 font-medium text-green-600">${parseFloat(campaign.current_amount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Beneficiaries:</span>
                        <span className="ml-2 font-medium">{campaign.beneficiary_count || 0}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3 w-full max-w-md">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-600 rounded-full transition-all"
                          style={{ width: `${calculateProgress(campaign.current_amount, campaign.goal_amount)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-sm font-medium">{new Date(campaign.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedCampaign?.id === campaign.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">On-Chain ID</p>
                        <p className="font-mono text-sm mt-1">{campaign.on_chain_id || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Contract Address</p>
                        <p className="font-mono text-sm mt-1 truncate">{campaign.contract_address || 'N/A'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Transactions</p>
                        <p className="text-lg font-bold mt-1">{campaign.transaction_count || 0}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase">Last Activity</p>
                        <p className="text-sm mt-1">
                          {campaign.updated_at ? new Date(campaign.updated_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
                        View Full Audit Trail
                      </button>
                      <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Download Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
