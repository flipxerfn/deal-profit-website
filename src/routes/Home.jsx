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
  StatCard,
  CTASection,
  Avatar,
} from '../components/ui';
import DealCard from '../components/DealCard';
import LiveHeroFeed from '../components/LiveHeroFeed';
import rtpcImg from '../assets/crops/deal1-hero.webp';
import { HOME_FINDS, WHAT_WE_HUNT, HOW_IT_WORKS, COMMUNITY_STATS, DEALS } from '../data/deals';
import { FEED_STATS, pctPostsLinkable } from '../data/siteFacts';

const medianSavingPct = FEED_STATS.medianSavingPct;
import { useReducedMotion, motionVariants, getMotionProps, useScrollReveal } from '../lib/motion';

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
const TRUST_ITEMS = [
  { icon: FaShieldAlt, label: 'Verifiable', desc: `${pctPostsLinkable}% link to the listing` },
  { icon: FaCoins, label: 'Real savings', desc: `${medianSavingPct}% median off, measured` },
  { icon: FaBell, label: 'Fast posts', desc: 'Shared as they are caught' },
  { icon: FaBolt, label: 'No hype', desc: 'Dead links marked as examples' },
];

const TICKER = DEALS;

// Staggered word-by-word reveal for the hero headline line (respects reduced motion).
const StaggerLine = ({ text, className = '', delay = 0 }) => {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return <span className={className}>{text}</span>;
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          className="inline-block will-change-transform"
          initial={{ opacity: 0, y: '0.45em' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {word}
          {i < words.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  );
};

// Animated count-up for pure-numeric stat values (e.g. "10K+", "93%").
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
  const prefersReduced = useReducedMotion();
  const howReveal = useScrollReveal();
  const huntReveal = useScrollReveal();
  const findsReveal = useScrollReveal();
  const socialReveal = useScrollReveal();

  return (
    <>
      {/* Hero Section */}
      <section className="band-full band-bleed tint-brand relative pb-16 pt-12 md:pb-20 md:pt-16" aria-labelledby="hero-title">
        {/* Background: glows, animated orbs, subtle grid */}
        <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden="true" />
        <motion.div
          {...getMotionProps(prefersReduced, {
            animate: { x: [0, 34, 0], y: [0, 20, 0] },
            transition: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
          })}
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/10 blur-[90px]"
          aria-hidden="true"
        />
        <motion.div
          {...getMotionProps(prefersReduced, {
            animate: { x: [0, -28, 0], y: [0, -16, 0] },
            transition: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
          })}
          className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-glow/10 blur-[100px]"
          aria-hidden="true"
        />

        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
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
              className="text-shadow-glow text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-4xl md:text-[44px] lg:text-5xl xl:text-6xl"
            >
              <StaggerLine text="Catch the deals" delay={0.08} />
              <br />
              <StaggerLine text="before everyone else." className="text-gradient-brand" delay={0.34} />
            </motion.h1>

            <motion.p
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mt-5 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base md:text-lg"
            >
              Price errors, penny deals and hidden discounts flagged the second they go live — plus
              profitable reselling finds from the Deal Profit community. Fast alerts so you are never
              late to the deal.
            </motion.p>

            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link to="/deals" className={buttonClass({ variant: 'primary', size: 'lg' })}>
                Explore Deals
                <FaArrowRight className="text-sm" />
              </Link>
              <a
                href="https://discord.gg/dealprofit"
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'outline', size: 'lg' })}
              >
                Start Free Trial
              </a>
            </motion.div>

            {/* Trust indicators — a 2-up grid on phones (labels always
                visible, since a bare icon carries no meaning) and a single
                wrapping row from sm up. */}
            <motion.div
              {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
              className="mt-10 grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-zinc-400 sm:flex sm:flex-wrap sm:items-center sm:gap-6 sm:text-sm"
            >
              {TRUST_ITEMS.map((item) => (
                <div key={item.label} className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand shadow-[0_0_12px_rgba(244,63,94,0.2)] shrink-0">
                    <item.icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="font-semibold text-white text-sm">{item.label}</p>
                    <p className="text-[10px] text-zinc-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Premium deal card + live ticker */}
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="relative"
          >
            <div className="rounded-2xl border border-white/10 bg-charcoal p-3 shadow-[0_24px_70px_rgba(0,0,0,0.55),0_0_50px_rgba(244,63,94,0.12)]">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-charcoal-2">
                <img
                  src={rtpcImg}
                  alt="RTX 5060 Gaming PC retailer listing for $39.99"
                  decoding="async"
                  className="h-full w-full object-cover object-center brightness-[0.96]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/50 via-black/5 to-black/15" aria-hidden="true" />
                <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                  <Badge variant="brand" className="shadow-[0_0_12px_rgba(244,63,94,0.4)]">Price error</Badge>
                  <Badge variant="outline" className="border-black/30 bg-black/50 text-zinc-200 backdrop-blur-sm">Tech</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3 px-3 pb-2 pt-4">
                <div>
                  <p className="text-sm font-bold text-white">RTX 5060 Gaming PC</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    <span className="line-through decoration-zinc-600">Retail $599.99</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight text-brand">$39.99</p>
                  <p className="text-xs font-semibold text-brand-2">Example: 93% off</p>
                </div>
              </div>
              <div className="mx-2 mb-1 border-t border-white/10 px-1 pb-1 pt-3">
                <p className="text-xs text-zinc-400">
                  <FaBolt className="mr-1 inline h-3 w-3 text-brand" />
                  Archived example — the live feed is below
                </p>
              </div>
              <LiveHeroFeed />
            </div>

            {/* Floating badge */}
            <motion.div
              {...getMotionProps(prefersReduced, {
                ...motionVariants.fadeInUp,
                animate: { opacity: 1, y: 0, rotate: [-2, 2, -2, 0] },
              })}
              className="absolute -right-2 -top-5 sm:-right-4"
            >
              <div className="inline-flex items-center gap-2 rounded-xl border border-brand/30 bg-brand/20 px-4 py-3 text-white shadow-[0_0_40px_rgba(244,63,94,0.35),0_8px_30px_rgba(0,0,0,0.4)]">
                <FaBolt className="h-5 w-5 text-brand" />
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-2">Example find</p>
                  <p className="text-sm font-extrabold">93% OFF</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
          </div>
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
          title="From find to profit in three steps"
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
          title="The four pillars of the hunt"
          description="Every post is verified and shared with the community before the retailer notices."
        />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {WHAT_WE_HUNT.map((item, i) => (
            <motion.div key={item.title} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
              <FeatureCard icon={HUNT_ICONS[i]} title={item.title} text={item.text} className="h-full" />
            </motion.div>
          ))}
        </motion.div>
        </motion.div>
      </section>

      {/* Latest Finds */}
      <section className="band-full band-bleed tint-glow relative pb-4" aria-labelledby="finds-title">
        <motion.div
          ref={findsReveal.ref}
          {...getMotionProps(prefersReduced, findsReveal.isVisible ? motionVariants.scrollReveal : { initial: false, animate: { opacity: 1, y: 0 } })}
          className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 md:py-12 lg:px-8"
        >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-brand/20 to-transparent" aria-hidden="true" />
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
        </div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-5 sm:grid-cols-2"
        >
          {HOME_FINDS.map((deal) => (
            <motion.div
              key={deal.id}
              className="min-w-0"
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
            >
              <DealCard deal={deal} spotlight={deal.id === 'penny-cpu'} />
            </motion.div>
          ))}
        </motion.div>
        </motion.div>
      </section>

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
          title="What members actually see"
          description="Real feedback from people hunting price errors, penny finds and glitch deals with Deal Profit."
        />

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {COMMUNITY_STATS.map((stat) => {
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
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass({ variant: 'outline', size: 'lg' })}
            >
              <FaCrown className="text-[13px]" />
              Start Free Trial
            </a>
          </>
        }
      />
    </>
  );
};

export default Home;