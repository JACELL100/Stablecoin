import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const roles = [
  {
    id: 'beneficiary',
    title: 'Beneficiary',
    description: 'Receive relief funds and use them at verified merchants',
    icon: '👤',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    selectedColor: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500',
  },
  {
    id: 'donor',
    title: 'Donor',
    description: 'Contribute funds to relief campaigns and track their impact',
    icon: '💝',
    color: 'bg-pink-50 border-pink-200 hover:border-pink-400',
    selectedColor: 'bg-pink-100 border-pink-500 ring-2 ring-pink-500',
  },
  {
    id: 'admin',
    title: 'Admin / NGO',
    description: 'Full access - create campaigns, mint tokens, manage beneficiaries',
    icon: '🏢',
    color: 'bg-green-50 border-green-200 hover:border-green-400',
    selectedColor: 'bg-green-100 border-green-500 ring-2 ring-green-500',
  },
  {
    id: 'auditor',
    title: 'Auditor',
    description: 'Read-only access to monitor all transactions and verify distribution',
    icon: '🔍',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
    selectedColor: 'bg-purple-100 border-purple-500 ring-2 ring-purple-500',
  },
];

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { user, updateUserRole } = useAuthStore();

  const handleSubmit = async () => {
    if (!selectedRole) {
      setError('Please select a role to continue');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateUserRole(selectedRole);
      
      // Redirect based on role
      if (selectedRole === 'admin') {
        navigate('/admin', { replace: true });
      } else if (selectedRole === 'beneficiary') {
        navigate('/beneficiary', { replace: true });
      } else if (selectedRole === 'donor') {
        navigate('/donor', { replace: true });
      } else if (selectedRole === 'auditor') {
        navigate('/auditor', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to set role. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🌍</span>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to ReliefChain!</h1>
          <p className="text-primary-200">
            Hi {user?.full_name || 'there'}! Please select how you'd like to use the platform.
          </p>
        </div>

        {/* Role Selection Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Role</h2>
          <p className="text-gray-600 text-sm mb-6">
            This determines your access and features. <span className="font-medium text-red-600">This cannot be changed later.</span>
          </p>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Role Options */}
          <div className="space-y-3 mb-6">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selectedRole === role.id ? role.selectedColor : role.color
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{role.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{role.title}</h3>
                    <p className="text-sm text-gray-600">{role.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedRole === role.id 
                      ? 'border-primary-600 bg-primary-600' 
                      : 'border-gray-300'
                  }`}>
                    {selectedRole === role.id && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || loading}
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up your account...' : 'Continue'}
          </button>

          {/* Info */}
          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Important</p>
                <p>Your role selection is permanent and tied to your Google account. Choose carefully based on how you intend to use ReliefChain.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
