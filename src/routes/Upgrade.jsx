import {
  FaBolt,
  FaFire,
  FaCoins,
  FaSkullCrossbones,
  FaComment,
  FaBell,
  FaChartLine,
  FaTrophy,
  FaCheck,
  FaCrown,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import {
  Badge,
  buttonClass,
  SectionHeader,
  FeatureCard,
  CTASection,
  Accordion,
} from '../components/ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

const WHOP_URL = 'https://whop.com/deal-profit-6dcc/price-error-66';
const PRICE = '$25';

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
    text: "Access selected opportunities that aren't included in the public free feed.",
  },
];

const PRICING_HIGHLIGHTS = [
  'Faster member-first alerts',
  'Price errors & penny finds',
  'Premium Discord access',
  'Reselling opportunities',
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

const FAQS = [
  {
    title: 'How does the free trial work?',
    content:
      'Start the free trial through Whop with no commitment. You keep full access until the trial ends, then it converts to the $25/month premium plan unless you cancel.',
  },
  {
    title: 'Can I cancel anytime?',
    content:
      'Yes — cancel from your Whop account at any time. Your access stays until the end of the current billing period.',
  },
  {
    title: 'What makes the premium feed different?',
    content:
      'Premium members get faster alerts plus priority notifications for price errors, penny deals and reselling opportunities that stay out of the public feed.',
  },
  {
    title: 'Are the deals guaranteed?',
    content:
      'No. Retailers can correct pricing errors at any time, and stock is often limited. Deals are posted fast specifically so you can act before that happens.',
  },
];

const PricingCard = () => (
  <div className="mx-auto mt-12 max-w-md">
    <div className="relative overflow-hidden rounded-2xl border border-brand/30 bg-charcoal p-8 shadow-[0_30px_80px_rgba(0,0,0,0.55),0_0_60px_rgba(244,63,94,0.14)]">
      <div
        className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-glow/10"
        aria-hidden="true"
      />
      <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(244,63,94,0.5)]">
        Deal Profit Premium
      </div>

      <div className="relative text-center">
        <p className="text-5xl font-extrabold tracking-tight text-white">
          {PRICE}
          <span className="text-xl font-bold text-zinc-400">/mo</span>
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Start free — pay {PRICE}/month after your trial. Cancel anytime.
        </p>
        <a
          href={WHOP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonClass({ variant: 'primary', size: 'lg' })} mt-6 w-full`}
        >
          <FaCrown className="text-sm" />
          Start Free Trial
        </a>
        <ul className="mt-6 space-y-2 text-left text-sm text-zinc-300">
          {PRICING_HIGHLIGHTS.map((feature) => (
            <li key={feature} className="flex items-center gap-2.5">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand/20 text-brand shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                <FaCheck className="h-3 w-3" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const Upgrade = () => {
  const prefersReduced = useReducedMotion();

  return (
    <section className="relative pb-4 pt-12" aria-labelledby="upgrade-title">
      {/* Background glow */}
      <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[500px] -translate-y-1/2 bg-gradient-to-t from-brand/5 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Hero */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto max-w-[760px] text-center"
      >
        <Badge variant="glow" className="mb-4 shadow-[0_0_16px_rgba(139,92,246,0.4)]">
          Deal Profit Premium
        </Badge>
        <h1
          id="upgrade-title"
          className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]"
        >
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
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'primary', size: 'lg' })}
          >
            <FaCrown className="text-sm" />
            Upgrade to Premium
          </a>
          <a
            href={WHOP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline', size: 'lg' })}
          >
            Start Free Trial
          </a>
        </motion.div>
      </motion.div>

      {/* Pricing */}
      <PricingCard />

      {/* Benefits grid */}
      <div className="mt-16 md:mt-20">
        <SectionHeader
          align="center"
          eyebrow="Everything included"
          title="Built for people who hate missing deals"
          description="Every premium feature is designed around one goal: catching the deal before it is gone."
        />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="mx-auto grid max-w-[1000px] gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {BENEFITS.map((benefit) => (
            <motion.div key={benefit.title} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
              <FeatureCard icon={benefit.icon} title={benefit.title} text={benefit.text} className="h-full" />
            </motion.div>
          ))}
        </motion.div>
      </div>

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
        <div className="card relative overflow-hidden p-6 sm:p-8">
          <div
            className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-transparent"
            aria-hidden="true"
          />
          <h3 className="relative text-xs font-bold uppercase tracking-wider text-zinc-400">Free</h3>
          <ul className="relative mt-5 space-y-3">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="relative flex items-start gap-2.5 text-sm text-zinc-300">
                <span className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-500">
                  <FaCheck className="h-3.5 w-3.5" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative card overflow-hidden border-brand/30 p-6 sm:p-8">
          <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-glow/5" aria-hidden="true" />
          <h3 className="relative text-xs font-bold uppercase tracking-wider text-brand">
            <FaCrown className="mr-1 inline text-sm text-brand" aria-hidden="true" />
            Premium — {PRICE}/mo
          </h3>
          <ul className="relative mt-5 space-y-3">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature} className="relative flex items-start gap-2.5 text-sm text-zinc-200">
                <span className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-brand/20 text-brand shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                  <FaCheck className="h-3.5 w-3.5" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-2xl md:mt-20">
        <SectionHeader
          align="center"
          eyebrow="FAQ"
          title="Questions, answered"
          description="Everything you need to know before joining premium."
        />
        <Accordion items={FAQS} />
      </div>

      {/* Final CTA */}
      <CTASection
        title="Ready to catch more deals?"
        description="Start with a free trial or upgrade straight to premium. Cancel anytime."
        actions={
          <>
            <a
              href={WHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'primary', size: 'lg' })}
            >
              <FaCrown className="text-sm" />
              Upgrade to Premium
            </a>
            <a
              href={WHOP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              Start Free Trial
            </a>
          </>
        }
      />
    </section>
  );
};

export default Upgrade;