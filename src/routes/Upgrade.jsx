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
import { startCheckout, WHOP_SETUP_URL } from '../lib/checkout';
import PaymentFlow from '../components/PaymentFlow';
import { UPGRADE_FAQS as FAQS } from '../lib/upgradeContent';
import { FEED_STATS } from '../data/siteFacts';
import { useLinkability } from '../lib/useLinkability';

const medianSavingPct = FEED_STATS.medianSavingPct;

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
  'Instant access to the member deal channels',
  'Price error and penny deal alerts',
  'Reselling opportunities from the community',
  'Card on file for the trial — cancel before it ends and you pay nothing',
];

// Measured live. The old figure was a constant counting 9 Discord channel
// links as links to a listing — see lib/useLinkability.js.
const TRUST_ITEMS = (pctLinkable) => [
  {
    icon: FaShieldAlt,
    label: 'Verifiable',
    desc: pctLinkable ? `${pctLinkable}% link to the listing` : 'Measured from the live feed',
  },
  { icon: FaCoins, label: 'Real savings', desc: `${medianSavingPct}% median off, measured` },
  { icon: FaBell, label: 'Fast posts', desc: 'Shared as they are caught' },
];


const Upgrade = () => {
  const linkability = useLinkability();
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
              ? 'Opening checkout...'
              : interval === 'month'
              ? 'Upgrade — $25/mo'
              : 'Upgrade — $200/yr'}
            <FaArrowRight className="text-sm" />
          </button>
          <button
            type="button"
            onClick={handleStartTrial}
            disabled={trialLoading}
            className={buttonClass({ variant: 'outline', size: 'lg' })}
          >
            <FaDiscord className="text-sm" />
            {trialLoading ? 'Opening Whop...' : 'Start Free Trial'}
          </button>
        </motion.div>
        <motion.p
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-6 text-sm text-zinc-400"
        >
          The free trial starts on <strong className="text-white">Whop</strong> — 7 days free,
          then {interval === 'month' ? '$25/mo' : '$200/yr'} unless you cancel. A card is
          required to start it, and you can cancel from your Whop account at any time
          before the trial ends.
        </motion.p>

        {/* The part people actually get wrong: clicking a button on a site
            should not be a mystery. Say exactly what each button does and what
            happens next, before they commit to anything. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2"
        >
          {[
            {
              title: 'What the trial button does',
              body: 'Opens our checkout page on Whop and starts a 7-day free trial. Whop asks for a card so the trial can roll into a subscription. Cancel from your Whop account before the trial ends and you are never charged.',
            },
            {
              title: 'What the upgrade button does',
              body: `Takes you to our checkout page on Whop, where you pay ${interval === 'month' ? '$25 a month' : '$200 a year'}. Whop handles the card details — they never touch this site.`,
            },
            {
              title: 'What happens after you pay',
              body: 'You get a confirmation email, our bot invites you to the server and gives you the Premium role, and the member channels open up. Usually within a minute.',
            },
            {
              title: 'How to cancel',
              body: 'Cancel from your Whop account any time, or just ask in the server. You keep access until the end of the period you already paid for, and are not charged again.',
            },
          ].map((item) => (
            <div key={item.title} className="surface-raised rounded-xl border border-white/10 bg-charcoal-2/60 p-5">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* One-time service, deliberately not competing with the subscription.
          Named "Deal Feed Setup" rather than "Mirror Setup": mirroring is
          jargon, and a buyer who has to stop to work out what a mirror is has
          already bounced. The URL slug still says mirror because Whop fixes a
          product's route at creation; nobody reads the address.
          It sits below the plans and after the "what each button does" cards so
          the reading order is: what am I paying for -> the subscription -> this
          is an alternative if you want your own feed instead. */}
      <section className="mx-auto mt-14 max-w-3xl md:mt-16" aria-labelledby="setup-title">
        <div className="surface-raised relative overflow-hidden rounded-xl border border-white/10 bg-charcoal-2/50 p-6 sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_10%_0%,rgba(139,92,246,0.10),transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-glow-3">
              Optional &middot; one-time
            </p>
            <h2 id="setup-title" className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Want your own community getting the feed?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              If you run a server and would rather your members saw the finds
              themselves than reading about them, that is a separate one-time
              setup. It is not part of Premium and you do not need it to be a
              member here.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <a
                href={WHOP_SETUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'outline', size: 'md' })}
              >
                Deal Feed Setup &mdash; $55 once
                <FaArrowRight className="text-xs" />
              </a>
              <p className="text-xs text-zinc-500">One-time fee. Nothing to cancel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Setup flow (moved from /payment) — action first, before the marketing */}
      <div className="mt-12 md:mt-16">
        <PaymentFlow />
      </div>

      {/* What's included in the trial (moved from /trial) */}
      <div className="mx-auto mt-14 max-w-2xl md:mt-16">
        <div className="surface-raised relative overflow-hidden rounded-xl border border-brand/20 bg-charcoal p-6 sm:p-8">
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
              Subscribe for {interval === 'month' ? '$25/mo' : '$200/yr (save $100)'} whenever you're ready.
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

      {/* Trust indicators (moved from /trial) */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
        className="mx-auto mt-16 grid max-w-[1300px] gap-4 sm:grid-cols-3 md:mt-20"
      >
        {TRUST_ITEMS(linkability?.pct).map((item) => (
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
            ? 'Try it free in Discord, then subscribe for $25/mo. Cancel anytime.'
            : 'Try it free in Discord, then subscribe for $200/yr (save $100). Cancel anytime.'
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
              {trialLoading ? 'Opening Whop…' : 'Start Free Trial'}
            </button>
          </>
        }
      />
      </div>
    </section>
  );
};

export default Upgrade;