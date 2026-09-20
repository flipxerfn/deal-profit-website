import { Link } from 'react-router-dom';
import { FaBars } from 'react-icons/fa';
import dealProfitLogo from '../assets/deal-profit-logo.png';
import { useState } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-black/80 backdrop-blur-sm border-b border-pink-500/10 sticky top-0 z-20">
      <div className="max-w-1180 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src={dealProfitLogo}
                alt="Deal Profit Logo"
                className="h-10 w-auto"
              />
              <span className="text-xs font-medium text-white">Deal Profit</span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-6">
            <Link
              to="/"
              className="text-sm font-medium text-gray-300 hover:text-pink-400 transition-colors"
            >
              Home
            </Link>
            <Link
              to="/deals"
              className="text-sm font-medium text-gray-300 hover:text-pink-400 transition-colors"
            >
              Deals
            </Link>
            <Link
              to="/trial"
              className="text-sm font-medium text-gray-300 hover:text-pink-400 transition-colors"
            >
              Trial
            </Link>
            <Link
              to="/discord"
              className="text-sm font-medium text-gray-300 hover:text-pink-400 transition-colors"
            >
              Discord
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="https://whop.com/deal-profit/deal-profit-01/"
              className="btn-primary px-4 py-2 text-sm font-medium hover:bg-pink-500/20 transition-all"
              target="_blank"
              rel="noopener noreferrer"
            >
              Start Free Trial
            </Link>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 rounded-lg text-pink-400 hover:text-pink-300"
              aria-label="Open menu"
            >
              <FaBars className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`
        md:hidden
        bg-black/80 backdrop-blur-sm
        ${isOpen ? 'block' : 'hidden'}
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
    </nav>
  );
};

export default Navbar;