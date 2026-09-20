import { Link } from 'react-router-dom';
import { FaUsers } from 'react-icons/fa';
import discord1Cropped from '../assets/crops/discord1-cropped.png';
import discord2Cropped from '../assets/crops/discord2-cropped.png';

const Discord = () => {
  return (
    <section className="max-w-1180 mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="text-center mb-12">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
          See the deals before they disappear.
        </h2>
        <p className="mt-4 text-lg text-gray-300">
          Our active Discord community is where deals are posted in real-time. Join now to start saving.
        </p>
      </header>

      {/* Screenshot Grid */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* First Screenshot */}
        <div className="relative group">
          <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <div className="relative">
              <div className="aspect-w-16 aspect-h-9 w-full rounded-xl overflow-hidden mb-4">
                <img
                  src={discord1Cropped}
                  alt="Discord channels showing deal alerts"
                  className="w-full h-full object-cover object-[center]"
                />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
              <div className="space-y-4">
                <h3 className="mb-2 text-xl font-bold text-center">Real-time Deal Alerts</h3>
                <p className="text-center text-sm text-gray-300">
                  Get instant notifications when we find price errors, penny deals, or glitch deals so you never miss an opportunity.
                </p>
                <div className="flex justify-center space-x-3 mt-4">
                  <span className="text-xs text-pink-400">•</span>
                  <span className="text-xs text-pink-400">50+ channels</span>
                  <span className="text-xs text-pink-400">•</span>
                  <span className="text-xs text-pink-400">24/7 monitoring</span>
                  <span className="text-xs text-pink-400">•</span>
                  <span className="text-xs text-pink-400">Global coverage</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Second Screenshot */}
        <div className="relative group">
          <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <div className="relative">
              <div className="aspect-w-16 aspect-h-9 w-full rounded-xl overflow-hidden mb-4">
                <img
                  src={discord2Cropped}
                  alt="Discord showing product finds and opportunities"
                  className="w-full h-full object-cover object-[center]"
                />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
              <div className="space-y-4">
                <h3 className="mb-2 text-xl font-bold text-center">Product Finds & Opportunities</h3>
                <p className="text-center text-sm text-gray-300">
                  Discover profitable reselling opportunities and exclusive product finds shared only with our members.
                </p>
                <div className="flex justify-center space-x-3 mt-4">
                  <span className="text-xs text-pink-400">•</span>
                  <span className="text-xs text-pink-400">Reselling tips</span>
                  <span className="text-xs text-pink-400">•</span>
                  <span className="text-xs text-pink-400">Arbitrage ops</span>
                  <span className="text-xs text-pink-400">•</span>
                  <span className="text-xs text-pink-400">Member success</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
        <div className="text-center space-y-3">
          <h3 className="font-semibold text-white">Real-time alerts</h3>
          <p className="text-sm text-gray-300">Get deals the moment they're found</p>
        </div>
        <div className="text-center space-y-3">
          <h3 className="font-semibold text-white">Exclusive channels</h3>
          <p className="text-sm text-gray-300">Member-only deal opportunities</p>
        </div>
        <div className="text-center space-y-3">
          <h3 className="font-semibold text-white">Deal-hunting community</h3>
          <p className="text-sm text-gray-300">Learn from experienced deal hunters</p>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link
          to="https://discord.gg/dealprofit"
          className="btn-primary px-6 py-3 text-center text-sm font-medium hover:bg-pink-500/20 transition-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          Join Deal Profit on Discord
        </Link>
      </div>
    </section>
  );
};

export default Discord;