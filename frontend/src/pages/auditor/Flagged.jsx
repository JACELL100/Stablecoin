import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function AuditorFlagged() {
  const [flaggedItems, setFlaggedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('transactions');

  useEffect(() => {
    const fetchFlaggedItems = async () => {
      try {
        setLoading(true);
        // Fetch transactions that are flagged or suspicious
        const response = await api.get('/transactions/logs/?status=flagged');
        setFlaggedItems(response.data.results || response.data);
      } catch (error) {
        console.error('Error fetching flagged items:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFlaggedItems();
  }, [activeTab]);

  const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleReview = async (itemId, action) => {
    try {
      // API call to mark item as reviewed
      await api.post(`/transactions/logs/${itemId}/review/`, { action });
      // Refresh the list
      setFlaggedItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error reviewing item:', error);
    }
  };

  const tabs = [
    { id: 'transactions', name: 'Flagged Transactions', count: flaggedItems.length },
    { id: 'accounts', name: 'Suspicious Accounts', count: 0 },
    { id: 'patterns', name: 'Unusual Patterns', count: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Flagged Items</h1>
        <p className="text-gray-500">Review transactions and accounts flagged for suspicious activity</p>
      </div>

      {/* Alert Banner */}
      {flaggedItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-medium text-orange-800">Attention Required</p>
            <p className="text-sm text-orange-600">
              There are {flaggedItems.length} items that require your review.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {flaggedItems.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <span className="text-4xl">✅</span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">All Clear!</h3>
              <p className="mt-2 text-gray-500">No flagged items require your attention.</p>
            </div>
          ) : (
            flaggedItems.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-orange-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          Flagged Transaction
                        </h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          {item.flag_reason || 'Suspicious Activity'}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Transaction Hash</p>
                          <p className="font-mono">{formatAddress(item.tx_hash)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Amount</p>
                          <p className="font-semibold text-red-600">
                            ${parseFloat(item.amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">From</p>
                          <p className="font-mono">{formatAddress(item.from_address)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">To</p>
                          <p className="font-mono">{formatAddress(item.to_address)}</p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Reason for flagging:</span>{' '}
                          {item.flag_details || 'This transaction has been automatically flagged by the ML fraud detection system for unusual patterns.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-3">
                  <button
                    onClick={() => handleReview(item.id, 'dismiss')}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => handleReview(item.id, 'investigate')}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
                  >
                    Mark for Investigation
                  </button>
                  <button
                    onClick={() => handleReview(item.id, 'approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Approve Transaction
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
