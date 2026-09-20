import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { FaDiscord, FaCheck, FaFire, FaShieldAlt, FaUsers, FaBell, FaChartLine, FaSearch, FaQuestionCircle, FaChevronDown, FaUtensils, FaHeadphones, FaTv, FaLaptopCode, FaGamepad, FaGem } from 'react-icons/fa';
import Home from './routes/Home';
import Deals from './routes/Deals';
import Trial from './routes/Trial';
import Discord from './routes/Discord';
import dealProfitLogo from './assets/deal-profit-logo.png';

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <BrowserRouter>
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
                  className="h-[38px] md:h-[44px] w-auto"
                />
              </div>

              {/* CENTER: Desktop nav */}
              <div className="hidden md:flex md:items-center md:space-x-6">
                <Link
                  to="/"
                  className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium"
                >
                  Home
                </Link>
                <Link
                  to="/deals"
                  className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium"
                >
                  Deals
                </Link>
                <Link
                  to="/trial"
                  className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium"
                >
                  Trial
                </Link>
                <Link
                  to="/discord"
                  className="nav-link hover:text-pink-400 transition-colors px-2 py-1 text-sm font-medium"
                >
                  Discord
                </Link>
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
            <Link
              to="/"
              className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400"
            >
              Home
            </Link>
            <Link
              to="/deals"
              className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400"
            >
              Deals
            </Link>
            <Link
              to="/trial"
              className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400"
            >
              Trial
            </Link>
            <Link
              to="/discord"
              className="block px-4 py-3 rounded-lg text-base font-medium hover:bg-pink-500/20 hover:text-pink-400"
            >
              Discord
            </Link>
          </div>
        </div>

        {/* Routes */}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/trial" element={<Trial />} />
            <Route path="/discord" element={<Discord />} />
          </Routes>
        </main>

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
                <Link
                  to="/"
                  className="hover:text-white transition-colors text-xs"
                >
                  Home
                </Link>
                <Link
                  to="/deals"
                  className="hover:text-white transition-colors text-xs"
                >
                  Deals
                </Link>
                <Link
                  to="/trial"
                  className="hover:text-white transition-colors text-xs"
                >
                  Trial
                </Link>
                <Link
                  to="/discord"
                  className="hover:text-white transition-colors text-xs"
                >
                  Discord
                </Link>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">
              © 2026 Deal Profit. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
};

export default App;