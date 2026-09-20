import {
  FaBolt,
  FaFire,
  FaCoins,
  FaSkullCrossbones,
  FaComment,
  FaBell,
  FaChartLine,
  FaTrophy,
  FaArrowRight,
  FaCheck,
  FaCrown,
  FaShieldAlt,
  FaGem,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { Button, Badge } from '../components/ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

const WHOP_URL = 'https://whop.com/deal-profit/deal-profit-01/';

const BENEFITS = [
  {
    icon: FaBolt,
    title: 'Faster Deal Alerts',
    text: 'Get important deal alerts faster so you have more time to check them before they disappear.',
  },
  {
    icon: FaFire,
    title: 'More Deal Opportunities',
    text: 'See additional deal opportunities beyond the public free feed.',
  },
  {
    icon: FaCoins,
    title: 'Reselling Opportunities',
    text: 'Discover deals that may be interesting for potential resale opportunities.',
  },
  {
    icon: FaSkullCrossbones,
    title: 'Price Errors & Glitches',
    text: 'Get alerts for unusual pricing, price errors, glitches, and hidden discounts.',
  },
  {
    icon: FaTrophy,
    title: 'Penny Deals',
    text: 'Stay on top of penny and extremely low-priced finds.',
  },
  {
    icon: FaComment,
    title: 'Premium Discord Access',
    text: 'Join the private Deal Profit community and access premium channels.',
  },
  {
    icon: FaBell,
    title: 'Priority Alerts',
    text: 'Make important deal alerts easier to catch with faster, more focused notifications.',
  },
  {
    icon: FaChartLine,
    title: 'More Frequent Finds',
    text: 'Get access to more deal opportunities instead of relying only on the public feed.',
  },
  {
    icon: FaCrown,
    title: 'Premium-Only Opportunities',
    text: 'Access selected opportunities that aren\'t included in the public free feed.',
  },
];

const FREE_FEATURES = [
  'Public deal feed',
  'Selected free deals',
  'Basic deal browsing',
  'Search & filter deals',
  'Community reviews',
];

const PREMIUM_FEATURES = [
  'Everything in Free',
  'Faster alerts',
  'Premium Discord access',
  'Premium-only deal opportunities',
  'More deal opportunities',
  'Price error alerts',
  'Penny deal alerts',
  'Reselling opportunities',
  'More focused notifications',
];

const BenefitCard = ({ icon: Icon, title, text }) => (
  <motion.div className="card card-hover p-6">
    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand transition-colors group-hover:bg-brand/15">
      <Icon className="h-4 w-4" />
    </div>
    <h3 className="text-sm font-bold uppercase tracking-wider text-white">{title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
  </motion.div>
);

const Upgrade = () => {
  const prefersReduced = useReducedMotion();

  return (
    <section className="pb-4" aria-labelledby="upgrade-title">
      {/* Hero */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto max-w-[760px] text-center"
      >
        <Badge variant="glow" className="mb-4">
          Deal Profit Premium
        </Badge>
        <h1 id="upgrade-title" className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]">
          Get more than the free feed.{' '}
          <span className="text-gradient-brand">
            Upgrade for faster alerts and more deals.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Free deals are just the beginning. Upgrade for faster alerts, more deal opportunities, and
          access to premium features designed to help you catch deals before they disappear.
        </p>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={Button({ variant: 'primary', size: 'lg' })}
          >
            Upgrade to Premium
            <FaArrowRight className="text-sm" />
          </a>
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={Button({ variant: 'outline', size: 'lg' })}
          >
            Start Free Trial
          </a>
        </motion.div>
      </motion.div>

      {/* Benefits grid */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
        className="mx-auto mt-14 grid max-w-[1000px] gap-4 sm:grid-cols-2 lg:grid-cols-3 md:mt-16"
      >
        {BENEFITS.map((benefit) => (
          <BenefitCard key={benefit.title} {...benefit} />
        ))}
      </motion.div>

      {/* Why Upgrade section */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-16 max-w-[760px] text-center md:mt-20"
      >
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Free gives you access to deals.{' '}
          <span className="text-gradient-brand">
            Premium gives you more ways to catch them.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          The free feed is useful for browsing deals. Premium is designed for people who want faster
          notifications, more deal opportunities, premium Discord access, and additional alerts for
          price errors, penny deals, and more chances to catch deals before they disappear.
        </p>
      </motion.div>

      {/* Free vs Premium comparison */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-14 grid max-w-[760px] gap-5 sm:grid-cols-2 md:mt-16"
      >
        <div className="card p-6 sm:p-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Free</h3>
          <ul className="mt-5 space-y-3">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <FaCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <motion.div className="relative card border-brand/30 p-6 sm:p-8">
          <div className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
            Premium
          </div>
          <div className="mt-1 text-xs font-bold uppercase tracking-wider text-brand">Premium</div>
          <ul className="mt-5 space-y-3">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-200">
                <FaCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                {feature}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Bottom CTA */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-14 max-w-[760px] text-center md:mt-20"
      >
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Ready to catch more deals?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
          Start with a free trial or upgrade directly to premium. Cancel anytime.
        </p>
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={Button({ variant: 'primary', size: 'lg' })}
          >
            Upgrade to Premium
            <FaArrowRight className="text-sm" />
          </a>
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={Button({ variant: 'outline', size: 'lg' })}
          >
            Start Free Trial
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Upgrade;