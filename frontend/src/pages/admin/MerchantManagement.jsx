import { useState, useEffect } from 'react';
import { approvedMerchantApi } from '../../services/api';
import { blockchain } from '../../services/blockchain';
import toast from 'react-hot-toast';

export default function MerchantManagement() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    wallet_address: '',
    category: 'food',
    business_address: '',
    business_license: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { value: 'food', label: '🍎 Food & Groceries', icon: '🍎' },
    { value: 'medical', label: '🏥 Medical & Healthcare', icon: '🏥' },
    { value: 'shelter', label: '🏠 Shelter & Housing', icon: '🏠' },
    { value: 'utilities', label: '💡 Utilities', icon: '💡' },
    { value: 'transport', label: '🚗 Transportation', icon: '🚗' },
  ];

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    try {
      setLoading(true);
      const response = await approvedMerchantApi.list();
      setMerchants(response.data?.results || response.data || []);
    } catch (error) {
      console.error('Failed to load merchants:', error);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.business_name || !formData.wallet_address || !formData.business_address) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Validate wallet address
    if (!formData.wallet_address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid wallet address format');
      return;
    }
    
    setSubmitting(true);
    try {
      toast.loading('Adding merchant...', { id: 'add-merchant' });
      
      // Create merchant in database
      const response = await approvedMerchantApi.create(formData);
      
      // Register on blockchain
      try {
        toast.loading('Registering on blockchain...', { id: 'add-merchant' });
        await approvedMerchantApi.registerOnChain(response.data.id);
        toast.success('Merchant added and registered on-chain!', { id: 'add-merchant' });
      } catch (blockchainError) {
        console.warn('Blockchain registration failed:', blockchainError);
        toast.success('Merchant added (blockchain registration pending)', { id: 'add-merchant' });
      }
      
      // Refresh list
      await loadMerchants();
      setShowAddModal(false);
      setFormData({
        business_name: '',
        wallet_address: '',
        category: 'food',
        business_address: '',
        business_license: '',
      });
      
    } catch (error) {
      console.error('Failed to add merchant:', error);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.wallet_address?.[0]
        || error.response?.data?.business_name?.[0]
        || (typeof error.response?.data === 'string' ? error.response.data : null)
        || 'Failed to add merchant';
      toast.error(errorMessage, { id: 'add-merchant' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (merchantId, currentStatus) => {
    try {
      await approvedMerchantApi.toggleActive(merchantId);
      toast.success(currentStatus ? 'Merchant deactivated' : 'Merchant activated');
      await loadMerchants();
    } catch (error) {
      toast.error('Failed to update merchant status');
    }
  };

  const handleRegisterOnChain = async (merchantId) => {
    try {
      toast.loading('Registering on blockchain...', { id: 'register' });
      await approvedMerchantApi.registerOnChain(merchantId);
      toast.success('Registered on blockchain!', { id: 'register' });
      await loadMerchants();
    } catch (error) {
      toast.error('Failed to register on blockchain', { id: 'register' });
    }
  };

  const getCategoryIcon = (category) => {
    const cat = categories.find(c => c.value === category);
    return cat?.icon || '🏪';
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
          <h1 className="text-2xl font-bold text-gray-900">Approved Merchants</h1>
          <p className="text-gray-600">Manage merchants where beneficiaries can spend their relief funds</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700"
        >
          + Add Merchant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Merchants</p>
          <p className="text-2xl font-bold text-gray-900">{merchants.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{merchants.filter(m => m.is_active).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">On-Chain</p>
          <p className="text-2xl font-bold text-blue-600">{merchants.filter(m => m.is_registered_on_chain).length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total Received</p>
          <p className="text-2xl font-bold text-purple-600">
            ${merchants.reduce((sum, m) => sum + parseFloat(m.total_received || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Merchants List */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">On-Chain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {merchants.length > 0 ? (
                merchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                          {getCategoryIcon(merchant.category)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{merchant.business_name}</p>
                          <p className="text-sm text-gray-500">{merchant.business_address?.slice(0, 30)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize text-sm text-gray-700">{merchant.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {merchant.wallet_address?.slice(0, 6)}...{merchant.wallet_address?.slice(-4)}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        merchant.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {merchant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {merchant.is_registered_on_chain ? (
                        <span className="text-green-600">✓ Registered</span>
                      ) : (
                        <button
                          onClick={() => handleRegisterOnChain(merchant.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Register →
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium">${parseFloat(merchant.total_received || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleActive(merchant.id, merchant.is_active)}
                        className={`text-sm px-3 py-1 rounded ${
                          merchant.is_active 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {merchant.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No merchants added yet. Click "Add Merchant" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Merchant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">🏪 Add Approved Merchant</h2>
            <p className="text-gray-600 mb-4">
              Add a merchant where beneficiaries can spend their relief funds. The merchant will be registered on-chain.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="Local Grocery Store"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wallet Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="wallet_address"
                  value={formData.wallet_address}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleChange}
                  placeholder="123 Main St, Nairobi"
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business License (Optional)</label>
                <input
                  type="text"
                  name="business_license"
                  value={formData.business_license}
                  onChange={handleChange}
                  placeholder="License number"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-300 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Merchant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
