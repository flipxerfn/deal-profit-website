import { Link } from 'react-router-dom';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-charcoal/40">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-center gap-2.5">
          <img src={dealProfitLogo} alt="" className="h-6 w-auto" />
          <span className="text-sm font-semibold text-white">
            Deal<span className="text-brand">Profit</span>
          </span>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400" aria-label="Footer">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <Link to="/deals" className="hover:text-white transition-colors">Deals</Link>
          <Link to="/reviews" className="hover:text-white transition-colors">Reviews</Link>
          <Link to="/trial" className="hover:text-white transition-colors">Trial</Link>
          <Link to="/discord" className="hover:text-white transition-colors">Discord</Link>
          <Link to="/upgrade" className="hover:text-white transition-colors">Upgrade</Link>
        </nav>

        <div className="flex flex-col items-end gap-2 text-sm text-zinc-500 md:ml-auto">
          <p>© 2026 Deal Profit. All rights reserved.</p>
          <a
            href="https://whop.com/deal-profit-6dcc/price-error-66"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-2 transition-colors"
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;