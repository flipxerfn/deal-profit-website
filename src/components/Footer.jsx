import { Link } from 'react-router-dom';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const Footer = () => {
  return (
    <footer className="border-t border-pink-500/10 bg-black/50 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-3">
            <img
              src={dealProfitLogo}
              alt="Deal Profit Logo"
              className="h-[24px] w-auto"
            />
            <span className="text-xs font-medium text-white">Deal Profit</span>
          </div>
          <div className="hidden md:flex-1 md:justify-center space-x-4 text-xs">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <Link to="/deals" className="mx-2 hover:text-white transition-colors">
              Deals
            </Link>
            <Link to="/trial" className="mx-2 hover:text-white transition-colors">
              Trial
            </Link>
            <Link to="/discord" className="mx-2 hover:text-white transition-colors">
              Discord
            </Link>
          </div>
          <div className="text-xs text-gray-500">
            © 2026 Deal Profit. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;