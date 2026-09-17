import React, { useState } from 'react';
import { FaDiscord, FaCheck, FaFire, FaShieldAlt, FaUsers, FaBell, FaChartLine, FaSearch, FaQuestionCircle, FaChevronDown } from 'react-icons/fa';
import discord1 from './assets/discord1.png';
import discord2 from './assets/discord2.png';
import deal1 from './assets/deal1.jpg';
import deal2 from './assets/deal2.png';

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // Yet another trivial comment to trigger HMR update

  return (
    <div className="min-h-screen bg-black text-white font-inter overflow-x-hidden">
      {/* Navbar - TEXT ONLY (no logo images) */}
      <nav className="navbar-glass sticky top-0 z-20 border-b border-pink-500/20 h-[70px]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-full items-center justify-between">
            {/* LEFT: Text only */}
            <div className="flex items-center space-x-3">
              <span className="font-bold text-xl bg-gradient-neon">
                [ Deal Profit ]
              </span>
            </div>

            {/* CENTER: Desktop nav */}
            <div className="hidden md:flex md:items-center md:space-x-6">
              <a href="#inside" className="nav-link hover:text-pink-400 transition-colors px-3 py-2 text-sm font-medium">
                Inside
              </a>
              <a href="#recent" className="nav-link hover:text-pink-400 transition-colors px-3 py-2 text-sm font-medium">
                Recent Finds
              </a>
              <a href="#why" className="nav-link hover:text-pink-400 transition-colors px-3 py-2 text-sm font-medium">
                Why Join
              </a>
              <a href="#free-trial" className="nav-link hover:text-pink-400 transition-colors px-3 py-2 text-sm font-medium">
                Free Trial
              </a>
              <a href="#discord" className="nav-link hover:text-pink-400 transition-colors px-3 py-2 text-sm font-medium">
                Discord
              </a>
            </div>

            {/* RIGHT: Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-white hover:text-pink-400 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className={`
        md:hidden
        bg-black/80 backdrop-blur-sm
        ${isMenuOpen ? 'block' : 'hidden'}
      `}>
        <div className="px-4 pt-3 pb-4 space-y-2">
          <a href="#inside" className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400">
            Inside
          </a>
          <a href="#recent" className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400">
            Recent Finds
          </a>
          <a href="#why" className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400">
            Why Join
          </a>
          <a href="#free-trial" className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400">
            Free Trial
          </a>
          <a href="#discord" className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400">
            Discord
          </a>
        </div>
      </div>

      {/* Hero Section - NO LOGO HERE */}
      <section id="hero" className="relative py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 md:items-center md:gap-10">
            {/* HERO TEXT CONTENT */}
            <div className="space-y-6">
              {/* Eyebrow */}
              <div className="flex items-center space-x-2 text-pink-400 text-sm font-medium">
                <span aria-hidden="true">•</span> PRICE ERRORS • PENNY FINDS • GLITCH DEALS
              </div>

              {/* Headline */}
              <h1 className="mt-2 mb-4 text-[34px] md:text-[42px] font-bold bg-gradient-neon leading-snug">
                Find Insane Deals<br />
                Before They Disappear
              </h1>

              {/* Description */}
              <p className="mb-6 text-base text-gray-300">
                Deal Profit finds price errors, penny deals, glitches, and hidden discounts so members can act before everyone else.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://whop.com/deal-profit/deal-profit-01/"
                  className="btn-primary flex-1 md:flex-auto px-5 py-3 text-center text-sm font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Start Free Trial
                </a>
                <a
                  href="https://discord.gg/dealprofit"
                  className="btn-secondary flex-1 md:flex-auto px-5 py-3 text-center text-sm font-medium border border-pink-500 hover:border-pink-400"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Discord
                </a>
              </div>
            </div>

            {/* HERO VISUALS - Deal screenshots only */}
            <div className="mt-4 md:mt-0">
              <div className="grid gap-6 md:grid-cols-2">
                {/* First deal screenshot */}
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <img src={deal1} alt="Gaming PC Deal - RTX 5060 for $39.99" className="w-full h-full object-cover" />
                </div>

                {/* Second deal screenshot */}
                <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden">
                  <img src={deal2} alt="Electronics Deal - Deep Discounts" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inside Deal Profit Section */}
      <section id="inside" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-neon">
            Inside Deal Profit
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            See what members actually see.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {/* First card - Discord Channels */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-xl p-6">
              <img src={discord1} alt="Discord Channels" className="w-full h-[200px] object-cover rounded-lg mb-4" />
              <h3 className="mb-3 text-xl font-bold text-center">Real-time Deal Alerts</h3>
              <p className="text-center text-sm text-gray-300">
                Get instant notifications when we find price errors, penny deals, or glitch deals so you never miss an opportunity.
              </p>
            </div>

            {/* Second card - Product Finds */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-xl p-6">
              <img src={discord2} alt="Deal Alerts" className="w-full h-[200px] object-cover rounded-lg mb-4" />
              <h3 className="mb-3 text-xl font-bold text-center">Product Finds & Opportunities</h3>
              <p className="text-center text-sm text-gray-300">
                Discover profitable reselling opportunities and exclusive product finds shared only with our members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Deals Found Section */}
      <section id="recent" className="py-12 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-neon">
            Recent Deals Found
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Exclusive finds shared with our members
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {/* PC Deal Card */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <img src={deal1} alt="Gaming PC Deal" className="w-full h-[200px] object-cover rounded-t-lg mb-3" />
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-1">
                  <FaFire className="text-pink-400" />
                  <h3 className="font-semibold text-white text-lg">Gaming PC</h3>
                </div>
                <p className="mb-1 text-sm text-gray-300">RTX 5060 Gaming PC</p>
                <p className="text-sm text-pink-400 font-semibold">$39.99</p>
                <span className="inline-block mt-2 px-2 py-1 text-xs text-pink-400 bg-pink-500/20 rounded">
                  FOUND BY DEAL PROFIT
                </span>
              </div>
            </div>

            {/* Penny Deals Card */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <img src={discord1} alt="Penny Deals Discord" className="w-full h-[200px] object-cover rounded-t-lg mb-3" />
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-1">
                  <FaFire className="text-pink-400" />
                  <h3 className="font-semibold text-white text-lg">Penny Deals</h3>
                </div>
                <p className="mb-1 text-sm text-gray-300">Penny finds from the community</p>
                <p className="text-sm text-pink-400 font-semibold">As low as $0.01</p>
                <span className="inline-block mt-2 px-2 py-1 text-xs text-pink-400 bg-pink-500/20 rounded">
                  FOUND BY DEAL PROFIT
                </span>
              </div>
            </div>

            {/* Other Real Deal Card */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <img src={deal2} alt="Other Real Deal" className="w-full h-[200px] object-cover rounded-t-lg mb-3" />
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-1">
                  <FaFire className="text-pink-400" />
                  <h3 className="font-semibold text-white text-lg">Other Real Deal</h3>
                </div>
                <p className="mb-1 text-sm text-gray-300">Real deal found by members</p>
                <p className="text-sm text-pink-400 font-semibold">See deal details</p>
                <span className="inline-block mt-2 px-2 py-1 text-xs text-pink-400 bg-pink-500/20 rounded">
                  FOUND BY DEAL PROFIT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Join Deal Profit Section */}
      <section id="why" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-neon">
            Why Join Deal Profit
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Benefits of becoming a member
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Instant Deal Alerts */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaBell className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Instant Deal Alerts</h3>
              </div>
              <p className="text-center text-sm text-gray-300">
                Get notified the moment we find a price error or glitch deal - never miss an opportunity.
              </p>
            </div>

            {/* Penny Finds */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaFire className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Penny Finds</h3>
              </div>
              <p className="text-center text-sm text-gray-300">
                Discover deals where products are available for pennies or even free due to pricing errors.
              </p>
            </div>

            {/* Hidden Discounts */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaSearch className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Hidden Discounts</h3>
              </div>
              <p className="text-center text-sm text-gray-300">
                Find deep discounts that aren't advertised publicly - exclusive to our members.
              </p>
            </div>

            {/* Reselling Opportunities */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaChartLine className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Reselling Opportunities</h3>
              </div>
              <p className="text-center text-sm text-gray-300">
                Many members use our deals to source products for resale on eBay, Amazon, Facebook Marketplace, and more.
              </p>
            </div>

            {/* Community Support */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaUsers className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Community Support</h3>
              </div>
              <p className="text-center text-sm text-gray-300">
                Learn from experienced members, get help with deals, and share your own finds in our active Discord community.
              </p>
            </div>

            {/* Exclusive Channels */}
            <div className="bg-black/50 backdrop-blur-sm border border-pink-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaShieldAlt className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Exclusive Channels</h3>
              </div>
              <p className="text-center text-sm text-gray-300">
                Get access to private channels with even better deals, early alerts, and member-only opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Section */}
      <section id="free-trial" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-neon">
            Try Deal Profit Free
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Experience the full power of our deal finding community with our free trial. No commitment required.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Benefit 1: Access premium deal channels */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaCheck className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Access premium deal channels</h3>
              </div>
              <p className="text-sm text-gray-300">
                Get instant access to all our exclusive deal channels where the best opportunities are shared first.
              </p>
            </div>

            {/* Benefit 2: Instant alerts */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaCheck className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Instant alerts</h3>
              </div>
              <p className="text-sm text-gray-300">
                Receive deal notifications the moment they're found - no delay, no missed opportunities.
              </p>
            </div>

            {/* Benefit 3: Community support */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaCheck className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">Community support</h3>
              </div>
              <p className="text-sm text-gray-300">
                Get help from experienced deal hunters in our Discord community when you need assistance.
              </p>
            </div>

            {/* Benefit 4: No commitment */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <FaCheck className="text-pink-400 text-2xl"/>
                <h3 className="mb-2 text-xl font-bold text-center">No commitment</h3>
              </div>
              <p className="text-sm text-gray-300">
                Cancel anytime during the trial period - no credit card required to start.
              </p>
            </div>
          </div>
          <a
            href="https://whop.com/deal-profit/deal-profit-01/"
            className="btn-primary mt-6 block w-full md:w-auto px-6 py-3 text-center text-sm font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Start Free Trial
          </a>
          <p className="mt-4 text-center text-sm text-gray-400">
            Instant access • Cancel anytime
          </p>
        </div>
      </section>

      {/* Discord Section */}
      <section id="discord" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-neon">
            Join Hundreds of Deal Hunters
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Our active Discord community is where deals are posted in real-time. Join now to start saving.
          </p>
          <a
            href="https://discord.gg/dealprofit"
            className="btn-primary mt-4 block w-full md:w-auto px-6 py-3 text-center text-sm font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Join Discord
          </a>
          <p className="mt-4 text-center text-sm text-gray-500">
            24/7 deal posting • Exclusive channels • Friendly community • No lurkers
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-8 text-gray-400">
            <a
              href="https://whop.com/deal-profit/deal-profit-01/"
              className="hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Free Trial
            </a>
            <a
              href="https://discord.gg/dealprofit"
              className="hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">
            © 2026 Deal Profit. All rights reserved. | Terms of Service | Privacy Policy
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;