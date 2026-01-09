import { useState, useEffect } from 'react';
import { api } from '../../services/api';

export default function AuditorReports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await api.get('/transactions/stats/');
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({
          total_transactions: 0,
          total_volume: 0,
          total_campaigns: 0,
          total_beneficiaries: 0,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [dateRange]);

  const reportTypes = [
    { id: 'summary', name: 'Summary Report', icon: '📊' },
    { id: 'transactions', name: 'Transaction Report', icon: '💳' },
    { id: 'campaigns', name: 'Campaign Report', icon: '🎯' },
    { id: 'compliance', name: 'Compliance Report', icon: '✅' },
  ];

  const generateReport = () => {
    // In a real app, this would generate and download a report
    alert(`Generating ${reportType} report for ${dateRange}...`);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Reports</h1>
          <p className="text-gray-500">Generate and download comprehensive audit reports</p>
        </div>
        <button
          onClick={generateReport}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
        >
          Generate Report
        </button>
      </div>

      {/* Report Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
            <div className="grid grid-cols-2 gap-3">
              {reportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    reportType === type.id
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <p className="mt-2 text-sm font-medium text-gray-900">{type.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💳</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_transactions || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">💰</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Volume</p>
              <p className="text-2xl font-bold text-gray-900">
                ${parseFloat(stats?.total_volume || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🎯</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_campaigns || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👥</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Beneficiaries</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_beneficiaries || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {[
            { name: 'Weekly Summary Report', date: '2024-01-15', type: 'summary', size: '245 KB' },
            { name: 'Transaction Audit Q4 2023', date: '2024-01-01', type: 'transactions', size: '1.2 MB' },
            { name: 'Campaign Performance Report', date: '2023-12-15', type: 'campaigns', size: '890 KB' },
            { name: 'Annual Compliance Report 2023', date: '2023-12-31', type: 'compliance', size: '3.4 MB' },
          ].map((report, index) => (
            <div key={index} className="p-4 flex items-center justify-between hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📄</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-sm text-gray-500">{report.date} • {report.size}</p>
                </div>
              </div>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Options</h2>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span>📊</span>
            <span className="text-sm font-medium">Export as CSV</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span>📑</span>
            <span className="text-sm font-medium">Export as PDF</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span>📈</span>
            <span className="text-sm font-medium">Export as Excel</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <span>🔗</span>
            <span className="text-sm font-medium">Generate API Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
