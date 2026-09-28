import { Link } from 'react-router-dom';
import { FaDiscord } from 'react-icons/fa';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const DISCORD_URL = 'https://discord.gg/dealprofit';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-charcoal/40">
      <div className="mx-auto max-w-[1800px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src={dealProfitLogo} alt="" className="h-7 w-auto" />
              <span className="text-sm font-bold text-white">
                Deal<span className="text-brand">Profit</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
              Price errors, penny deals and profitable finds — posted the moment they go live.
            </p>
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline mt-5 text-xs"
            >
              <FaDiscord className="text-sm" />
              Join Discord
            </a>
          </div>

          {/* Browse */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Browse</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm" aria-label="Browse">
              <Link to="/" className="text-zinc-400 transition-colors hover:text-white">Home</Link>
              <Link to="/deals" className="text-zinc-400 transition-colors hover:text-white">Deals</Link>
              <Link to="/reviews" className="text-zinc-400 transition-colors hover:text-white">Reviews</Link>
            </nav>
          </div>

          {/* Membership */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Membership</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm" aria-label="Membership">
              <Link to="/upgrade" className="text-zinc-400 transition-colors hover:text-white">Free Trial & Upgrade</Link>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Discord Server
              </a>
            </nav>
          </div>

          {/* Community */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Community</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm" aria-label="Community">
              <Link to="/discord" className="text-zinc-400 transition-colors hover:text-white">Discord</Link>
              <a
                href="https://discord.gg/dealprofit"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 transition-colors hover:text-white"
              >
                Invite Link
              </a>
            </nav>
          </div>
          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Legal</p>
            <nav className="mt-4 flex flex-col gap-2.5 text-sm" aria-label="Legal">
              <Link to="/terms" className="text-zinc-400 transition-colors hover:text-white">Terms of Service</Link>
              <Link to="/privacy" className="text-zinc-400 transition-colors hover:text-white">Privacy Policy</Link>
              <Link to="/refunds" className="text-zinc-400 transition-colors hover:text-white">Refund &amp; Cancellation</Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Deal Profit. All rights reserved.</p>
          <p>Deals are not guaranteed and can be corrected by retailers at any time.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;