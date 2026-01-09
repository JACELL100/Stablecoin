import { useState, useEffect } from 'react';
import { beneficiaryApi, campaignApi } from '../../services/api';
import { blockchain } from '../../services/blockchain';
import toast from 'react-hot-toast';

export default function BeneficiaryManagement() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [pendingBeneficiaries, setPendingBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [campaigns, setCampaigns] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [beneficiariesRes, pendingRes, campaignsRes] = await Promise.all([
        beneficiaryApi.list(),
        beneficiaryApi.pending().catch(() => ({ data: [] })),
        campaignApi.list(),
      ]);
      
      const allBeneficiaries = beneficiariesRes.data?.results || beneficiariesRes.data || [];
      const pending = pendingRes.data?.results || pendingRes.data || [];
      const campaignsData = campaignsRes.data?.results || campaignsRes.data || [];
      
      setBeneficiaries(allBeneficiaries);
      setPendingBeneficiaries(pending);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load beneficiaries');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (beneficiary, status) => {
    setVerifying(true);
    try {
      const userId = beneficiary.user_id || beneficiary.user?.id || beneficiary.id;
      await beneficiaryApi.verify(userId, status, '');
      toast.success(status === 'verified' ? 'Beneficiary verified!' : 'Beneficiary rejected');
      fetchData();
    } catch (error) {
      console.error('Verification failed:', error);
      toast.error('Failed to update verification status');
    } finally {
      setVerifying(false);
    }
  };

  const handleWhitelistOnChain = async (beneficiary) => {
    try {
      toast.loading('Whitelisting on blockchain...', { id: 'whitelist' });
      
      await blockchain.connect();
      
      // Call backend to whitelist (uses admin account)
      await beneficiaryApi.whitelist(beneficiary.user_id || beneficiary.id);
      
      toast.success('Beneficiary whitelisted on blockchain!', { id: 'whitelist' });
      fetchData();
    } catch (error) {
      console.error('Whitelisting failed:', error);
      toast.error('Failed to whitelist on blockchain', { id: 'whitelist' });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      verified: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return styles[status] || styles.pending;
  };

  // Combine all beneficiaries for display
  const allBeneficiariesList = [...pendingBeneficiaries, ...beneficiaries];
  
  const filteredBeneficiaries = allBeneficiariesList.filter((b) => {
    const name = b.user?.full_name || b.full_name || '';
    const email = b.user?.email || b.email || '';
    const matchesSearch = 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    if (filter === 'pending') return matchesSearch && (b.verification_status === 'pending' || pendingBeneficiaries.includes(b));
    if (filter === 'verified') return matchesSearch && b.verification_status === 'verified';
    if (filter === 'rejected') return matchesSearch && b.verification_status === 'rejected';
    return matchesSearch;
  });

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Beneficiary Management</h1>
        <p className="text-gray-600">Verify and manage enrolled beneficiaries</p>
      </div>

      {/* Pending Approvals Alert */}
      {pendingBeneficiaries.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏳</span>
            <div>
              <h3 className="font-semibold text-yellow-800">
                {pendingBeneficiaries.length} Pending Verification{pendingBeneficiaries.length > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-yellow-700">
                Review and verify beneficiaries to enable fund distribution
              </p>
            </div>
          </div>
        </div>
      )}

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
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Total Beneficiaries</p>
          <p className="text-2xl font-bold text-gray-900">{beneficiaries.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Verified</p>
          <p className="text-2xl font-bold text-green-600">
            {beneficiaries.filter(b => b.verification_status === 'verified').length}
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Pending Verification</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingBeneficiaries.length}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">Whitelisted On-Chain</p>
          <p className="text-2xl font-bold text-primary-600">
            {beneficiaries.filter(b => b.is_whitelisted).length}
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
                  ID Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  On-Chain
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBeneficiaries.length > 0 ? (
                filteredBeneficiaries.map((beneficiary) => {
                  const isPending = beneficiary.verification_status === 'pending' || pendingBeneficiaries.some(p => p.id === beneficiary.id);
                  const isVerified = beneficiary.verification_status === 'verified';
                  const name = beneficiary.user?.full_name || beneficiary.full_name || 'Unknown';
                  const email = beneficiary.user?.email || beneficiary.email || '';
                  
                  return (
                    <tr key={beneficiary.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-700 font-medium">{name.charAt(0)}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{name}</div>
                            <div className="text-sm text-gray-500">{email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{beneficiary.id_type || 'Not provided'}</div>
                        <div className="text-sm text-gray-500">{beneficiary.id_number || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{beneficiary.region || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getStatusBadge(isPending ? 'pending' : beneficiary.verification_status)
                        }`}>
                          {isPending ? 'Pending' : (beneficiary.verification_status || 'pending')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {beneficiary.is_whitelisted ? (
                          <span className="text-green-600 text-sm">✓ Whitelisted</span>
                        ) : (
                          <span className="text-gray-400 text-sm">Not whitelisted</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleVerify(beneficiary, 'verified')}
                              disabled={verifying}
                              className="bg-green-100 text-green-700 px-3 py-1 rounded-lg hover:bg-green-200 disabled:opacity-50"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleVerify(beneficiary, 'rejected')}
                              disabled={verifying}
                              className="bg-red-100 text-red-700 px-3 py-1 rounded-lg hover:bg-red-200 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : isVerified && !beneficiary.is_whitelisted ? (
                          <button
                            onClick={() => handleWhitelistOnChain(beneficiary)}
                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200"
                          >
                            Whitelist
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedBeneficiary(beneficiary);
                              setShowDetailModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-700"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      {/* Detail Modal */}
      {showDetailModal && selectedBeneficiary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Beneficiary Details</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl">
                  {(selectedBeneficiary.user?.full_name || selectedBeneficiary.full_name || '?').charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedBeneficiary.user?.full_name || selectedBeneficiary.full_name}
                  </h3>
                  <p className="text-gray-500">
                    {selectedBeneficiary.user?.email || selectedBeneficiary.email}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">ID Type</p>
                  <p className="font-medium">{selectedBeneficiary.id_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">ID Number</p>
                  <p className="font-medium">{selectedBeneficiary.id_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Region</p>
                  <p className="font-medium">{selectedBeneficiary.region || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Verification Status</p>
                  <p className="font-medium capitalize">{selectedBeneficiary.verification_status || 'Pending'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pt-6 mt-6 border-t">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
