import React from 'react';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const Trial = () => {
  return (
    <section className="py-20 bg-black">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center mb-6">
          <img
            src={dealProfitLogo}
            alt="Deal Profit Logo"
            className="h-[40px] w-auto"
          />
          <span className="ml-2 text-xs font-medium">Deal Profit</span>
        </div>
        <h1 className="mb-6 text-[36px] md:text-[48px] font-bold bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
          Your next insane deal could be one alert away.
        </h1>
        <p className="mb-8 text-xl text-gray-300">
          Instant access • Cancel anytime
        </p>
        <a
          href="https://whop.com/deal-profit/deal-profit-01/"
          className="btn-primary inline-block px-8 py-4 text-center text-lg font-medium hover:bg-pink-500/20 transition-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          Start Free Trial
        </a>
        <p className="mt-6 text-sm text-gray-400">
          Get instant access to our exclusive deal channels where we post price errors, penny deals, and profitable finds 24/7.
        </p>
      </div>
    </section>
  );
};

export default Trial;