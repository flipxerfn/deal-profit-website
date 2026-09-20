import React from 'react';
import { FaDiscord, FaCheck, FaFire, FaShieldAlt, FaUsers, FaBell, FaChartLine, FaSearch, FaQuestionCircle, FaChevronDown, FaUtensils, FaHeadphones, FaTv, FaLaptopCode, FaGamepad, FaGem } from 'react-icons/fa';
import deal1Cropped from '../assets/crops/deal1-cropped.jpg';
import deal2Cropped from '../assets/crops/deal2-cropped.png';
import discord1Cropped from '../assets/crops/discord1-cropped.png';
import discord2Cropped from '../assets/crops/discord2-cropped.png';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const Home = () => {
  return (
    <>
      {/* Hero Section */}
      <section id="hero" className="relative py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 md:items-center md:gap-12">
            {/* HERO TEXT CONTENT */}
            <div className="space-y-6">
              {/* Eyebrow */}
              <div className="flex items-center space-x-2 text-pink-400 text-sm font-medium">
                <span aria-hidden="true">•</span> PRICE ERRORS • PENNY FINDS • GLITCH DEALS
              </div>

              {/* Headline */}
              <h1 className="mt-2 mb-4 text-[36px] md:text-[48px] font-bold bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent leading-snug">
                Catch the deals before everyone else.
              </h1>

              {/* Supporting message */}
              <p className="mb-6 text-base text-gray-300">
                Find price errors, penny deals, hidden discounts and profitable finds from the Deal Profit community.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <a
                  href="https://whop.com/deal-profit/deal-profit-01/"
                  className="btn-primary flex-1 md:flex-auto px-5 py-3 text-center text-sm font-medium hover:bg-pink-500/20 transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Start Free Trial
                </a>
                <a
                  href="https://discord.gg/dealprofit"
                  className="btn-secondary flex-1 md:flex-auto px-5 py-3 text-center text-sm font-medium border border-pink-500 hover:border-pink-400 hover:bg-pink-500/10 transition-all"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Discord
                </a>
              </div>
            </div>

            {/* HERO VISUALS - Large, visually polished deal preview */}
            <div className="mt-6 md:mt-0">
              <div className="relative group">
                <div className="w-full aspect-w-4 aspect-h-3 rounded-2xl overflow-hidden bg-black/60">
                  {/* Main deal preview - using aggressively cropped image showing PRODUCT + PRICE */}
                  <img
                    src={deal1Cropped}
                    alt="RTX 5060 Gaming PC for $39.99 - Price Error Deal"
                    className="w-full h-full object-cover object-[center_top]"
                  />
                  {/* Subtle glow effect behind visuals */}
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  {/* Premium overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Deals Found Section - ONLY RTX 5060 Gaming PC and Penny Deals */}
      <section id="recent" className="py-12 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Recent Deals Found
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Exclusive finds shared with our members
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {/* PC Deal Card - Beautifully cropped deal image */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  {/* Image container - visual star of the card */}
                  <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={deal1Cropped}
                      alt="RTX 5060 Gaming PC - $39.99"
                      className="w-full h-full object-cover object-[center_top]"
                    />
                    {/* Subtle glow effect on hover */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaFire className="text-pink-400" />
                      <h3 className="font-semibold text-white text-lg">RTX 5060 Gaming PC</h3>
                    </div>
                    <p className="mb-2 text-sm text-gray-300">
                      Brand new RTX 5060 gaming PC with RGB lighting
                    </p>
                    <p className="text-2xl font-bold text-pink-400">
                      $39.99
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Retail: $599.99 • Save 93%
                    </p>
                    <span className="inline-block mt-4 px-3 py-1 text-xs text-pink-400 bg-pink-500/20 rounded hover:bg-pink-500/30 transition-all">
                      FOUND BY DEAL PROFIT
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Penny Deals Card - Beautifully cropped deal image */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  {/* Image container - visual star of the card */}
                  <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={discord1Cropped}
                      alt="Penny deals from Discord community"
                      className="w-full h-full object-cover object-[center]"
                    />
                    {/* Subtle glow effect on hover */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaUtensils className="text-pink-400" />
                      <h3 className="font-semibold text-white text-lg">Penny Deals</h3>
                    </div>
                    <p className="mb-2 text-sm text-gray-300">
                      Daily deals under $1 from our community
                    </p>
                    <p className="text-2xl font-bold text-pink-400">
                      As low as $0.01
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Updated hourly • 50+ new deals daily
                    </p>
                    <span className="inline-block mt-4 px-3 py-1 text-xs text-pink-400 bg-pink-500/20 rounded hover:bg-pink-500/30 transition-all">
                      FOUND BY DEAL PROFIT
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;