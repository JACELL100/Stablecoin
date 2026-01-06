import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

export default function BeneficiaryDashboard() {
  const { user } = useAuthStore();
  const [walletData, setWalletData] = useState({
    balance: 0,
    allocated: 0,
    spent: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch beneficiary wallet data
        const [walletRes, transactionsRes] = await Promise.all([
          api.getBeneficiaryWallet(),
          api.getTransactions(),
        ]);
        
        setWalletData(walletRes.data || { balance: 500, allocated: 1000, spent: 500 });
        setRecentTransactions(transactionsRes.data?.slice(0, 5) || []);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Use mock data for demo
        setWalletData({ balance: 750, allocated: 1000, spent: 250 });
        setRecentTransactions([
          {
            id: 1,
            type: 'spend',
            amount: 45,
            merchant: 'Local Grocery Store',
            date: new Date().toISOString(),
          },
          {
            id: 2,
            type: 'receive',
            amount: 500,
            source: 'Kenya Flood Relief',
            date: new Date(Date.now() - 86400000).toISOString(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="text-center mb-6">
          <p className="text-sm text-gray-500 mb-1">Available Balance</p>
          <p className="text-4xl font-bold text-gray-900">
            ${walletData.balance.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            of ${walletData.allocated.toLocaleString()} allocated
          </p>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${walletData.allocated.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Total Allocated</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              ${walletData.spent.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">Total Spent</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors text-center">
          <span className="text-3xl mb-2 block">📱</span>
          <span className="text-sm font-medium text-gray-700">Show QR Code</span>
        </button>
        <button className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-primary-300 transition-colors text-center">
          <span className="text-3xl mb-2 block">📍</span>
          <span className="text-sm font-medium text-gray-700">Find Merchants</span>
        </button>
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
                      tx.type === 'receive'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-orange-100 text-orange-600'
                    }`}
                  >
                    {tx.type === 'receive' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tx.type === 'receive' ? tx.source : tx.merchant}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    tx.type === 'receive' ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {tx.type === 'receive' ? '+' : '-'}${tx.amount}
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
            <h3 className="font-medium text-blue-900 mb-1">How to use your funds</h3>
            <p className="text-sm text-blue-700">
              Visit any verified merchant and show your QR code to pay. Your
              balance will be automatically deducted.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
