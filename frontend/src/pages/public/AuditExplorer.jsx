import { useState, useEffect } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { api } from '../../services/api';

export default function AuditExplorer() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await api.get('/transactions/logs/');
        setTransactions(response.data.results || response.data || []);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        // Demo data
        setTransactions([
          {
            id: 1,
            blockchain_tx_hash: '0x1234...5678',
            transaction_type: 'distribution',
            amount: 500,
            created_at: new Date().toISOString(),
            status: 'confirmed',
          },
          {
            id: 2,
            blockchain_tx_hash: '0xabcd...ef01',
            transaction_type: 'donation',
            amount: 1000,
            created_at: new Date(Date.now() - 3600000).toISOString(),
            status: 'confirmed',
          },
          {
            id: 3,
            blockchain_tx_hash: '0x9876...5432',
            transaction_type: 'spend',
            amount: 75,
            created_at: new Date(Date.now() - 7200000).toISOString(),
            status: 'confirmed',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.blockchain_tx_hash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.transaction_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || tx.transaction_type === filter;
    return matchesSearch && matchesFilter;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'donation':
        return '💚';
      case 'distribution':
        return '📤';
      case 'spend':
        return '🛒';
      case 'refund':
        return '↩️';
      default:
        return '📝';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'donation':
        return 'bg-green-100 text-green-700';
      case 'distribution':
        return 'bg-blue-100 text-blue-700';
      case 'spend':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Audit Explorer
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore every transaction on the blockchain. Complete transparency
            and accountability for all relief fund movements.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by transaction hash or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {['all', 'donation', 'distribution', 'spend'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Transaction History
            </h2>
            <p className="text-sm text-gray-500">
              {filteredTransactions.length} transactions found
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTypeIcon(tx.transaction_type)}</span>
                      <div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                            tx.transaction_type
                          )}`}
                        >
                          {tx.transaction_type}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        ${tx.amount?.toLocaleString() || 0}
                      </p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          tx.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Transaction Hash
                        </p>
                        <code className="text-sm text-gray-700 font-mono">
                          {tx.blockchain_tx_hash || 'Pending...'}
                        </code>
                      </div>
                      {tx.blockchain_tx_hash && (
                        <a
                          href={`https://sepolia.etherscan.io/tx/${tx.blockchain_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View on Etherscan ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <span className="text-4xl mb-4 block">📭</span>
              <p className="text-gray-500">No transactions found</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-start gap-4">
            <span className="text-3xl">ℹ️</span>
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                About Blockchain Verification
              </h3>
              <p className="text-blue-700 text-sm">
                Every transaction in ReliefChain is recorded on the Ethereum
                blockchain (Sepolia testnet). This ensures complete transparency
                and immutability. Anyone can verify any transaction using the
                provided Etherscan links.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
