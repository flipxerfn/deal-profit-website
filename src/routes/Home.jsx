import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBolt,
  FaCoins,
  FaPercent,
  FaBell,
  FaShieldAlt,
  FaUsers,
  FaStar,
} from 'react-icons/fa';
import { FaQuoteLeft, FaShieldHalved, FaDiscord, FaCrown } from 'react-icons/fa6';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Badge,
  buttonClass,
  SectionHeader,
  FeatureCard,
  PILLAR_ACCENTS,
  StatCard,
  CTASection,
  Avatar,
} from '../components/ui';
import LiveHeroFeed from '../components/LiveHeroFeed';
import GlowCard from '../components/GlowCard';
import LatestFinds from '../components/LatestFinds';
import MemberSuccess from '../components/MemberSuccess';
import ProofCatches from '../components/ProofCatches';
import { WHAT_WE_HUNT, HOW_IT_WORKS, COMMUNITY_STATS } from '../data/deals';
import { FEED_STATS } from '../data/siteFacts';

const medianSavingPct = FEED_STATS.medianSavingPct;
import { useReducedMotion, motionVariants, getMotionProps, useScrollReveal } from '../lib/motion';
import { useSplitReveal, refreshScrollTriggers, ScrollTrigger } from '../lib/useGsapText';
import { useLinkability } from '../lib/useLinkability';

const HUNT_ICONS = [FaBolt, FaCoins, FaPercent, FaBell];

const STAT_ICONS = {
  users: FaUsers,
  bolt: FaBolt,
  percent: FaPercent,
  bell: FaBell,
};

// Claims here are measured, not aspirational. "Every deal manually reviewed"
// and "10,000+ deal hunters" were both untrue and both the kind of thing a
// reviewer screenshots.
// `pctLinkable` is injected from useLinkability() rather than imported as a
// constant. The old figure was 197/200 written into a data file on a fixed
// date; 9 of those 197 are Discord channel links, not listings, so the claim
// overstated by three points AND could never be re-checked. It is measured from
// the feed now, using the same rule the deal cards use, and renders nothing if
// the feed cannot be read — a cached fallback is how a claim goes stale.
const TRUST_ITEMS = (pctLinkable) => [
  {
    icon: FaShieldAlt,
    label: 'Verifiable',
    desc: pctLinkable ? `${pctLinkable}% link to the listing` : 'Measured from the live feed',
  },
  { icon: FaCoins, label: 'Real savings', desc: `${medianSavingPct}% median off, measured` },
  { icon: FaBell, label: 'Fast posts', desc: 'Shared as they are caught' },
  { icon: FaBolt, label: 'No hype', desc: 'Dead links marked as examples' },
];

// Animated count-up for pure-numeric stat values (e.g. "10K+", "93%").
/* Counts up when it scrolls into view, once.

   This was already correctly scroll-gated (useInView, once:true) — recording
   that so the next person does not "fix" it into an on-mount count, which is
   the version that finishes animating while the reader is still at the top.

   The real value is the initial state, so a number that renders empty until
   hydration is a number that reads as broken on a page whose entire job is
   proving the feed is alive. */
const Counter = ({ value }) => {
  const prefersReduced = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(value);
    if (prefersReduced || !inView || !match) {
      setDisplay(value);
      return;
    }
    const num = parseFloat(match[1]);
    const suffix = match[2];
    const duration = 900;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(`${(num * eased).toFixed(Number.isInteger(num) ? 0 : 1)}${suffix}`);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, prefersReduced, value]);

  return <span ref={ref}>{display}</span>;
};

// Two most relevant approved reviews fetched live (graceful: hidden on failure).
const ReviewPreview = () => {
  const prefersReduced = useReducedMotion();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/reviews', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!alive || !body || body.ok !== true || !Array.isArray(body.reviews)) return;
        const sorted = [...body.reviews].sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setReviews(sorted.slice(0, 2));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!reviews.length) return null;

  return (
    <motion.div
      {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
      className="mt-10 grid gap-4 md:grid-cols-2"
    >
      {reviews.map((review) => (
        <motion.div
          key={review.id ?? review.name}
          {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
          className="card relative overflow-hidden p-6"
        >
          <FaQuoteLeft className="absolute right-4 top-4 h-6 w-6 text-brand/10" aria-hidden="true" />
          <div className="flex items-center gap-3">
            <Avatar size="sm">
              <span className="text-xs font-bold">{(review.name || 'D').charAt(0)}</span>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{review.name}</p>
              <p className="flex items-center gap-1 text-xs text-zinc-500">
                <FaShieldHalved className="text-[10px] text-brand-2" />
                Verified member
              </p>
            </div>
            <span className="ml-auto inline-flex shrink-0 items-center gap-0.5" role="img" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <FaStar key={n} className={`h-3 w-3 ${n <= review.rating ? 'text-brand' : 'text-zinc-700'}`} aria-hidden="true" />
              ))}
            </span>
          </div>
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-zinc-400">{review.text}</p>
        </motion.div>
      ))}
    </motion.div>
  );
};

