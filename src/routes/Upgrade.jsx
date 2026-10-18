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
import { useEffect, useState } from 'react';
import clsx from 'clsx';
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
import ScrollReveal, { RevealGroup, RevealItem } from '../components/ScrollReveal';
import { useSplitReveal, refreshScrollTriggers } from '../lib/useGsapText';
import { startCheckout, WHOP_SETUP_URL, WHOP_MONTHLY_URL, WHOP_YEARLY_URL, DISCORD_INVITE } from '../lib/checkout';
import PaymentFlow from '../components/PaymentFlow';
import LinkDiscordToWhop from '../components/LinkDiscordToWhop';
import BillingTransparency from '../components/BillingTransparency';
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

// The free tier lists what it IS, not what it lacks. Every one of these is
// something someone gets real value from today — that is the point. Padding
// this list with basics ("basic deal browsing") made the free tier look thin
// and gave the paid tier nothing to improve on, which is the reason the
// Discord's own members declined to upgrade: the comparison said premium was
// just "more of the same".
const FREE_FEATURES = [
  'The live deal feed, as each find is caught',
  "Other members' finds and the deals they post",
  'Search and filter the feed',
  'Community reviews from people who bought',
  'Public channels, read and browse',
];

// This list was nine items saying one thing — "you see deals sooner":
// "faster alerts", "price error alerts", "penny deal alerts", "more focused
// notifications", "more deal opportunities", "premium-only deal
// opportunities". Six ways of promising the same speed bump, on top of
// "Everything in Free".
//
// Two things were wrong with it beyond the padding. It described FEATURES
// rather than OUTCOMES, so there was nothing for a buyer to picture themselves
// doing. And it never said what is NOT in the free tier, which is the only
// thing a comparison table has to do.
//
// Each line below is therefore one distinguishable thing, phrased as what the
// buyer gets rather than as a system capability. The first line is the whole
// pitch: a price error is usually gone in minutes, and the free tier arrives
// too late to act on it. Everything else supports that.
const PREMIUM_FEATURES = [
  'Everything in Free',
  'Alerts within minutes of a find going live, not a daily digest — a price error is usually gone before then',
  'Your own alert channel: only the finds that match what you actually buy',
  'Members-only finds that never touch the public feed',
  'Dedicated channels for reselling, so you can compare notes without it mixed in with general chat',
  'Priority access when we are set up in a new server',
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
  // Word-by-word heading reveals, the same treatment the homepage gets.
  //
  // SectionHeader already emits data-reveal on its h2, so the attribute was
  // present here and doing nothing — nothing on this page read it. This is the
  // page that has to convince someone to hand over a card, and its headings
  // resolving as you reach them is worth more here than anywhere else on the
  // site.
  const revealScope = useSplitReveal({
    selector: '[data-reveal]',
    type: 'words',
    stagger: 0.04,
    start: 'top 88%',
  });


  const linkability = useLinkability();
  const prefersReduced = useReducedMotion();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [interval, setInterval] = useState(DEFAULT_INTERVAL); // 'month' or 'year'
  const [checkoutError, setCheckoutError] = useState('');

  const handleUpgrade = async () => {
    if (checkoutLoading || trialLoading) return;
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const result = await startCheckout({ interval });
      if (!result.ok) throw new Error('checkout_failed');
    } catch {
      setCheckoutError('Checkout could not open. Please try again, or use the direct Whop links above.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleStartTrial = async () => {
    if (trialLoading || checkoutLoading) return;
    setTrialLoading(true);
    setCheckoutError('');
    try {
      const result = await startCheckout({ trial: true });
      if (!result.ok) throw new Error('checkout_failed');
    } catch {
      setCheckoutError('Checkout could not open. Please try again, or use the direct Whop links above.');
    } finally {
      setTrialLoading(false);
    }
  };

  // The monthly/yearly toggle changes the price text and the height of the
  // comparison card, so ScrollTrigger's cached measurements go stale on
  // click. Without this, the reveals below the toggle fire at the wrong scroll
  // depth after the first switch.
  useEffect(() => {
    const id = setTimeout(() => refreshScrollTriggers(), 120);
    return () => clearTimeout(id);
  }, [interval]);

  return (
    <section
      ref={revealScope}
      className="band-full band-bleed tint-brand relative pb-4 pt-8 sm:pt-12"
      aria-labelledby="upgrade-title"
    >
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
          className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]"
        >
          Less searching.{' '}
          <span className="text-gradient-brand">
            More deal alerts.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
          Price errors, penny deals and member-only finds in your Discord. Choose how you want to join.
        </p>

        {/* Three ways in.
            This block exists because two people arrived here from a TikTok video,
            could not tell what to do next, and left. The page used to open on a
            Free-vs-Premium comparison table, which is a decision — but a visitor
            off a video has not decided anything yet. They need the choice stated
            plainly, cheapest and least committal first.

            Discord is now genuinely the easiest way in, not a consolation prize:
            the Whop trial takes a card, so for someone who just saw a $57 laptop
            and has no intention of typing card details, Discord is the only
            frictionless option and it should be read that way. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mx-auto mt-6 max-w-[1100px]"
          aria-labelledby="start-title"
        >
          <h2
            id="start-title"
            className="sr-only"
          >
            Start here — pick one
          </h2>

          {/* The three ways in reveal in sequence as they scroll into view.
              They used to cascade on MOUNT, which meant the one decision this
              page exists to present had already finished animating before the
              reader had scrolled to it. */}
          <div className="upgrade-choices grid gap-4 text-left md:grid-cols-3">
            {/* Primary action stays first in both DOM and mobile reading order. */}
            <div className="card relative flex flex-col overflow-hidden border-brand/60 p-6" data-plan="trial">
              <div
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand to-transparent"
                aria-hidden="true"
              />
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand">
                  <FaCrown className="text-base" aria-hidden="true" />
                  Free Trial
                </h3>
                <Badge variant="glow" className="text-[10px]">
                  7 days
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">
                $0 for a week
              </p>
              <p className="mt-2 text-sm text-zinc-200">Then {PRICE_MONTHLY_MO} + applicable tax.</p>
              <ul className="mt-4 mb-5 space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Member-only deal channels
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Price error and penny deal alerts
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Card required. Cancel before the trial ends to avoid a charge.
                </li>
              </ul>
              <a
                href={WHOP_MONTHLY_URL}
                className={clsx('mt-auto w-full', buttonClass({ variant: 'primary', size: 'lg' }))}
              >
                Start Free Trial
                <FaArrowRight className="text-sm" aria-hidden="true" />
              </a>
              <p className="mt-3 text-xs text-zinc-300">Secure checkout on Whop. Renews monthly unless canceled.</p>
            </div>

            {/* 2. Discord — free, no card. Kept second rather than first: the
                trial is the paid path this page exists to sell, and a reader
                who wants the community will scroll one card for it. */}
            <div className="card relative flex flex-col overflow-hidden border-white/15 p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
                  <FaDiscord className="text-base text-brand-2" aria-hidden="true" />
                  Join Discord
                </h3>
                <Badge variant="outline" className="text-[10px]">
                  Free
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">Free, no card</p>
              <p className="mt-2 text-sm text-zinc-300">Explore the community first.</p>
              <ul className="mt-4 mb-5 space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  The public deal feed
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Public channels and community finds
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Nothing to cancel, ever — this is the free tier
                </li>
              </ul>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx('mt-auto w-full', buttonClass({ variant: 'outline', size: 'lg' }))}
              >
                <FaDiscord className="text-sm" aria-hidden="true" />
                Join Discord here
              </a>
            </div>

            {/* 3. Yearly — for someone already sold.
                Deliberately NOT a monthly option. Whop's monthly plan carries
                the 7-day trial and the yearly plan does not, so a monthly card
                here would be a second, trial-less way to buy the same thing
                next to a card that says "free trial" — the exact comparison
                that reads as bait-and-switch. Yearly is the only paid tier that
                needs its own card; monthly is reached through the trial. */}
            <div className="card relative flex flex-col overflow-hidden border-white/15 p-6">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-300">
                  <FaBolt className="text-base text-brand-2" aria-hidden="true" />
                  Annual membership
                </h3>
                <Badge variant="outline" className="shrink-0 whitespace-nowrap text-[10px]">
                  No trial
                </Badge>
              </div>
              {/* This card holds one price, so the old price-swap machinery that
                  lived here is gone with it. That machinery was fragile for
                  reasons worth remembering: AnimatePresence mode="wait"
                  deadlocked and settled at opacity 0, and a keyed motion.p
                  completed its enter animation only about half the time. Both
                  were removed rather than tuned. The comparison card further
                  down still swaps on interval — and it does so with a CSS
                  animation on a remounted node, which has no lifecycle to lose
                  track of. Do not reintroduce a JS driver for a price here. */}
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">
                <span className="font-mono tabular-nums">{PRICE_YEARLY_YR}</span>
              </p>
              <p className="mt-2 text-sm text-zinc-300">Billed upfront, plus applicable tax.</p>
              <ul className="mt-4 mb-5 space-y-2 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Full member access from the first minute
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Billed annually — no free trial
                </li>
                <li className="flex items-start gap-2">
                  <FaCheck className="mt-1 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
                  Cancel any time from your Whop account
                </li>
              </ul>
              <a
                href={WHOP_YEARLY_URL}
                className={clsx('mt-auto w-full', buttonClass({ variant: 'outline', size: 'lg' }))}
              >
                <FaCrown className="text-sm" aria-hidden="true" />
                Subscribe Yearly
              </a>
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-center text-sm text-zinc-300">
            Premium checkout is handled by Whop. Joining the free Discord opens Discord directly.
          </p>
          <p role="alert" className="mt-3 text-sm text-zinc-200">{checkoutError}</p>
        </motion.div>

      {/* Free vs Premium comparison with billing interval selector */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-14 max-w-[1100px] md:mt-16"
      >
        {/* Billing interval selector */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="text-sm text-zinc-400">Billing</span>
          {/* The highlight is a single element that SLIDES between the two
              options (layoutId), rather than a background colour swapped on
              two buttons. The slide is the signal that the price below moved
              because of the click — a colour change on the button alone reads
              as two independent toggles. */}
          <div className="relative inline-flex items-center gap-1 rounded-lg bg-charcoal p-1">
            <button
              type="button"
              onClick={() => setInterval('month')}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                interval === 'month' ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {interval === 'month' && (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-md bg-brand-3 shadow-[0_0_16px_rgba(139,92,246,0.45)]"
                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 30 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">Monthly</span>
            </button>
            <button
              type="button"
              onClick={() => setInterval('year')}
              className={`relative px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                interval === 'year' ? 'text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {interval === 'year' && (
                <motion.span
                  layoutId="billing-pill"
                  className="absolute inset-0 rounded-md bg-brand-3 shadow-[0_0_16px_rgba(139,92,246,0.45)]"
                  transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 340, damping: 30 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative z-10">
                Yearly
                <FaTag className="ml-1 inline text-[10px]" aria-hidden="true" />
              </span>
            </button>
          </div>
        </div>

        <RevealGroup stagger={0.12} className="grid gap-5 sm:grid-cols-2">
          <RevealItem className="card relative overflow-hidden p-6 sm:p-8">
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
          </RevealItem>

          <RevealItem className="relative card overflow-hidden border-brand/30 p-6 sm:p-8">
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
              {/* Remounts on interval change, so the CSS animation replays.
                  Same deterministic mechanism as the price in the plan cards
                  above — no JS animation driver to lose track of. */}
              <span className="inline-block">
                <span
                  key={interval === 'month' ? PRICE_MONTHLY_MO : PRICE_YEARLY_YR}
                  className="price-swap relative text-4xl sm:text-5xl font-extrabold tracking-tight text-white"
                >
                  {interval === 'month' ? PRICE_MONTHLY_MO : PRICE_YEARLY_YR}
                </span>
              </span>
              <p className="mt-1 text-sm text-zinc-400">
                {interval === 'month' ? 'Billed monthly' : 'Billed annually'}
              </p>
            </div>
            <ul className="relative mt-5 space-y-3">
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature} className="relative flex items-start gap-2.5 text-sm text-zinc-200">
                  <span className="relative mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded bg-brand/20 text-brand shadow-[0_0_8px_rgba(139,92,246,0.3)]">
                    <FaCheck className="h-3.5 w-3.5" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </RevealItem>
        </RevealGroup>
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
        <RevealGroup
          stagger={0.09}
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
              body: 'You get a confirmation email from Whop. Your role is granted by the Whop bot, and it only knows which Discord account to give it to once you have linked that account to Whop — see the step above. Once linked, the role lands within a minute and the member channels open up.',
            },
            {
              title: 'How to cancel',
              body: 'Cancel from your Whop account any time, or just ask in the server. You keep access until the end of the period you already paid for, and are not charged again.',
            },
          ].map((item) => (
            <RevealItem key={item.title} y={20} className="surface-raised rounded-xl border border-white/10 bg-charcoal-2/60 p-5">
              <p className="text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>

        {/* The panel that says what to actually do about it. The four cards
            above explain that linking is required; this one does the linking,
            with the settings link rather than a description of the path. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.scrollReveal)}
          className="mx-auto mt-8 max-w-[1100px]"
        >
          <LinkDiscordToWhop />
        </motion.div>
      </motion.div>

      {/* The setup service, deliberately not competing with the subscription.
          Named "Deal Feed Setup" rather than "Mirror Setup": mirroring is
          jargon, and a buyer who has to stop to work out what a mirror is has
          already bounced. The URL slug still says mirror because Whop fixes a
          product's route at creation; nobody reads the address.
          It sits below the plans and after the "what each button does" cards so
          the reading order is: what am I paying for -> the subscription -> this
          is an alternative if you want your own feed instead.

          Became $55/month on 2026-10-07, up from a one-time $55. The label is
          now explicit about the cadence at every point of contact, because a
          buyer who discovers the recurrence after paying is a dispute, not a
          sale. It is still visually subordinate to Premium — same product,
          different delivery, and most people here do not need it. */}
      <section className="mx-auto mt-14 max-w-3xl md:mt-16" aria-labelledby="setup-title">
        <div className="surface-raised relative overflow-hidden rounded-xl border border-white/10 bg-charcoal-2/50 p-6 sm:p-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_10%_0%,rgba(139,92,246,0.10),transparent_70%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-glow-3">
              Optional &middot; $55/month
            </p>
            <h2 id="setup-title" className="mt-1 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              Want your own community getting the feed?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              If you run a server and would rather your members saw the finds
              themselves than reading about them, that is a separate monthly
              service at $55. It is not part of Premium and you do not need it to
              be a member here. You can cancel it any time from Whop.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <a
                href={WHOP_SETUP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'outline', size: 'md' })}
              >
                Deal Feed Setup &mdash; $55/month
                <FaArrowRight className="text-xs" />
              </a>
              <p className="text-xs text-zinc-500">$55 a month. Cancel any time, no fee.</p>
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
            className="absolute inset-0 bg-[radial-gradient(90%_120%_at_20%_0%,rgba(139,92,246,0.12),transparent_70%)]"
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
            <RevealGroup as="ul" stagger={0.08} className="mt-5 space-y-3">
              {TRIAL_INCLUDES.map((item) => (
                <RevealItem as="li" key={item} y={14} x={-8} className="flex items-start gap-3 text-sm text-zinc-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand/15 text-brand shadow-[0_0_10px_rgba(139,92,246,0.25)]">
                    <FaCheck className="h-3 w-3" />
                  </span>
                  {item}
                </RevealItem>
              ))}
            </RevealGroup>
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
        <RevealGroup
          stagger={0.08}
          className="mx-auto grid max-w-[1400px] gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {BENEFITS.map((benefit) => (
            <RevealItem key={benefit.title} y={26} blur={3}>
              <FeatureCard icon={benefit.icon} title={benefit.title} text={benefit.text} className="h-full" />
            </RevealItem>
          ))}
        </RevealGroup>
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
      <RevealGroup
        stagger={0.1}
        className="mx-auto mt-16 grid max-w-[1300px] gap-4 sm:grid-cols-3 md:mt-20"
      >
        {TRUST_ITEMS(linkability?.pct).map((item) => (
          <RevealItem
            key={item.label}
            y={24}
            scale={0.97}
            className="card p-4 text-center"
          >
            <div className="mx-auto mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <item.icon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">{item.label}</h3>
            <p className="mt-1 text-xs text-zinc-400">{item.desc}</p>
          </RevealItem>
        ))}
      </RevealGroup>

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

      {/* Charge date and cancel path.

          After the FAQ and before the closing CTA, rather than in a footer.
          Someone holding a card and wondering when it gets used is reading
          this page top to bottom — they are not hunting for small print, and
          every step between "I want to cancel" and the cancel button is a step
          where they talk themselves out of it. */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-14 max-w-[720px]"
      >
        <BillingTransparency />
      </motion.div>

      {/* Final CTA. Revealed on scroll so the closing ask arrives rather than
          already being finished by the time it is reached. */}
      <ScrollReveal distance={30}>
      <CTASection
        title="Ready to catch more deals?"
        description={
          interval === 'month'
            ? 'Try it free for 7 days on Whop, then subscribe for $25/mo. Cancel anytime.'
            : 'Try it free for 7 days on Whop, then subscribe for $200/yr (save $100). Cancel anytime.'
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
      </ScrollReveal>
      </div>
    </section>
  );
};

export default Upgrade;
