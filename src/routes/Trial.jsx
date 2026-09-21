import { FaBolt, FaCoins, FaBell, FaArrowRight, FaCheck, FaShieldAlt, FaUsers, FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { buttonClass, Badge } from '../components/ui';
import dealProfitLogo from '../assets/deal-profit-logo.png';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

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

const TRUST_ITEMS = [
  { icon: FaShieldAlt, label: 'Verified Deals', desc: 'Every deal manually reviewed' },
  { icon: FaUsers, label: 'Active Community', desc: '10,000+ deal hunters' },
  { icon: FaStar, label: 'High Success Rate', desc: '93% average savings' },
];

const Trial = () => {
  const prefersReduced = useReducedMotion();

  return (
    <section className="pb-4" aria-labelledby="trial-title">
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto max-w-[760px] text-center"
      >
        <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
          <img src={dealProfitLogo} alt="" className="h-6 w-auto" />
          <span className="text-sm font-bold text-white">
            Deal<span className="text-brand">Profit</span>
          </span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
          Deal Profit Membership
        </p>
        <h1 id="trial-title" className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]">
          Your next insane deal{' '}
          <span className="text-gradient-brand">
            could be one alert away.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Real-time access to the channels where price errors, penny deals and profitable finds are
          shared the moment they go live.
        </p>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mx-auto mt-8 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-zinc-300"
        >
          <Badge variant="brand" className="gap-1.5">
            <FaCheck className="text-brand" /> Instant access
          </Badge>
          <span className="h-1 w-1 rounded-full bg-zinc-600" />
          <Badge variant="brand" className="gap-1.5">
            <FaCheck className="text-brand" /> Cancel anytime
          </Badge>
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8"
        >
          <a
            href="https://whop.com/deal-profit-6dcc/price-error-66"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'primary', size: 'xl' })}
          >
            Start Free Trial
            <FaArrowRight className="text-sm" />
          </a>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="mt-12 grid gap-4 sm:grid-cols-3"
        >
          {TRUST_ITEMS.map((item) => (
            <motion.div
              key={item.label}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className="card p-4 text-center"
            >
              <div className="mx-auto mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <item.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-bold text-white">{item.label}</h3>
              <p className="mt-1 text-xs text-zinc-400">{item.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-14 grid max-w-[900px] gap-4 sm:grid-cols-3 md:mt-16"
      >
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={benefit.title}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className="card p-6 text-center"
            >
              <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                {benefit.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.text}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
};

export default Trial;