import { FaBolt, FaCoins, FaBell, FaCheck, FaShieldAlt, FaUsers, FaStar, FaCrown, FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { buttonClass, Badge, FeatureCard, CTASection, SectionHeader } from '../components/ui';
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

const TRIAL_INCLUDES = [
  'Instant access to member deal channels',
  'Price error and penny deal alerts',
  'Reselling opportunities from the community',
  'Cancel anytime during the trial',
];

const Trial = () => {
  const prefersReduced = useReducedMotion();

  return (
    <section className="pb-4" aria-labelledby="trial-title">
      {/* Hero */}
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
        <h1
          id="trial-title"
          className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]"
        >
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

        <motion.div {...getMotionProps(prefersReduced, motionVariants.fadeInUp)} className="mt-8">
          <a
            href="https://whop.com/deal-profit-6dcc?a=phillipkuz9"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'primary', size: 'xl' })}
          >
            <FaCrown className="text-sm" />
            Start Free Trial
            <FaArrowRight className="text-sm" />
          </a>
          <p className="mt-3 text-xs text-zinc-500">
            Free to start · $25/month after your trial · cancel anytime
          </p>
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

      {/* What's included */}
      <div className="mx-auto mt-14 max-w-md md:mt-16">
        <div className="relative overflow-hidden rounded-xl border border-brand/20 bg-charcoal p-6 sm:p-8">
          <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[radial-gradient(90%_120%_at_20%_0%,rgba(244,63,94,0.12),transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">
              What's included
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
              Everything inside the free trial
            </h2>
            <ul className="mt-5 space-y-3">
              {TRIAL_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand shadow-[0_0_10px_rgba(244,63,94,0.25)]">
                    <FaCheck className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="mt-14 md:mt-16">
        <SectionHeader
          align="center"
          eyebrow="What you get"
          title="Three reasons members stay"
          description="The trial is just a taste — these are the pillars every member relies on daily."
        />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="mx-auto grid max-w-[900px] gap-4 sm:grid-cols-3"
        >
          {BENEFITS.map((benefit) => (
            <motion.div key={benefit.title} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
              <FeatureCard icon={benefit.icon} title={benefit.title} text={benefit.text} className="h-full text-center" />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Final CTA */}
      <CTASection
        title="Try Deal Profit free today."
        description="Start the free trial, see the difference in real time — and cancel anytime if it is not for you."
        actions={
          <>
            <a
              href="https://whop.com/deal-profit-6dcc?a=phillipkuz9"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'primary', size: 'lg' })}
            >
              <FaCrown className="text-sm" />
              Start Free Trial
            </a>
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              Join Discord first
            </a>
          </>
        }
      />
    </section>
  );
};

export default Trial;