import { Link } from 'react-router-dom';
import { FaArrowRight, FaBolt, FaCoins, FaPercent, FaBell, FaShieldAlt, FaUsers, FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Card, Badge, buttonClass } from '../components/ui';
import DealCard from '../components/DealCard';
import rtpcImg from '../assets/crops/deal1-cropped.jpg';
import { HOME_FINDS, WHAT_WE_HUNT } from '../data/deals';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

const HUNT_ICONS = [FaBolt, FaCoins, FaPercent, FaBell];

const TRUST_ITEMS = [
  { icon: FaShieldAlt, label: 'Verified Deals', desc: 'Every deal manually reviewed' },
  { icon: FaUsers, label: 'Active Community', desc: '10,000+ deal hunters' },
  { icon: FaStar, label: 'High Success Rate', desc: '93% average savings' },
  { icon: FaBell, label: 'Real-time Alerts', desc: 'Instant notifications' },
];

const Home = () => {
  const prefersReduced = useReducedMotion();

  return (
    <>
      {/* Hero Section */}
      <section className="pb-12 md:pb-16 relative" aria-labelledby="hero-title">
        {/* Hero background glow */}
        <div className="absolute inset-0 radial-glow-hero pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[600px] bg-gradient-to-t from-brand/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mb-5 inline-flex flex-wrap items-center gap-2"
            >
              {['Price Errors', 'Penny Deals', 'Glitch Finds'].map((tag) => (
                <Badge key={tag} variant="brand" className="gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                  <span className="h-1 w-1 rounded-full bg-brand animate-pulse" />
                  {tag}
                </Badge>
              ))}
            </motion.div>

            <motion.h1
              id="hero-title"
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="text-4xl font-extrabold leading-[1.12] tracking-tight text-white sm:text-[44px] xl:text-5xl"
            >
              Catch the deals{' '}
              <span className="text-gradient-brand">
                before everyone else.
              </span>
            </motion.h1>

            <motion.p
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg"
            >
              Price errors, penny deals and hidden discounts flagged the second they go live — plus
              profitable reselling finds from the Deal Profit community. Fast alerts so you are never
              late to the deal.
            </motion.p>

            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/deals" className={buttonClass({ variant: 'primary', size: 'lg' })}>
                Explore Deals
                <FaArrowRight className="text-sm" />
              </Link>
              <a
                href="https://whop.com/deal-profit/deal-profit-01/"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'outline', size: 'lg' })}
              >
                Start Free Trial
              </a>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mt-10 flex flex-wrap items-center gap-6 text-sm text-zinc-400"
            >
              {TRUST_ITEMS.map((item, i) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-xs text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="relative"
          >
            <div className="rounded-xl border border-white/10 bg-charcoal p-3 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(244,63,94,0.1)]">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-charcoal-2">
                <img
                  src={rtpcImg}
                  alt="RTX 5060 Gaming PC retailer listing for $39.99"
                  className="h-full w-full object-cover object-top"
                />
                <div className="absolute left-3 top-3 flex items-center gap-2">
                  <Badge variant="brand" className="shadow-[0_0_12px_rgba(244,63,94,0.4)]">Price error</Badge>
                  <Badge variant="outline" className="bg-black/60 text-zinc-200 border-black/30">Tech</Badge>
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
            
            {/* Floating badge */}
            <motion.div
              {...getMotionProps(prefersReduced, { 
                ...motionVariants.fadeInUp, 
                animate: { opacity: 1, y: 0, rotate: [-2, 2, -2, 0] } 
              })}
              className="absolute -bottom-4 -right-4"
            >
              <div className="inline-flex items-center gap-2 rounded-xl bg-brand/20 border border-brand/30 px-4 py-3 text-white shadow-[0_0_40px_rgba(244,63,94,0.35),0_8px_30px_rgba(0,0,0,0.4)]">
                <FaBolt className="h-5 w-5 text-brand animate-pulse" />
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">Live Deal</p>
                  <p className="text-sm font-extrabold">93% OFF</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What We Hunt Section */}
      <section className="pb-12 md:pb-16 relative" aria-labelledby="hunt-title">
        <div className="absolute inset-0 bg-gradient-to-b from-brand/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {WHAT_WE_HUNT.map((item, i) => {
            const Icon = HUNT_ICONS[i];
            return (
              <motion.div
                key={item.title}
                {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
                className="card card-hover p-5 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
                <div className="relative mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand group-hover:bg-brand/20 transition-colors duration-300 shadow-[0_0_16px_rgba(244,63,94,0.2)]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="relative text-sm font-bold text-white">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* Latest Finds Section */}
      <section className="pb-4 relative" aria-labelledby="finds-title">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent pointer-events-none" aria-hidden="true" />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">Live finds</p>
            <h2 id="finds-title" className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
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
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2"
        >
          {HOME_FINDS.map((deal) => (
            <motion.div
              key={deal.id}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
            >
              <DealCard deal={deal} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Social Proof / Reviews Preview */}
      <section className="pb-12 md:pb-16 relative" aria-labelledby="social-title">
        <div className="absolute inset-0 bg-gradient-to-b from-glow/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mb-8 text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-brand">Community Proof</p>
          <h2 id="social-title" className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Trusted by thousands of deal hunters
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-base leading-relaxed text-zinc-400">
            Real feedback from people hunting price errors, penny finds and glitch deals with Deal Profit.
          </p>
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className="card p-5 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
              <div className="relative mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand/20 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all duration-300">
                <item.icon className="h-4 w-4" />
              </div>
              <h3 className="relative text-sm font-bold text-white">{item.label}</h3>
              <p className="mt-1 text-sm text-zinc-400">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="mt-12 overflow-hidden rounded-xl border border-brand/20 bg-[radial-gradient(120%_160%_at_20%_0%,rgba(244,63,94,0.22),rgba(139,92,246,0.12)_50%,transparent_80%)] p-8 md:mt-16 md:p-12 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.1),transparent_70%)]" aria-hidden="true" />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center"
        >
          <div>
            <h2 className="max-w-md text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Never miss a deal again.
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400 sm:text-base">
              Join the community where price errors, penny deals and profitable finds are posted the
              moment they go live.
            </p>
          </div>
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'primary', size: 'lg' })}
            >
              Join Discord
              <FaArrowRight className="text-sm" />
            </a>
            <a
              href="https://whop.com/deal-profit/deal-profit-01/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              Start Free Trial
            </a>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
};

export default Home;