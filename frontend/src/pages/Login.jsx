import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function Login() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithGoogle } = useAuthStore();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await loginWithGoogle();
      // Redirect is handled by Supabase OAuth
    } catch (err) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-4xl">🌍</span>
          <span className="text-2xl font-bold text-white">ReliefChain</span>
        </Link>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome to ReliefChain</h1>
            <p className="text-gray-600 mt-2">
              Sign in to access the transparent relief network
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-6">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          {/* Info */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Secure Authentication</p>
                <p>We use Google Sign-In to keep your account secure. Your data is protected and encrypted.</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-2xl block mb-1">🔒</span>
              <p className="text-xs text-gray-500">Secure</p>
            </div>
            <div>
              <span className="text-2xl block mb-1">⚡</span>
              <p className="text-xs text-gray-500">Fast</p>
            </div>
            <div>
              <span className="text-2xl block mb-1">🌍</span>
              <p className="text-xs text-gray-500">Global</p>
            </div>
          </div>
        </div>

        <p className="text-center text-primary-200 text-sm mt-8">
          By continuing, you agree to ReliefChain's Terms of Service
        </p>
      </div>
    </div>
  );
}
