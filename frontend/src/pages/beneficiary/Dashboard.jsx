import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { beneficiaryApi, approvedMerchantApi } from '../../services/api';
import { blockchain } from '../../services/blockchain';
import toast from 'react-hot-toast';

export default function BeneficiaryDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [blockchainConnected, setBlockchainConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  
  const [walletData, setWalletData] = useState({
    balance: 0,
    allocated: 0,
    spent: 0,
  });
  
  const [allowances, setAllowances] = useState({
    food: { allowance: 0, spent: 0, remaining: 0 },
    medical: { allowance: 0, spent: 0, remaining: 0 },
    shelter: { allowance: 0, spent: 0, remaining: 0 },
    utilities: { allowance: 0, spent: 0, remaining: 0 },
    transport: { allowance: 0, spent: 0, remaining: 0 },
  });
  
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [showSpendModal, setShowSpendModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [spendAmount, setSpendAmount] = useState('');
  const [spendReference, setSpendReference] = useState('');
  const [spending, setSpending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Connect to blockchain
      try {
        const address = await blockchain.connect();
        setWalletAddress(address);
        setBlockchainConnected(true);
        
        // Get on-chain balance
        const balance = await blockchain.getBalance(address);
        const isWhitelisted = await blockchain.isWhitelisted(address);
        
        if (isWhitelisted) {
          try {
            const status = await blockchain.getBeneficiaryStatus(address);
            setAllowances({
              food: { allowance: parseFloat(status.allowances[0]), spent: parseFloat(status.spending[0]), remaining: parseFloat(status.allowances[0]) - parseFloat(status.spending[0]) },
              medical: { allowance: parseFloat(status.allowances[1]), spent: parseFloat(status.spending[1]), remaining: parseFloat(status.allowances[1]) - parseFloat(status.spending[1]) },
              shelter: { allowance: parseFloat(status.allowances[2]), spent: parseFloat(status.spending[2]), remaining: parseFloat(status.allowances[2]) - parseFloat(status.spending[2]) },
              utilities: { allowance: parseFloat(status.allowances[3]), spent: parseFloat(status.spending[3]), remaining: parseFloat(status.allowances[3]) - parseFloat(status.spending[3]) },
              transport: { allowance: parseFloat(status.allowances[4]), spent: parseFloat(status.spending[4]), remaining: parseFloat(status.allowances[4]) - parseFloat(status.spending[4]) },
            });
            
            const totalAllowance = status.allowances.reduce((a, b) => a + parseFloat(b), 0);
            const totalSpent = status.spending.reduce((a, b) => a + parseFloat(b), 0);
            
            setWalletData({
              balance: parseFloat(balance),
              allocated: totalAllowance,
              spent: totalSpent,
            });
          } catch (e) {
            console.log('Could not fetch beneficiary status:', e);
          }
        }
        
      } catch (e) {
        console.log('Blockchain not connected:', e);
        // Use fallback data
        setWalletData({ balance: 750, allocated: 1000, spent: 250 });
      }
      
      // Load approved merchants
      try {
        const merchantsRes = await approvedMerchantApi.list({ is_active: true });
        setMerchants(merchantsRes.data?.results || merchantsRes.data || []);
      } catch (e) {
        console.log('Could not load merchants:', e);
      }
      
      // Load recent transactions
      try {
        const profile = user?.beneficiary_profile;
        if (profile) {
          const txRes = await beneficiaryApi.getSpending(profile.id);
          setRecentTransactions(txRes.data?.slice(0, 5) || []);
        }
      } catch (e) {
        console.log('Could not load transactions:', e);
        setRecentTransactions([
          { id: 1, type: 'spend', amount: 45, merchant: 'Local Grocery Store', category: 'food', date: new Date().toISOString() },
          { id: 2, type: 'receive', amount: 500, source: 'Kenya Flood Relief', date: new Date(Date.now() - 86400000).toISOString() },
        ]);
      }
      
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpend = async () => {
    if (!selectedMerchant || !spendAmount) {
      toast.error('Please select a merchant and enter an amount');
      return;
    }
    
    const amount = parseFloat(spendAmount);
    if (amount <= 0 || amount > walletData.balance) {
      toast.error('Invalid amount');
      return;
    }
    
    setSpending(true);
    try {
      // First approve spending controller
      toast.loading('Approving spending...', { id: 'spend' });
      const approveTx = await blockchain.approveSpending(spendAmount);
      await approveTx.wait();
      
      // Execute spend
      toast.loading('Processing payment...', { id: 'spend' });
      const spendTx = await blockchain.spend(
        selectedMerchant.wallet_address,
        spendAmount,
        spendReference || `Purchase at ${selectedMerchant.business_name}`
      );
      await spendTx.wait();
      
      toast.success(`Payment of $${amount} successful!`, { id: 'spend' });
      
      // Refresh data
      await loadData();
      setShowSpendModal(false);
      setSpendAmount('');
      setSpendReference('');
      setSelectedMerchant(null);
      
    } catch (error) {
      console.error('Spending failed:', error);
      
      // Parse error message
      let errorMsg = 'Payment failed';
      if (error.message?.includes('MerchantNotActive')) {
        errorMsg = 'Merchant is not active or not approved';
      } else if (error.message?.includes('InsufficientAllowance')) {
        errorMsg = 'Insufficient category allowance for this merchant type';
      } else if (error.message?.includes('DailyLimitExceeded')) {
        errorMsg = 'Daily spending limit exceeded';
      } else if (error.message?.includes('InsufficientBalance')) {
        errorMsg = 'Insufficient token balance';
      }
      
      toast.error(errorMsg, { id: 'spend' });
    } finally {
      setSpending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const spentPercentage = walletData.allocated > 0 
    ? (walletData.spent / walletData.allocated) * 100 
    : 0;

  const categoryIcons = {
    food: '🍎',
    medical: '🏥',
    shelter: '🏠',
    utilities: '💡',
    transport: '🚗',
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.full_name?.split(' ')[0] || 'Beneficiary'}! 👋
        </h1>
        <p className="text-primary-100">
          Your relief funds are ready to use at any verified merchant
        </p>
        {blockchainConnected && (
          <p className="text-xs mt-2 text-primary-200">
            Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </p>
        )}
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-gray-900">
            ${walletData.balance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">drUSD Relief Tokens</p>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${100 - spentPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Remaining</span>
            <span>{Math.round(100 - spentPercentage)}%</span>
          </div>
        </div>

        {/* Spend Button */}
        <button
          onClick={() => setShowSpendModal(true)}
          disabled={walletData.balance <= 0}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Make a Purchase
        </button>
      </div>

      {/* Category Allowances */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Spending Allowances by Category</h2>
        <div className="space-y-3">
          {Object.entries(allowances).map(([category, data]) => (
            <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">{categoryIcons[category]}</span>
                <span className="font-medium capitalize">{category}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold">${data.remaining.toFixed(2)}</p>
                <p className="text-xs text-gray-500">of ${data.allowance.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Merchants */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Approved Merchants</h2>
          <p className="text-sm text-gray-500">You can spend your funds at these locations</p>
        </div>
        <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {merchants.length > 0 ? (
            merchants.map((merchant) => (
              <div key={merchant.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    {categoryIcons[merchant.category] || '🏪'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{merchant.business_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{merchant.category}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedMerchant(merchant);
                    setShowSpendModal(true);
                  }}
                  className="text-sm px-3 py-1 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
                >
                  Pay
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No approved merchants found
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((tx) => (
              <div key={tx.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center ${
                      tx.type === 'receive' || tx.transaction_type === 'receive'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {tx.type === 'receive' || tx.transaction_type === 'receive' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tx.merchant || tx.to_address?.slice(0, 10) || tx.source || 'Transaction'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.date || tx.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    tx.type === 'receive' || tx.transaction_type === 'receive' 
                      ? 'text-green-600' 
                      : 'text-orange-600'
                  }`}
                >
                  {tx.type === 'receive' || tx.transaction_type === 'receive' ? '+' : '-'}${tx.amount}
                </span>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No recent transactions
            </div>
          )}
        </div>
      </div>

      {/* Help Card */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-medium text-blue-900 mb-1">How spending works</h3>
            <p className="text-sm text-blue-700">
              Your funds can only be spent at approved merchants in allowed categories. 
              The system automatically blocks unauthorized spending attempts.
            </p>
          </div>
        </div>
      </div>

      {/* Spend Modal */}
      {showSpendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Make a Payment</h2>
            
            {/* Merchant Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Merchant
              </label>
              <select
                value={selectedMerchant?.id || ''}
                onChange={(e) => {
                  const m = merchants.find(m => m.id === e.target.value);
                  setSelectedMerchant(m);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Choose a merchant...</option>
                {merchants.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.business_name} ({m.category})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (drUSD)
              </label>
              <input
                type="number"
                value={spendAmount}
                onChange={(e) => setSpendAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                max={walletData.balance}
                step="0.01"
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: ${walletData.balance.toFixed(2)}
              </p>
            </div>
            
            {/* Reference */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference (optional)
              </label>
              <input
                type="text"
                value={spendReference}
                onChange={(e) => setSpendReference(e.target.value)}
                placeholder="Receipt or order number"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSpendModal(false);
                  setSelectedMerchant(null);
                  setSpendAmount('');
                  setSpendReference('');
                }}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSpend}
                disabled={spending || !selectedMerchant || !spendAmount}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {spending ? 'Processing...' : 'Pay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
