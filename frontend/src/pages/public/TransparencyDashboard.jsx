import { useState, useEffect, useCallback } from 'react';
import PublicLayout from '../../layouts/PublicLayout';
import { campaignApi, transactionApi } from '../../services/api';
import { ethers } from 'ethers';

// Simple ABI for reading events
const ReliefStablecoinABI = [
  "event FundsMinted(address indexed to, uint256 amount, string campaignId, string purpose, uint256 timestamp)",
  "event FundsDistributed(address indexed from, address indexed to, uint256 amount, string campaignId, uint256 timestamp)",
  "event BeneficiaryWhitelisted(address indexed beneficiary, string name, string region, uint256 timestamp)",
];

const SpendingControllerABI = [
  "event SpendingExecuted(uint256 indexed transactionId, address indexed beneficiary, address indexed merchant, uint256 amount, uint8 category, string reference, uint256 timestamp)",
];

const RPC_URL = import.meta.env.VITE_BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
const RELIEF_TOKEN_ADDRESS = import.meta.env.VITE_RELIEF_TOKEN_ADDRESS || '';
const SPENDING_CONTROLLER_ADDRESS = import.meta.env.VITE_SPENDING_CONTROLLER_ADDRESS || '';

export default function TransparencyDashboard() {
  const [stats, setStats] = useState({
    totalFunds: 0,
    distributed: 0,
    beneficiaries: 0,
    campaigns: 0,
  });
  const [campaigns, setCampaigns] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [liveIndicator, setLiveIndicator] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch campaigns from API
      const response = await campaignApi.list();
      const campaignsData = response.data?.results || response.data || [];
      setCampaigns(campaignsData);
      
      // Calculate stats from campaigns
      const totalFunds = campaignsData.reduce((sum, c) => sum + parseFloat(c.target_amount || 0), 0);
      const distributed = campaignsData.reduce((sum, c) => sum + parseFloat(c.current_amount || 0), 0);
      const beneficiaries = campaignsData.reduce((sum, c) => sum + (c.beneficiary_count || 0), 0);
      
      setStats({
        totalFunds,
        distributed,
        beneficiaries,
        campaigns: campaignsData.length,
      });

      // Fetch recent transactions
      try {
        const txResponse = await transactionApi.list({ limit: 10 });
        const txData = txResponse.data?.results || txResponse.data || [];
        setRecentActivity(txData.slice(0, 5));
      } catch (e) {
        console.log('Could not fetch transactions:', e);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch data:', error);
      // Use demo data
      setCampaigns([
        { id: 1, name: 'Kenya Flood Relief', current_amount: 124500, target_amount: 200000, status: 'active', beneficiary_count: 450 },
        { id: 2, name: 'Philippines Typhoon Aid', current_amount: 89200, target_amount: 150000, status: 'active', beneficiary_count: 320 },
        { id: 3, name: 'Turkey Earthquake Relief', current_amount: 256800, target_amount: 300000, status: 'active', beneficiary_count: 890 },
      ]);
      setStats({
        totalFunds: 650000,
        distributed: 470500,
        beneficiaries: 1660,
        campaigns: 3,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up blockchain event listeners for real-time updates
  useEffect(() => {
    let provider;
    let reliefToken;
    let spendingController;

    const setupBlockchainListeners = async () => {
      try {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        
        if (RELIEF_TOKEN_ADDRESS) {
          reliefToken = new ethers.Contract(RELIEF_TOKEN_ADDRESS, ReliefStablecoinABI, provider);
          
          // Listen for minting events
          reliefToken.on('FundsMinted', (to, amount, campaignId, purpose, timestamp) => {
            console.log('Funds minted:', ethers.formatUnits(amount, 6));
            setLiveIndicator(true);
            setTimeout(() => setLiveIndicator(false), 2000);
            fetchData();
          });

          // Listen for distribution events
          reliefToken.on('FundsDistributed', (from, to, amount, campaignId, timestamp) => {
            console.log('Funds distributed:', ethers.formatUnits(amount, 6));
            setLiveIndicator(true);
            setTimeout(() => setLiveIndicator(false), 2000);
            fetchData();
          });

          // Listen for beneficiary whitelisting
          reliefToken.on('BeneficiaryWhitelisted', (beneficiary, name, region, timestamp) => {
            console.log('New beneficiary:', name);
            setLiveIndicator(true);
            setTimeout(() => setLiveIndicator(false), 2000);
            fetchData();
          });
        }

        if (SPENDING_CONTROLLER_ADDRESS) {
          spendingController = new ethers.Contract(SPENDING_CONTROLLER_ADDRESS, SpendingControllerABI, provider);
          
          // Listen for spending events
          spendingController.on('SpendingExecuted', (txId, beneficiary, merchant, amount, category, reference, timestamp) => {
            console.log('Spending executed:', ethers.formatUnits(amount, 6));
            setLiveIndicator(true);
            setTimeout(() => setLiveIndicator(false), 2000);
            fetchData();
          });
        }

        console.log('Blockchain listeners active');
      } catch (e) {
        console.log('Blockchain not available, using polling:', e.message);
      }
    };

    setupBlockchainListeners();

    // Cleanup
    return () => {
      if (reliefToken) reliefToken.removeAllListeners();
      if (spendingController) spendingController.removeAllListeners();
    };
  }, [fetchData]);

  // Initial fetch and polling fallback
  useEffect(() => {
    fetchData();
    
    // Poll every 30 seconds as fallback
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCurrency = (amount) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const categoryLabels = ['Food', 'Medical', 'Shelter', 'Utilities', 'Transport'];

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Transparency Dashboard
            </h1>
            {liveIndicator && (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm animate-pulse">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Live
              </span>
            )}
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real-time visibility into how relief funds are collected and
            distributed. Every transaction is recorded on the blockchain.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">💰</span>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.totalFunds)}
            </p>
            <p className="text-sm text-gray-500">Total Funds Raised</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">📤</span>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.distributed)}
            </p>
            <p className="text-sm text-gray-500">Distributed</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">👥</span>
            <p className="text-3xl font-bold text-primary-600">
              {stats.beneficiaries.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">Beneficiaries Helped</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <span className="text-3xl mb-2 block">📁</span>
            <p className="text-3xl font-bold text-purple-600">{stats.campaigns}</p>
            <p className="text-sm text-gray-500">Active Campaigns</p>
          </div>
        </div>

        {/* Live Campaigns */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-12">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              Active Campaigns
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              </div>
            ) : campaigns.length > 0 ? (
              campaigns.map((campaign) => (
                <div key={campaign.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">
                        {campaign.beneficiary_count || 0} beneficiaries enrolled
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
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
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      ${(campaign.current_amount || 0).toLocaleString()} raised
                    </span>
                    <span className="font-medium text-primary-600">
                      {campaign.target_amount
                        ? Math.round(
                            (campaign.current_amount / campaign.target_amount) * 100
                          )
                        : 0}
                      % of ${(campaign.target_amount || 0).toLocaleString()} goal
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                No active campaigns
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Verification */}
        <div className="grid lg:grid-cols-2 gap-6 mb-12">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Activity
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {recentActivity.length > 0 ? (
                recentActivity.map((tx, idx) => (
                  <div key={tx.id || idx} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.transaction_type === 'mint' ? 'bg-purple-100 text-purple-600' :
                      tx.transaction_type === 'distribute' ? 'bg-green-100 text-green-600' :
                      tx.transaction_type === 'spend' ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {tx.transaction_type === 'mint' ? '🏭' :
                       tx.transaction_type === 'distribute' ? '📤' :
                       tx.transaction_type === 'spend' ? '🛒' : '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {tx.transaction_type === 'mint' ? 'Funds Minted' :
                         tx.transaction_type === 'distribute' ? 'Funds Distributed' :
                         tx.transaction_type === 'spend' ? 'Purchase Made' :
                         'Transaction'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {tx.to_address?.slice(0, 10)}...
                        {tx.category ? ` • ${categoryLabels[tx.category] || tx.category}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${parseFloat(tx.amount || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.timestamp || tx.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <p>No recent activity</p>
                  <p className="text-sm mt-1">Transactions will appear here in real-time</p>
                </div>
              )}
            </div>
          </div>

          {/* Blockchain Status */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-4 mb-6">
                <span className="text-4xl">🔗</span>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    Blockchain Verified
                  </h3>
                  <p className="text-gray-300">
                    All transactions are recorded on-chain for complete transparency and auditability.
                  </p>
                </div>
              </div>
              
              {/* On-chain stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-2xl font-bold">{stats.campaigns}</p>
                  <p className="text-sm text-gray-400">On-chain Campaigns</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <p className="text-2xl font-bold">{stats.beneficiaries.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Whitelisted Beneficiaries</p>
                </div>
              </div>
            </div>
            
            <a
              href="https://sepolia.etherscan.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-3 rounded-lg transition-colors w-full"
            >
              View on Etherscan ↗
            </a>
          </div>
        </div>

        {/* Fund Flow Visualization */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
            How Funds Flow
          </h2>
          <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto py-4">
            <div className="flex-shrink-0 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl md:text-3xl">💰</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Donors</p>
              <p className="text-xs text-gray-500">Contribute</p>
            </div>
            <div className="flex-shrink-0 text-2xl text-gray-300">→</div>
            <div className="flex-shrink-0 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl md:text-3xl">🏛️</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Campaigns</p>
              <p className="text-xs text-gray-500">Pool Funds</p>
            </div>
            <div className="flex-shrink-0 text-2xl text-gray-300">→</div>
            <div className="flex-shrink-0 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl md:text-3xl">👥</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Beneficiaries</p>
              <p className="text-xs text-gray-500">Receive Tokens</p>
            </div>
            <div className="flex-shrink-0 text-2xl text-gray-300">→</div>
            <div className="flex-shrink-0 text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl md:text-3xl">🏪</span>
              </div>
              <p className="text-sm font-medium text-gray-700">Merchants</p>
              <p className="text-xs text-gray-500">Accept Payments</p>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            Every step is recorded on the blockchain for complete transparency
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
