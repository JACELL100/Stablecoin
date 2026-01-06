import { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const navigation = [
  { name: 'Dashboard', href: '/beneficiary', icon: '🏠' },
  { name: 'My Wallet', href: '/beneficiary/wallet', icon: '💳' },
  { name: 'Transaction History', href: '/beneficiary/history', icon: '📜' },
  { name: 'Find Merchants', href: '/beneficiary/merchants', icon: '📍' },
  { name: 'Help & Support', href: '/beneficiary/help', icon: '❓' },
];

export default function BeneficiaryLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/beneficiary" className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <span className="font-bold text-xl">ReliefChain</span>
            </Link>

            <button
              className="md:hidden p-2 rounded-lg hover:bg-primary-700"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? '✕' : '☰'}
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navigation.slice(0, 4).map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary-700 font-medium'
                        : 'hover:bg-primary-700/50'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-primary-200">Beneficiary</p>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg hover:bg-primary-700"
                title="Sign out"
              >
                🚪
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <nav className="md:hidden border-t border-primary-500 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-700 font-medium'
                      : 'hover:bg-primary-700/50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
            <div className="border-t border-primary-500 pt-4 mt-4">
              <div className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="font-medium">{user?.full_name}</p>
                  <p className="text-sm text-primary-200">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg hover:bg-primary-700"
                >
                  🚪
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Bottom navigation for mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigation.slice(0, 4).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg ${
                  isActive
                    ? 'text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs">{item.name.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
