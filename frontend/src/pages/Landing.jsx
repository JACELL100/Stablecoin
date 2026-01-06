import { Link } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';

const stats = [
  { label: 'Total Funds Distributed', value: '$2.4M+', icon: '💰' },
  { label: 'Beneficiaries Helped', value: '12,500+', icon: '👥' },
  { label: 'Active Campaigns', value: '47', icon: '📁' },
  { label: 'Verified Merchants', value: '890+', icon: '🏪' },
];

const features = [
  {
    title: 'Blockchain Transparency',
    description:
      'Every transaction is recorded on the blockchain, ensuring complete auditability and preventing fraud.',
    icon: '🔗',
  },
  {
    title: 'Real-time Tracking',
    description:
      'Track funds from donation to distribution with live updates and comprehensive dashboards.',
    icon: '📊',
  },
  {
    title: 'Fraud Prevention',
    description:
      'AI-powered fraud detection with geo-fencing, spending limits, and multi-signature approvals.',
    icon: '🛡️',
  },
  {
    title: 'Easy Distribution',
    description:
      'Beneficiaries receive digital vouchers that work with verified merchants in disaster areas.',
    icon: '💳',
  },
];

const steps = [
  {
    step: 1,
    title: 'NGO Creates Campaign',
    description:
      'Organizations create relief campaigns with specific goals and beneficiary criteria.',
  },
  {
    step: 2,
    title: 'Funds Are Collected',
    description:
      'Donations are converted to stablecoins and locked in smart contracts.',
  },
  {
    step: 3,
    title: 'Beneficiaries Enrolled',
    description:
      'Verified beneficiaries receive digital wallets with allocated relief funds.',
  },
  {
    step: 4,
    title: 'Spend at Merchants',
    description:
      'Beneficiaries use their digital vouchers at verified local merchants.',
  },
];

export default function Landing() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
                Transparent Disaster Relief,
                <span className="text-primary-200"> Powered by Blockchain</span>
              </h1>
              <p className="text-lg text-primary-100 mb-8 max-w-lg">
                ReliefChain ensures every dollar reaches those who need it most.
                Track donations in real-time, prevent fraud, and rebuild
                communities with complete transparency.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/login"
                  className="bg-white text-primary-700 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
                >
                  Get Started
                </Link>
                <Link
                  to="/transparency"
                  className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  View Transparency Dashboard
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-white/10 rounded-2xl blur-2xl" />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="text-center mb-6">
                    <span className="text-6xl">🌍</span>
                    <h3 className="text-xl font-semibold mt-4">
                      Live Relief Distribution
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Kenya Flood Relief', progress: 78, amount: '$124,500' },
                      { label: 'Philippines Typhoon', progress: 45, amount: '$89,200' },
                      { label: 'Turkey Earthquake', progress: 92, amount: '$256,800' },
                    ].map((campaign) => (
                      <div key={campaign.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{campaign.label}</span>
                          <span>{campaign.amount}</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-400 rounded-full transition-all"
                            style={{ width: `${campaign.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <span className="text-4xl mb-2 block">{stat.icon}</span>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose ReliefChain?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built on blockchain technology to ensure every transaction is
              transparent, traceable, and tamper-proof.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-4xl mb-4 block">{feature.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From donation to distribution, every step is tracked and verified
              on the blockchain.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((item, index) => (
              <div key={item.step} className="relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-gray-200" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl font-bold text-primary-600 mb-4 relative z-10">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Make a Difference?
          </h2>
          <p className="text-lg text-primary-100 mb-8">
            Join thousands of donors, NGOs, and volunteers using ReliefChain to
            provide transparent and accountable disaster relief.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Start Now
            </Link>
            <Link
              to="/audit"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
            >
              Explore Audit Trail
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
