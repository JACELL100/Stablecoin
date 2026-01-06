import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function BeneficiaryManagement() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [campaigns, setCampaigns] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [beneficiariesRes, campaignsRes] = await Promise.all([
          api.getBeneficiaries(),
          api.getCampaigns(),
        ]);
        setBeneficiaries(beneficiariesRes.data || []);
        setCampaigns(campaignsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const matchesSearch =
      b.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCampaign =
      selectedCampaign === 'all' || b.campaign_id === selectedCampaign;
    return matchesSearch && matchesCampaign;
  });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
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
          <h1 className="text-2xl font-bold text-gray-900">Beneficiaries</h1>
          <p className="text-gray-600">Manage enrolled beneficiaries</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          + Add Beneficiary
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Campaigns</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Total Beneficiaries</p>
          <p className="text-2xl font-bold text-gray-900">
            {beneficiaries.length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {beneficiaries.filter((b) => b.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Pending Verification</p>
          <p className="text-2xl font-bold text-yellow-600">
            {beneficiaries.filter((b) => b.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Total Distributed</p>
          <p className="text-2xl font-bold text-primary-600">
            ${beneficiaries
              .reduce((sum, b) => sum + (b.total_received || 0), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beneficiary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBeneficiaries.length > 0 ? (
                filteredBeneficiaries.map((beneficiary) => (
                  <tr key={beneficiary.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {beneficiary.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {beneficiary.full_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {beneficiary.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {beneficiary.campaign_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${(beneficiary.balance || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          beneficiary.status
                        )}`}
                      >
                        {beneficiary.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {beneficiary.last_activity
                        ? new Date(beneficiary.last_activity).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-primary-600 hover:text-primary-700 mr-4">
                        Edit
                      </button>
                      <button className="text-red-600 hover:text-red-700">
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <span className="text-4xl mb-4 block">👥</span>
                    <p className="text-gray-500">No beneficiaries found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Add Beneficiary
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Campaign
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Allocation
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Beneficiary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
