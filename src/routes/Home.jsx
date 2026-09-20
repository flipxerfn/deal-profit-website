import { Link } from 'react-router-dom';
import { FaArrowRight, FaBolt, FaCoins, FaPercent, FaBell } from 'react-icons/fa';
import { buttonClass } from '../components/button';
import DealCard from '../components/DealCard';
import rtpcImg from '../assets/crops/deal1-cropped.jpg';
import { HOME_FINDS, WHAT_WE_HUNT } from '../data/deals';

const HUNT_ICONS = [FaBolt, FaCoins, FaPercent, FaBell];

const Home = () => {
  return (
    <>
      <section className="pb-12 md:pb-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <div className="mb-5 inline-flex flex-wrap items-center gap-2">
              {['Price Errors', 'Penny Deals', 'Glitch Finds'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand"
                >
                  <span className="h-1 w-1 rounded-full bg-brand" />
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[44px] xl:text-5xl">
              Catch the deals{' '}
              <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
                before everyone else.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
              Price errors, penny deals and hidden discounts flagged the second they go live — plus
              profitable reselling finds from the Deal Profit community. Fast alerts so you are never
              late to the deal.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/deals" className={buttonClass('primary', 'px-6 py-3')}>
                Explore Deals
                <FaArrowRight className="text-sm" />
              </Link>
              <a
                href="https://whop.com/deal-profit/deal-profit-01/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass('outline', 'px-6 py-3')}
              >
                Start Free Trial
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-charcoal p-3">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-charcoal-2">
              <img
                src={rtpcImg}
                alt="RTX 5060 Gaming PC retailer listing for $39.99"
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Price error
                </span>
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-200 backdrop-blur">
                  Tech
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-bold text-white">RTX 5060 Gaming PC</p>
                <p className="text-xs text-zinc-500">Retail $599.99</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold tracking-tight text-brand">$39.99</p>
                <p className="text-xs font-semibold text-brand-2">Save 93%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12 md:pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHAT_WE_HUNT.map((item, i) => {
            const Icon = HUNT_ICONS[i];
            return (
              <div
                key={item.title}
                className="rounded-xl border border-white/10 bg-charcoal/70 p-5"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pb-4">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              Live finds
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Latest finds
            </h2>
          </div>
          <Link
            to="/deals"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-brand"
          >
            View all deals
            <FaArrowRight className="text-xs" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {HOME_FINDS.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      </section>

      <section className="mt-12 overflow-hidden rounded-xl border border-brand/20 bg-[radial-gradient(120%_160%_at_20%_0%,rgba(244,63,142,0.16),rgba(139,92,246,0.08)_50%,transparent_80%)] p-8 md:mt-16 md:p-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="max-w-md text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Never miss a deal again.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              Join the community where price errors, penny deals and profitable finds are posted the
              moment they go live.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('primary', 'px-6 py-3')}
            >
              Join Discord
              <FaArrowRight className="text-sm" />
            </a>
            <a
              href="https://whop.com/deal-profit/deal-profit-01/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('outline', 'px-6 py-3')}
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;