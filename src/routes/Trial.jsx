import { Link } from 'react-router-dom';

const Trial = () => {
  return (
    <section className="max-w-1180 mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center">
        <p className="text-xs font-medium text-pink-400">
          DEAL PROFIT MEMBERSHIP
        </p>
        <h1 className="mt-4 mb-6 text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
          Your next insane deal could be one alert away.
        </h1>
      </div>

      {/* Benefits */}
      <div className="mb-12 grid gap-6 md:grid-cols-3 text-center">
        <div>
          <h3 className="mb-2 font-semibold text-white">PRICE ERRORS</h3>
          <p className="text-sm text-gray-300">
            Find pricing mistakes before they disappear.
          </p>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-white">PENNY DEALS</h3>
          <p className="text-sm text-gray-300">
            Catch $0.01-style opportunities.
          </p>
        </div>
        <div>
          <h3 className="mb-2 font-semibold text-white">FAST ALERTS</h3>
          <p className="text-sm text-gray-300">
            See new finds quickly.
          </p>
        </div>
      </div>

      {/* Whop Membership Card */}
      <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-8">
        <div className="space-y-6">
          <p className="text-lg font-medium text-center text-gray-300">
            Instant access • Cancel anytime
          </p>
          <a
            href="https://whop.com/deal-profit/deal-profit-01/"
            className="w-full btn-primary px-6 py-3 text-center text-sm font-medium hover:bg-pink-500/20 transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            Start Free Trial
          </a>
          <p className="mt-4 text-sm text-center text-gray-400">
            Get instant access to our exclusive deal channels where we post price errors, penny deals, and profitable finds 24/7.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Trial;