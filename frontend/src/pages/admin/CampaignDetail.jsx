import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignApi, beneficiaryApi } from '../../services/api';
import { blockchain } from '../../services/blockchain';
import toast from 'react-hot-toast';

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showMintModal, setShowMintModal] = useState(false);
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [showAddMerchantModal, setShowAddMerchantModal] = useState(false);
  
  // Form states
  const [mintAmount, setMintAmount] = useState('');
  const [mintPurpose, setMintPurpose] = useState('');
  const [minting, setMinting] = useState(false);
  
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [distributeAmount, setDistributeAmount] = useState('');
  const [foodAllowance, setFoodAllowance] = useState('');
  const [medicalAllowance, setMedicalAllowance] = useState('');
  const [shelterAllowance, setShelterAllowance] = useState('');
  const [utilitiesAllowance, setUtilitiesAllowance] = useState('');
  const [transportAllowance, setTransportAllowance] = useState('');
  const [distributing, setDistributing] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignRes, beneficiariesRes] = await Promise.all([
        campaignApi.get(id),
        beneficiaryApi.list({ verification_status: 'verified' }),
      ]);
      
      setCampaign(campaignRes.data);
      setBeneficiaries(beneficiariesRes.data?.results || beneficiariesRes.data || []);
      setAllocations(campaignRes.data?.allocations || []);
    } catch (error) {
      console.error('Failed to load campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!mintAmount || parseFloat(mintAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setMinting(true);
    try {
      toast.loading('Minting tokens on blockchain...', { id: 'mint' });
      
      const response = await campaignApi.mintFunds(id, parseFloat(mintAmount), mintPurpose || 'Campaign funding');
      
      toast.success(`Successfully minted $${mintAmount} drUSD!`, { id: 'mint' });
      
      // Refresh campaign data
      await loadData();
      setShowMintModal(false);
      setMintAmount('');
      setMintPurpose('');
      
    } catch (error) {
      console.error('Minting failed:', error);
      toast.error(error.response?.data?.error || 'Minting failed', { id: 'mint' });
    } finally {
      setMinting(false);
    }
  };

  const handleDistribute = async () => {
    if (!selectedBeneficiary || !distributeAmount) {
      toast.error('Please select a beneficiary and enter an amount');
      return;
    }
    
    const amount = parseFloat(distributeAmount);
    if (amount <= 0 || amount > (campaign?.remaining_amount || 0)) {
      toast.error('Invalid amount');
      return;
    }
    
    setDistributing(true);
    try {
      toast.loading('Distributing funds...', { id: 'distribute' });
      
      const response = await campaignApi.distribute(id, {
        beneficiary_id: selectedBeneficiary,
        amount,
        food_allowance: parseFloat(foodAllowance) || 0,
        medical_allowance: parseFloat(medicalAllowance) || 0,
        shelter_allowance: parseFloat(shelterAllowance) || 0,
        utilities_allowance: parseFloat(utilitiesAllowance) || 0,
        transport_allowance: parseFloat(transportAllowance) || 0,
      });
      
      toast.success(`Successfully distributed $${amount} to beneficiary!`, { id: 'distribute' });
      
      // Refresh data
      await loadData();
      setShowDistributeModal(false);
      resetDistributeForm();
      
    } catch (error) {
      console.error('Distribution failed:', error);
      toast.error(error.response?.data?.error || 'Distribution failed', { id: 'distribute' });
    } finally {
      setDistributing(false);
    }
  };

  const resetDistributeForm = () => {
    setSelectedBeneficiary('');
    setDistributeAmount('');
    setFoodAllowance('');
    setMedicalAllowance('');
    setShelterAllowance('');
    setUtilitiesAllowance('');
    setTransportAllowance('');
  };

  const handleActivate = async () => {
    try {
      await campaignApi.activate(id);
      toast.success('Campaign activated!');
      await loadData();
    } catch (error) {
      toast.error('Failed to activate campaign');
    }
  };

  const handlePause = async () => {
    try {
      await campaignApi.pause(id);
      toast.success('Campaign paused');
      await loadData();
    } catch (error) {
      toast.error('Failed to pause campaign');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Campaign not found</h2>
        <button onClick={() => navigate('/admin/campaigns')} className="mt-4 text-primary-600">
          ← Back to Campaigns
        </button>
      </div>
    );
  }

  const progressPercentage = campaign.target_amount 
    ? Math.min((campaign.raised_amount / campaign.target_amount) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/admin/campaigns')} className="text-gray-500 hover:text-gray-700 mb-2">
            ← Back to Campaigns
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-gray-600">{campaign.description}</p>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'pending' && (
            <button onClick={handleActivate} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Activate Campaign
            </button>
          )}
          {campaign.status === 'active' && (
            <button onClick={handlePause} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
              Pause
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Target Amount</p>
          <p className="text-2xl font-bold text-gray-900">${campaign.target_amount?.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Raised / Minted</p>
          <p className="text-2xl font-bold text-green-600">${campaign.raised_amount?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Distributed</p>
          <p className="text-2xl font-bold text-blue-600">${campaign.distributed_amount?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <p className="text-sm text-gray-500">Remaining</p>
          <p className="text-2xl font-bold text-orange-600">${campaign.remaining_amount?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Funding Progress</span>
          <span className="text-sm font-medium text-primary-600">{progressPercentage.toFixed(1)}%</span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowMintModal(true)}
          disabled={campaign.status !== 'active'}
          className="bg-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🏭</span>
          Mint Stablecoins
        </button>
        
        <button
          onClick={() => setShowDistributeModal(true)}
          disabled={campaign.status !== 'active' || (campaign.remaining_amount || 0) <= 0}
          className="bg-green-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span className="text-2xl">📤</span>
          Distribute to Beneficiary
        </button>
        
        <button
          onClick={() => setShowAddMerchantModal(true)}
          className="bg-orange-600 text-white py-4 px-6 rounded-xl font-semibold hover:bg-orange-700 flex items-center justify-center gap-2"
        >
          <span className="text-2xl">🏪</span>
          Add Approved Merchant
        </button>
      </div>

      {/* Allocations / Distributions */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Fund Distributions</h2>
        </div>
        <div className="divide-y">
          {allocations.length > 0 ? (
            allocations.map((alloc) => (
              <div key={alloc.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600">👤</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{alloc.beneficiary_name || 'Beneficiary'}</p>
                    <p className="text-sm text-gray-500">{alloc.distributed_at || 'Pending'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${alloc.distributed_amount || alloc.amount}</p>
                  <p className="text-xs text-gray-500">{alloc.status}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No distributions yet. Click "Distribute to Beneficiary" to start.
            </div>
          )}
        </div>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">🏭 Mint Stablecoins</h2>
            <p className="text-gray-600 mb-4">
              Mint new drUSD tokens for this campaign. These will be available for distribution to beneficiaries.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (drUSD)</label>
                <input
                  type="number"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="10000"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={mintPurpose}
                  onChange={(e) => setMintPurpose(e.target.value)}
                  placeholder="Emergency relief funding"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMintModal(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleMint}
                disabled={minting || !mintAmount}
                className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {minting ? 'Minting...' : 'Mint Tokens'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Distribute Modal */}
      {showDistributeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 my-8">
            <h2 className="text-xl font-bold mb-4">📤 Distribute Funds</h2>
            <p className="text-gray-600 mb-4">
              Distribute funds to a verified beneficiary. This will whitelist them on-chain and set spending allowances by category.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Beneficiary</label>
                <select
                  value={selectedBeneficiary}
                  onChange={(e) => setSelectedBeneficiary(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Choose a beneficiary...</option>
                  {beneficiaries.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.user?.full_name || b.user?.email} - {b.region}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (drUSD)</label>
                <input
                  type="number"
                  value={distributeAmount}
                  onChange={(e) => setDistributeAmount(e.target.value)}
                  placeholder="500"
                  max={campaign.remaining_amount}
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Available: ${campaign.remaining_amount?.toLocaleString()}</p>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Category Allowances (Optional)</p>
                <p className="text-xs text-gray-500 mb-3">Set spending limits by category. Leave empty to allow full amount for all categories.</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">🍎 Food</label>
                    <input
                      type="number"
                      value={foodAllowance}
                      onChange={(e) => setFoodAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full border rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">🏥 Medical</label>
                    <input
                      type="number"
                      value={medicalAllowance}
                      onChange={(e) => setMedicalAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full border rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">🏠 Shelter</label>
                    <input
                      type="number"
                      value={shelterAllowance}
                      onChange={(e) => setShelterAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full border rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">💡 Utilities</label>
                    <input
                      type="number"
                      value={utilitiesAllowance}
                      onChange={(e) => setUtilitiesAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full border rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">🚗 Transport</label>
                    <input
                      type="number"
                      value={transportAllowance}
                      onChange={(e) => setTransportAllowance(e.target.value)}
                      placeholder="0"
                      className="w-full border rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowDistributeModal(false); resetDistributeForm(); }}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDistribute}
                disabled={distributing || !selectedBeneficiary || !distributeAmount}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {distributing ? 'Distributing...' : 'Distribute Funds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
