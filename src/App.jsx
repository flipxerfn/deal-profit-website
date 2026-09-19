import React, { useState } from 'react';
import { FaDiscord, FaCheck, FaFire, FaShieldAlt, FaUsers, FaBell, FaChartLine, FaSearch, FaQuestionCircle, FaChevronDown, FaUtensils, FaHeadphones, FaTv, FaLaptopCode, FaGamepad, FaGem } from 'react-icons/fa';
import discord1 from './assets/discord1.png';
import discord2 from './assets/discord2.png';
import deal1 from './assets/deal1.jpg';
import deal2 from './assets/deal2.png';
import dealProfitLogo from './assets/deal-profit-logo.png';
// Import cropped versions (we'll reference them even if we need to create them)
import deal1Cropped from './assets/crops/deal1-cropped.jpg';
import deal2Cropped from './assets/crops/deal2-cropped.png';
import discord1Cropped from './assets/crops/discord1-cropped.png';
import discord2Cropped from './assets/crops/discord2-cropped.png';

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white font-inter overflow-x-hidden">
      {/* Navbar - Clean, slim, premium */}
      <nav className="navbar-glass sticky top-0 z-20 border-b border-pink-500/10 bg-black/50 backdrop-blur-md h-[16px] md:h-[20px]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex h-full items-center justify-between">
            {/* LEFT: Small Deal Profit logo */}
            <div className="flex items-center space-x-2">
              <img
                src={dealProfitLogo}
                alt="Deal Profit Logo"
                className="h-[36px] md:h-[44px] w-auto"
              />
            </div>

            {/* CENTER: Desktop nav */}
            <div className="hidden md:flex md:items-center md:space-x-6">
              <a href="#inside" className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium">
                Inside
              </a>
              <a href="#recent" className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium">
                Recent Finds
              </a>
              <a href="#why" className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium">
                Why Join
              </a>
              <a href="#free-trial" className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium">
                Free Trial
              </a>
              <a href="#discord" className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium">
                Discord
              </a>
            </div>

            {/* RIGHT: Strong CTA button */}
            <div className="flex items-center space-x-3">
              <a
                href="https://whop.com/deal-profit/deal-profit-01/"
                className="btn-primary px-4 py-2 text-sm font-medium hover:bg-pink-500/20 transition-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                Start Free Trial
              </a>
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

      {/* Recent Deals Found Section - REAL deal discovery feed */}
      <section id="recent" className="py-12 bg-gray-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Recent Deals Found
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Exclusive finds shared with our members
          </p>
          <div className="grid gap-6 md:grid-cols-3">
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

            {/* Electronics Deal Card - Beautifully cropped deal image */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  {/* Image container - visual star of the card */}
                  <div className="aspect-w-4 aspect-h-3 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={deal2Cropped}
                      alt="Bluetooth Headphones - 90% off"
                      className="w-full h-full object-cover object-[center]"
                    />
                    {/* Subtle glow effect on hover */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-1">
                      <FaHeadphones className="text-pink-400" />
                      <h3 className="font-semibold text-white text-lg">Wireless Headphones</h3>
                    </div>
                    <p className="mb-2 text-sm text-gray-300">
                      Premium noise-cancelling Bluetooth headphones
                    </p>
                    <p className="text-2xl font-bold text-pink-400">
                      $12.99
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Retail: $129.99 • Save 90%
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

      {/* Inside Deal Profit Section - Polished Discord interface previews */}
      <section id="inside" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Inside Deal Profit
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            See what members actually see.
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            {/* First card - Discord Channels Preview */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  {/* Polished Discord interface preview */}
                  <div className="aspect-w-16 aspect-h-9 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={discord1Cropped}
                      alt="Discord channels showing deal alerts"
                      className="w-full h-full object-cover object-[center]"
                    />
                    {/* Subtle glow effect on hover */}
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

            {/* Second card - Product Finds Preview */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-2xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
                <div className="relative">
                  {/* Polished Discord interface preview */}
                  <div className="aspect-w-16 aspect-h-9 w-full rounded-xl overflow-hidden mb-4">
                    <img
                      src={discord2Cropped}
                      alt="Discord showing product finds and opportunities"
                      className="w-full h-full object-cover object-[center]"
                    />
                    {/* Subtle glow effect on hover */}
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
        </div>
      </section>

      {/* Why Join Deal Profit Section - 6 compact, attractive feature cards */}
      <section id="why" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Why Join Deal Profit
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Benefits of becoming a member
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Instant Deal Alerts */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-2">
                  <FaBell className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Instant Deal Alerts</h3>
                </div>
                <p className="text-center text-sm text-gray-300">
                  Get notified the moment we find a price error or glitch deal - never miss an opportunity.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Penny Finds */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-2">
                  <FaUtensils className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Penny Finds</h3>
                </div>
                <p className="text-center text-sm text-gray-300">
                  Discover deals where products are available for pennies or even free due to pricing errors.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Hidden Discounts */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-2">
                  <FaSearch className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Hidden Discounts</h3>
                </div>
                <p className="text-center text-sm text-gray-300">
                  Find deep discounts that aren't advertised publicly - exclusive to our members.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Reselling Opportunities */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-2">
                  <FaChartLine className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Reselling Opportunities</h3>
                </div>
                <p className="text-center text-sm text-gray-300">
                  Many members use our deals to source products for resale on eBay, Amazon, Facebook Marketplace, and more.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Community Support */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-2">
                  <FaUsers className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Community Support</h3>
                </div>
                <p className="text-center text-sm text-gray-300">
                  Learn from experienced members, get help with deals, and share your own finds in our active Discord community.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Fast Alerts */}
            <div className="relative group">
              <div className="bg-black/60 backdrop-blur-sm border border-pink-500/10 rounded-xl p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-3 mb-2">
                  <FaTv className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Fast Alerts</h3>
                </div>
                <p className="text-center text-sm text-gray-300">
                  Our automated systems scan thousands of retailers in real-time to find deals before they disappear.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Section - Strong conversion section */}
      <section id="free-trial" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Try Deal Profit Free
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Experience the full power of our deal finding community with our free trial.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Benefit 1: Access premium deal channels */}
            <div className="relative group">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FaCheck className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Access premium deal channels</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Get instant access to all our exclusive deal channels where the best opportunities are shared first.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Benefit 2: Instant alerts */}
            <div className="relative group">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FaCheck className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Instant alerts</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Receive deal notifications the moment they're found - no delay, no missed opportunities.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Benefit 3: Community support */}
            <div className="relative group">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FaCheck className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Community support</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Get help from experienced deal hunters in our Discord community when you need assistance.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>

            {/* Benefit 4: Exclusive opportunities */}
            <div className="relative group">
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-2">
                  <FaCheck className="text-pink-400 text-2xl"/>
                  <h3 className="mb-2 text-xl font-bold text-center">Exclusive opportunities</h3>
                </div>
                <p className="text-sm text-gray-300">
                  Access to member-only deals, early alerts, and private channels with even better opportunities.
                </p>
                {/* Subtle glow effect on hover */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>
              </div>
            </div>
          </div>
          <a
            href="https://whop.com/deal-profit/deal-profit-01/"
            className="btn-primary mt-6 block w-full md:w-auto px-6 py-3 text-center text-sm font-medium hover:bg-pink-500/20 transition-all"
            target="_blank"
            rel="noopener noreferrer"
          >
            Start Free Trial
          </a>
          <p className="mt-4 text-center text-sm text-gray-400">
            Instant access • Cancel anytime
          </p>
          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
        </div>
      </section>

      {/* Discord Section - Strong final CTA */}
      <section id="discord" className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="mb-6 text-2xl font-bold text-center bg-gradient-to-r from-pink-400 to-pink-500 bg-clip-text text-transparent">
            Join Hundreds of Deal Hunters
          </h2>
          <p className="mb-6 text-center text-lg text-gray-300">
            Our active Discord community is where deals are posted in real-time. Join now to start saving.
          </p>
          <div className="space-y-6 text-center">
            <p className="mb-4 text-lg text-gray-300">
              Don't miss the next find.
            </p>
            <p className="mb-4 text-lg text-gray-300">
              Join thousands of deal hunters inside Deal Profit.
            </p>
            <a
              href="https://discord.gg/dealprofit"
              className="btn-primary mt-4 block w-full md:w-auto px-6 py-3 text-center text-sm font-medium hover:bg-pink-500/20 transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join Discord
            </a>
          </div>
          <p className="mt-4 text-center text-sm text-gray-500">
            24/7 deal posting • Exclusive channels • Friendly community • No lurkers
          </p>
          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-pink-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>
        </div>
      </section>

      {/* Footer - Clean and minimal */}
      <footer className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-8 text-gray-400">
            <div className="flex items-center space-x-2">
              <img
                src={dealProfitLogo}
                alt="Deal Profit Logo"
                className="h-[24px] md:h-[32px] w-auto"
              />
              <span className="text-xs">Deal Profit</span>
            </div>
            <div className="text-center md:text-left">
              <p className="text-xs">
                Finding price errors and profitable deals since 2023
              </p>
            </div>
            <div className="space-y-1 md:space-y-0 md:space-x-4">
              <a
                href="https://whop.com/deal-profit/deal-profit-01/"
                className="hover:text-white transition-colors text-xs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Free Trial
              </a>
              <a
                href="https://discord.gg/dealprofit"
                className="hover:text-white transition-colors text-xs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </a>
              <a href="#" className="hover:text-white transition-colors text-xs">
                Terms
              </a>
              <a href="#" className="hover:text-white transition-colors text-xs">
                Privacy
              </a>
              <a href="#" className="hover:text-white transition-colors text-xs">
                Contact
              </a>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-gray-500">
            © 2026 Deal Profit. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;