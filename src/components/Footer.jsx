import { Link } from 'react-router-dom';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const Footer = () => {
  return (
    <footer className="bg-black/50 backdrop-blur-sm border-t border-pink-500/10">
      <div className="max-w-1180 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 space-x-6 text-gray-400">
          <div className="flex items-center space-x-3">
            <img
              src={dealProfitLogo}
              alt="Deal Profit Logo"
              className="h-8 w-auto"
            />
            <span className="text-xs font-medium">Deal Profit</span>
          </div>
          <div className="flex-1 flex flex-col md:flex-row justify-between space-y-2 md:space-y-0 space-x-6 text-xs">
            <div className="space-x-6">
              <Link to="/" className="hover:text-white transition-colors">
                Home
              </Link>
              <Link to="/deals" className="hover:text-white transition-colors">
                Deals
              </Link>
              <Link to="/trial" className="hover:text-white transition-colors">
                Trial
              </Link>
              <Link to="/discord" className="hover:text-white transition-colors">
                Discord
              </Link>
            </div>
            <p className="text-xs text-gray-500">
              © 2026 Deal Profit. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;