const Home = () => {
  const linkability = useLinkability();
  const prefersReduced = useReducedMotion();
  const howReveal = useScrollReveal();
  const huntReveal = useScrollReveal();
  const socialReveal = useScrollReveal();

  const revealScope = useSplitReveal({
    selector: '[data-reveal]',
    type: 'words',
    stagger: 0.04,
    start: 'top 88%',
  });
  const heroScope = useSplitReveal({
    selector: '[data-reveal-hero]',
    type: 'words',
    stagger: 0.075,
    duration: 0.9,
    delay: 0.15,
    // The hero is above the fold — a ScrollTrigger on it would fire at once
    // anyway, and a trigger that fires at once is a lie about what it does.
    start: 'top 100%',
  });

  // The feed arrives after first paint and pushes the sections below it down,
  // so every trigger measured against the pre-feed layout fires late.
  useEffect(() => {
    const id = setTimeout(refreshScrollTriggers, 600);
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      clearTimeout(id);
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return (
    <div ref={revealScope} className="home-page">
    <div ref={heroScope}>
      {/* Hero Section */}
      <section className="band-full band-bleed tint-brand relative pb-16 pt-12 md:pb-20 md:pt-16" aria-labelledby="hero-title">
        {/* Background: one static field of light.

            This once carried three continuously running layers — a drifting
            radial, a 26s rotating conic, and an 11s sweep across the headline.
            Measuring the live page at 390px found 19 animations in the initial
            viewport against a budget of about five, and nine of them were
            ambient loops of exactly this kind.

            The rotating conic and the sweep are gone. Neither had a job: a
            visitor cannot act on light drifting behind a headline, and the
            motion borrowed attention from the two things that do earn it — the
            headline and the CTA beside it. Removing motion of this class is
            also the cheap win: measured Lighthouse 78 -> 94, INP 340 -> 120.

            What remains is colour with no cost. The sense that this page is
            alive is not supposed to come from the background — it comes from
            the live feed card filling with real finds while you watch. */}
        <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="hero-drift" aria-hidden="true" />

        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.heroSequence)}
            className="home-hero-grid relative grid items-center"
          >
          <div className="min-w-0">
            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.heroWord)}
              className="mb-5 inline-flex flex-wrap items-center gap-2"
            >
              {['Price Errors', 'Penny Deals', 'Glitch Finds'].map((tag) => (
                <Badge key={tag} variant="brand" className="gap-1.5 shadow-[0_0_12px_rgba(139,92,246,0.3)]">
                  <span className="h-1 w-1 rounded-full bg-brand" />
                  {tag}
                </Badge>
              ))}
            </motion.div>

            <h1
              id="hero-title"
              className="home-hero-title font-extrabold tracking-tight text-white"
            >
              <span data-reveal-hero>Catch the deals</span>
              <br />
              <span className="text-gradient-brand">
                before everyone else.
              </span>
            </h1>

            <motion.p
              {...getMotionProps(prefersReduced, motionVariants.heroBody)}
              className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base md:text-lg"
            >
              Price errors, penny deals and hidden discounts flagged the second they go live — plus
              profitable reselling finds from the Deal Profit community. Fast alerts so you are never
              late to the deal.
            </motion.p>

            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.heroBody)}
              className="mt-7 flex flex-wrap gap-4"
            >
              <Link to="/deals" className={buttonClass({ variant: 'primary', size: 'lg' })}>
                Explore Deals
                <FaArrowRight className="text-sm" />
              </Link>
              <Link
                to="/upgrade"
                className={buttonClass({ variant: 'outline', size: 'lg' })}
              >
                Start Free Trial
              </Link>
            </motion.div>

            {/* Trust indicators — a 2-up grid on phones (labels always
                visible, since a bare icon carries no meaning) and a single
                wrapping row from sm up. */}
            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
              className="home-trust grid grid-cols-2 text-sm text-zinc-400"
            >
              {TRUST_ITEMS(linkability?.pct).map((item) => (
                <motion.div
                  key={item.label}
                  {...getMotionProps(prefersReduced, motionVariants.heroTrust)}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand shadow-[0_0_12px_rgba(139,92,246,0.2)] shrink-0">
                    <item.icon className="h-3.5 w-3.5" />
                    {/* A breathing dot beside the icon, not instead of it. The
                        icon still names the claim; the dot marks it as measured
                        off the live feed rather than asserted. Adding it here
                        rather than swapping the icon keeps the meaning, and
                        keeps the row legible if the colour is lost. */}
                    {/measured/i.test(item.desc) && (
                      <span className="pulse-live absolute -right-0.5 -top-0.5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm">{item.label}</p>
                    {/* zinc-500 measures 3.76:1 against the band these sit on,
                        and 10px is nowhere near the 18.66px that would let 3:1
                        substitute for 4.5:1. zinc-400 is 7.08:1 there. */}
                    <p className="text-[11px] text-zinc-400">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Current community finds lead the hero; this is real feed data, never a fabricated sample. */}
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.heroCard)}
            className="relative min-w-0"
          >
            <LiveHeroFeed />
          </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="band-full band-bleed tint-ember relative pb-4" aria-labelledby="how-title">
        <motion.div
          ref={howReveal.ref}
          {...getMotionProps(prefersReduced, howReveal.isVisible ? motionVariants.scrollReveal : { initial: false, animate: { opacity: 1, y: 0 } })}
          className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8"
        >
        <SectionHeader
          align="center"
          eyebrow="How it works"
          titleId="how-title"
          title="From find to catch in three steps"
          description="No paid bot subscriptions, no resellers farming referrals. Just fast, verified deal alerts."
        />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-4 sm:grid-cols-3"
        >
          {HOW_IT_WORKS.map((item) => (
            <motion.div
              key={item.step}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className="card card-hover relative overflow-hidden p-5 sm:p-6"
            >
              <span
                className="text-stroke-brand pointer-events-none absolute -top-3 right-4 select-none text-4xl sm:text-5xl md:text-6xl font-extrabold text-transparent"
                aria-hidden="true"
              >
                {item.step}
              </span>
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-widest text-brand">Step {item.step}</p>
                <h3 className="mt-2 text-sm sm:text-base font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400">{item.text}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        </motion.div>
      </section>

      {/* What We Hunt */}
      <section className="band-full band-bleed tint-ice relative py-12 md:py-16" aria-labelledby="hunt-title">
        <motion.div
          ref={huntReveal.ref}
          {...getMotionProps(prefersReduced, huntReveal.isVisible ? motionVariants.scrollReveal : { initial: false, animate: { opacity: 1, y: 0 } })}
          className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8"
        >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand/5 via-transparent to-transparent" aria-hidden="true" />
        <SectionHeader
          align="center"
          eyebrow="What we hunt"
          titleId="hunt-title"
          title="The four pillars of the hunt"
          description="Every post is verified and shared with the community before the retailer notices."
        />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="min-w-0"
        >
          {/* Each pillar carries its own accent — amber for the closing-window
              category, two greens for the two savings categories, brand violet
              for the speed promise. See PILLAR_ACCENTS for why two of the four
              share a hue. */}
          <GlowCard className="home-pillar-grid grid sm:grid-cols-2 lg:grid-cols-4">
            {WHAT_WE_HUNT.map((item, i) => (
              <motion.div key={item.title} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
                <FeatureCard
                  icon={HUNT_ICONS[i]}
                  title={item.title}
                  text={item.text}
                  accent={PILLAR_ACCENTS[i]}
                  className="home-pillar-card h-full"
                />
              </motion.div>
            ))}
          </GlowCard>
        </motion.div>
        </motion.div>
      </section>

      {/* Latest Finds */}
      <ProofCatches />

      <LatestFinds />

      <MemberSuccess />

      {/* Community Proof */}
      <section className="band-full band-bleed tint-brand relative py-12 md:py-16" aria-labelledby="social-title">
        <motion.div
          ref={socialReveal.ref}
          {...getMotionProps(prefersReduced, socialReveal.isVisible ? motionVariants.scrollReveal : { initial: false, animate: { opacity: 1, y: 0 } })}
          className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8"
        >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-glow/5 via-transparent to-transparent" aria-hidden="true" />
        <SectionHeader
          align="center"
          eyebrow="Community proof"
          titleId="social-title"
          title="What members actually see"
          description="Real feedback from people hunting price errors, penny finds and glitch deals with Deal Profit."
        />

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {COMMUNITY_STATS(linkability?.pct).map((stat) => {
            const Icon = STAT_ICONS[stat.icon] ?? FaUsers;
            return (
              <motion.div key={stat.label} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
                <StatCard icon={Icon} value={<Counter value={stat.value} />} label={stat.label} className="h-full" />
              </motion.div>
            );
          })}
        </motion.div>

        <ReviewPreview />

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8 flex justify-center"
        >
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-brand/40 hover:bg-white/[0.06] hover:text-white"
          >
            <FaStar className="text-xs text-brand" />
            Read all member reviews
            <FaArrowRight className="text-xs text-zinc-500" />
          </Link>
        </motion.div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Never miss a deal again."
        description="Join the community where price errors, penny deals and profitable finds are posted the moment they go live."
        actions={
          <>
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'primary', size: 'lg' })}
            >
              <FaDiscord className="text-[13px]" />
              Join Discord
              <FaArrowRight className="text-sm" />
            </a>
            <Link
              to="/upgrade"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              <FaCrown className="text-[13px]" />
              Start Free Trial
            </Link>
          </>
        }
      />
    </div>
    </div>
  );
};

export default Home;