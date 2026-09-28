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
  FaArrowRight,
  FaDiscord,
  FaShieldAlt,
  FaUsers,
  FaStar,
  FaTag,
} from 'react-icons/fa';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Badge,
  buttonClass,
  SectionHeader,
  FeatureCard,
  CTASection,
  Accordion,
  CardHover,
} from '../components/ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { startCheckout, DISCORD_INVITE } from '../lib/checkout';
import PaymentFlow from '../components/PaymentFlow';

const PRICE_MONTHLY = '$25';
const PRICE_YEARLY = '$200';
const PRICE_MONTHLY_MO = '$25/mo';
const PRICE_YEARLY_YR = '$200/yr';
const YEARLY_SAVINGS = 'Save $100/yr';
const DEFAULT_INTERVAL = 'month';

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

// Trial content merged in from the old /trial page
const TRIAL_INCLUDES = [
  'Instant access to member deal channels',
  'Price error and penny deal alerts',
  'Reselling opportunities from the community',
  'Cancel anytime during the trial',
];

const TRUST_ITEMS = [
  { icon: FaShieldAlt, label: 'Verified Deals', desc: 'Every deal manually reviewed' },
  { icon: FaUsers, label: 'Active Community', desc: '10,000+ deal hunters' },
  { icon: FaStar, label: 'High Success Rate', desc: '93% average savings' },
];

const FAQS = [
  {
    title: 'How does the free trial work?',
    content:
      'Start the 7-day free trial from any trial button — you\'ll link your Discord, then check out with Stripe. It\'s free for 7 days; your card is charged $25/month only if you keep the subscription past day 7. Cancel anytime during the trial.',
  },
  {
    title: 'Can I cancel anytime?',
    content:
      'Yes — cancel from your Stripe customer portal at any time. Your access stays until the end of the current billing period.',
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
  {
    title: 'Is there a yearly plan?',
    content:
      'Yes — choose the yearly plan for $200/year and save $100 compared to monthly billing. You get the same premium features with a full year of uninterrupted access.',
  },
];

const Upgrade = () => {
  const prefersReduced = useReducedMotion();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [interval, setInterval] = useState(DEFAULT_INTERVAL); // 'month' or 'year'

  const handleUpgrade = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    const result = await startCheckout({ interval });
    if (!result.ok) {
      console.error('Checkout failed to start:', result.error);
      setCheckoutLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (trialLoading) return;
    setTrialLoading(true);
    const result = await startCheckout({ trial: true, interval });
    if (!result.ok) {
      console.error('Trial checkout failed to start:', result.error);
      setTrialLoading(false);
    }
  };

  return (
    <section className="band-full band-bleed tint-brand relative pb-4 pt-12" aria-labelledby="upgrade-title">
      {/* Background glow */}
      <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 h-[500px] -translate-y-1/2 bg-gradient-to-t from-brand/5 via-transparent to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">

      {/* Hero */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto max-w-[960px] text-center"
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
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className={buttonClass({ variant: 'primary', size: 'lg' })}
          >
            <FaCrown className="text-sm" />
            {checkoutLoading
              ? 'Redirecting to Stripe...'
              : interval === 'month'
              ? 'Upgrade — $25/mo'
              : 'Upgrade — $200/yr'}
            <FaArrowRight className="text-sm" />
          </button>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass({ variant: 'outline', size: 'lg' })}
          >
            <FaDiscord className="text-sm" />
            Join Discord
          </a>
        </motion.div>
        <motion.p
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-6 text-sm text-zinc-400"
        >
          Start with a <strong className="text-white">7-day free trial</strong> — card required, then{' '}
          <strong className="text-white">
            {interval === 'month' ? '$25/mo' : '$200/yr'}
          </strong>{' '}
          only after day 7 · cancel anytime before then and you pay nothing.
        </motion.p>
      </motion.div>

      {/* Setup flow (moved from /payment) — action first, before the marketing */}
      <div className="mt-12 md:mt-16">
        <PaymentFlow />
      </div>

      {/* What's included in the trial (moved from /trial) */}
      <div className="mx-auto mt-14 max-w-2xl md:mt-16">
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
            <p className="mt-3 text-sm text-zinc-400">
              Choose {interval === 'month' ? '$25/mo' : '$200/yr (save $100)'} after your 7-day trial ends.
            </p>
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
          className="mx-auto grid max-w-[1400px] gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
        className="mx-auto mt-16 max-w-[960px] text-center md:mt-20"
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

      {/* Free vs Premium comparison with billing interval selector */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-14 max-w-[1100px] md:mt-16"
      >
        {/* Billing interval selector */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="text-sm text-zinc-400">Billing</span>
          <div className="relative inline-flex items-center gap-1 rounded-lg bg-charcoal p-1">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                interval === 'month'
                  ? 'bg-brand-3 text-white shadow-[0_0_16px_rgba(224,45,74,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-all ${
                interval === 'year'
                  ? 'bg-brand-3 text-white shadow-[0_0_16px_rgba(224,45,74,0.4)]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yearly
              <FaTag className="ml-1 inline text-[10px]" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="relative text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-2">
                <FaCrown className="text-sm" aria-hidden="true" />
                Premium
              </h3>
              {interval === 'year' && (
                <Badge variant="glow" className="text-xs">
                  {YEARLY_SAVINGS}
                </Badge>
              )}
            </div>
            <div className="mb-5 text-center">
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                {interval === 'month' ? PRICE_MONTHLY_MO : PRICE_YEARLY_YR}
              </span>
              <p className="mt-1 text-sm text-zinc-400">
                {interval === 'month' ? 'Billed monthly' : 'Billed annually'}
              </p>
            </div>
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
        </div>
      </motion.div>

      {/* Trust indicators (moved from /trial) */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
        className="mx-auto mt-16 grid max-w-[1300px] gap-4 sm:grid-cols-3 md:mt-20"
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

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-4xl md:mt-20">
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
        description={
          interval === 'month'
            ? 'Start the 7-day free trial or go straight to $25/mo. Cancel anytime.'
            : 'Start the 7-day free trial or go straight to $200/yr (save $100). Cancel anytime.'
        }
        actions={
          <>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={checkoutLoading}
              className={buttonClass({ variant: 'primary', size: 'lg' })}
            >
              <FaCrown className="text-sm" />
              {interval === 'month' ? 'Upgrade — $25/mo' : 'Upgrade — $200/yr'}
              <FaArrowRight className="text-sm" />
            </button>
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={trialLoading}
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              <FaCrown className="text-sm" />
              {trialLoading ? 'Redirecting…' : 'Start 7-Day Free Trial'}
            </button>
          </>
        }
      />
      </div>
    </section>
  );
};

export default Upgrade;