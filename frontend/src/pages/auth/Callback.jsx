import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../stores/authStore';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { initialize } = useAuthStore();
  const [debugInfo, setDebugInfo] = useState('Processing authentication...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setDebugInfo('Getting session from URL...');
        
        // Get the session from URL hash (Supabase puts tokens there after OAuth)
        const { data, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('Auth error:', authError);
          setError(authError.message);
          setDebugInfo(`Error: ${authError.message}`);
          return;
        }

        console.log('Session data:', data);
        
        if (data.session) {
          const user = data.session.user;
          const role = user.user_metadata?.role;
          
          setDebugInfo(`Logged in as: ${user.email}, Role: ${role || 'none'}`);
          console.log('User metadata:', user.user_metadata);
          
          // Re-initialize auth store with the new session
          await initialize();
          
          // Small delay to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirect based on role
          if (!role) {
            console.log('No role - redirecting to role selection');
            navigate('/auth/select-role', { replace: true });
          } else if (role === 'admin' || role === 'ngo') {
            navigate('/admin', { replace: true });
          } else if (role === 'beneficiary') {
            navigate('/beneficiary', { replace: true });
          } else if (role === 'donor') {
            navigate('/donor', { replace: true });
          } else if (role === 'auditor') {
            navigate('/auditor', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          setDebugInfo('No session found. Redirecting to login...');
          console.log('No session found');
          setTimeout(() => navigate('/login', { replace: true }), 2000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError(err.message);
        setDebugInfo(`Error: ${err.message}`);
      }
    };

    handleCallback();
  }, [navigate, initialize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
      <div className="text-center text-white">
        {error ? (
          <>
            <span className="text-5xl mb-4 block">❌</span>
            <h2 className="text-xl font-semibold">Authentication Error</h2>
            <p className="text-red-200 mt-2">{error}</p>
            <button 
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-white text-primary-600 rounded-lg font-medium"
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Signing you in...</h2>
            <p className="text-primary-200 mt-2">Please wait while we complete authentication</p>
            <p className="text-primary-300 text-xs mt-4">{debugInfo}</p>
          </>
        )}
      </div>
    </div>
  );
}
