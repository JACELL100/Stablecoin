import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Campaigns', href: '/campaigns' },
  { name: 'Transparency', href: '/transparency' },
  { name: 'Audit Explorer', href: '/audit' },
  { name: 'About', href: '/about' },
];

export default function PublicLayout({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  const getDashboardLink = () => {
    if (!user?.role) return '/login';
    switch (user.role) {
      case 'admin':
      case 'ngo':
        return '/admin';
      case 'beneficiary':
        return '/beneficiary';
      case 'donor':
        return '/donor';
      case 'auditor':
        return '/audit';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <span className="font-bold text-xl text-gray-900">ReliefChain</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-primary-600'
                        : 'text-gray-600 hover:text-primary-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  to={getDashboardLink()}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-primary-600 text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🌍</span>
                <span className="font-bold text-xl">ReliefChain</span>
              </div>
              <p className="text-gray-400 text-sm max-w-md">
                Transparent, blockchain-powered disaster relief distribution.
                Every dollar tracked, every transaction verified, every
                beneficiary protected.
              </p>
            </div>

            {/* Links */}
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link to="/campaigns" className="hover:text-white">
                    Active Campaigns
                  </Link>
                </li>
                <li>
                  <Link to="/transparency" className="hover:text-white">
                    Transparency Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/audit" className="hover:text-white">
                    Audit Explorer
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-white">
                    About Us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://sepolia.etherscan.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white"
                  >
                    Etherscan (Sepolia)
                  </a>
                </li>
                <li>
                  <Link to="/docs" className="hover:text-white">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} ReliefChain. Built for humanitarian
              impact.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>Built with ❤️ for hackathon</span>
              <span>•</span>
              <span>Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
