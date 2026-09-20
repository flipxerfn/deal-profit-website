import { FaBolt, FaCoins, FaBell, FaArrowRight, FaCheck } from 'react-icons/fa';
import { buttonClass } from '../components/button';
import dealProfitLogo from '../assets/deal-profit-logo.png';

const BENEFITS = [
  {
    icon: FaBolt,
    title: 'Price Errors',
    text: 'Catch pricing mistakes before they get corrected.',
  },
  {
    icon: FaCoins,
    title: 'Penny Deals',
    text: 'Extreme discounts and penny finds posted constantly.',
  },
  {
    icon: FaBell,
    title: 'Fast Alerts',
    text: 'Member-first notifications the second a find goes live.',
  },
];

const Trial = () => {
  return (
    <section className="pb-4">
      <div className="mx-auto max-w-[760px] text-center">
        <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
          <img src={dealProfitLogo} alt="" className="h-6 w-auto" />
          <span className="text-sm font-bold text-white">
            Deal<span className="text-brand">Profit</span>
          </span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Deal Profit Membership
        </p>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]">
          Your next insane deal{' '}
          <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
            could be one alert away.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Real-time access to the channels where price errors, penny deals and profitable finds are
          shared the moment they go live.
        </p>

        <div className="mx-auto mt-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-zinc-300">
          <span className="inline-flex items-center gap-1.5">
            <FaCheck className="text-brand" /> Instant access
          </span>
          <span className="h-1 w-1 rounded-full bg-zinc-600" />
          <span className="inline-flex items-center gap-1.5">
            <FaCheck className="text-brand" /> Cancel anytime
          </span>
        </div>

        <div className="mt-8">
          <a
            href="https://whop.com/deal-profit/deal-profit-01/"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass('primary', 'w-full px-8 py-3.5 text-base sm:w-auto')}
          >
            Start Free Trial
            <FaArrowRight className="text-sm" />
          </a>
        </div>
      </div>

      <div className="mx-auto mt-14 grid max-w-[900px] gap-4 sm:grid-cols-3 md:mt-16">
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="rounded-xl border border-white/10 bg-charcoal/70 p-6 text-center"
            >
              <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {benefit.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Trial;