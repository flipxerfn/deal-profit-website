import { FaDiscord, FaBolt, FaLock, FaUsers, FaShieldAlt, FaCoins, FaComments } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { StatCard, Avatar, CTASection } from '../components/ui';
import ScrollReveal, { RevealGroup, RevealItem } from '../components/ScrollReveal';
import AnimatedFigure from '../components/AnimatedFigure';
import discord1Cropped from '../assets/crops/discord1-cropped.webp';
import discord2Cropped from '../assets/crops/discord2-cropped.webp';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { FEED_STATS } from '../data/siteFacts';
import { useLinkability } from '../lib/useLinkability';

const BENEFITS = [
  {
    icon: FaBolt,
    title: 'Real-time alerts',
    text: 'Get notified the moment a deal goes live.',
  },
  {
    icon: FaLock,
    title: 'Exclusive channels',
    text: 'Member-only price errors and penny finds.',
  },
  {
    icon: FaUsers,
    title: 'Deal-hunting community',
    text: 'Learn from experienced deal hunters.',
  },
];

// Measured from the live feed, not estimated — see data/siteFacts.js.
//
// `figure` values count up as the tile scrolls in. The number is already in
// the DOM on first paint (that is the whole point of AnimatedFigure), so the
// motion is additive rather than the thing that makes the figure exist.
const STATS = (pctLinkable) => [
  {
    icon: FaBolt,
    figure: { value: FEED_STATS.dealsInFeed },
    label: 'Finds in feed',
  },
  {
    icon: FaShieldAlt,
    // This number is MEASURED from the live feed, so it can legitimately be
    // unavailable: the request failed, or there were not yet enough posts to
    // say anything true.
    //
    // It used to render the string "--" in that case, which is the worst
    // possible answer. A dash in a stat tile reads as a value that failed to
    // load, so a reader concludes the claim is broken rather than unmeasured —
    // on the one card whose whole job is to prove the feed is real. Same
    // reasoning as SiteCounter refusing to render "0 finds".
    //
    // So it renders the icon at reduced opacity instead: clearly "not
    // measured yet", clearly not a number, and it never asserts anything.
    figure: pctLinkable == null ? null : { value: pctLinkable, suffix: '%' },
    fallback: <FaShieldAlt className="mx-auto h-5 w-5 text-zinc-600" aria-hidden="true" />,
    label: 'Link straight to the listing',
  },
  {
    icon: FaCoins,
    figure: { value: FEED_STATS.medianSavingPct, suffix: '%' },
    label: 'Median off',
  },
  { icon: FaComments, staticValue: '24/7', label: 'Monitoring' },
];

const MEMBER_INITIALS = ['PH', 'RK', 'JT', 'MS', 'AL'];

const ScreenshotCard = ({ image, alt, title, stat, note }) => (
  <motion.div
    // Lifts and tilts toward the pointer. Transform-only, so the hover costs a
    // composited layer rather than a repaint of the image.
    whileHover={{ y: -6, rotate: -0.6 }}
    transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.8 }}
    className="group card overflow-hidden p-3"
  >
    <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-charcoal-2">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
    </div>
    <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-4">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-zinc-500">{note}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-2">
        <span className="h-1 w-1 rounded-full bg-brand" />
        {stat}
      </span>
    </div>
  </motion.div>
);

const Discord = () => {
  const linkability = useLinkability();
  const prefersReduced = useReducedMotion();

  return (
    <section className="pb-4" aria-labelledby="discord-title">
      {/* Hero. Above the fold, so this one stays mount-triggered: it is the
          first thing on screen and its motion would be over either way. */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto max-w-[760px] text-center"
      >
        <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5865F2]/15 text-[#8b95f7]">
          <FaDiscord className="h-6 w-6" />
        </div>
        <h1
          id="discord-title"
          className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]"
        >
          See the deals{' '}
          <span className="text-gradient-brand">
            before they disappear.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Our Discord is where price errors, penny deals and glitch finds are posted in real time,
          straight to member channels.
        </p>
      </motion.div>

      {/* Stats.
          Scroll-triggered, not mount-triggered. These tiles sit below the fold,
          and the cascade used to play while the page was still loading, so a
          reader arriving here saw four finished tiles and no movement at all.
          Each figure now counts up from just under its real value as the tile
          comes into view. */}
      <RevealGroup
        stagger={0.11}
        className="mx-auto mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {STATS(linkability?.pct).map((stat) => (
          <RevealItem key={stat.label} y={26} scale={0.97}>
            <StatCard
              icon={stat.icon}
              value={
                stat.figure ? (
                  <AnimatedFigure value={stat.figure.value} suffix={stat.figure.suffix} />
                ) : (
                  stat.staticValue ?? stat.fallback
                )
              }
              label={stat.label}
              className="h-full"
            />
          </RevealItem>
        ))}
      </RevealGroup>

      {/* Screenshots. The two channel captures rise and settle in sequence
          rather than appearing as two flat panels. */}
      <RevealGroup
        stagger={0.14}
        className="mx-auto mt-12 grid max-w-[860px] gap-5 sm:grid-cols-2 md:mt-14"
      >
        <RevealItem y={40} scale={0.96}>
          <ScreenshotCard
            image={discord1Cropped}
            alt="Discord channels showing real-time deal alerts"
            title="Deal alerts, live"
            note="Price errors posted as they appear"
            stat="Real-time"
          />
        </RevealItem>
        <RevealItem y={40} scale={0.96}>
          <ScreenshotCard
            image={discord2Cropped}
            alt="Discord members sharing product finds and reselling opportunities"
            title="Community finds"
            note="Profitable picks shared by members"
            stat="Exclusive"
          />
        </RevealItem>
      </RevealGroup>

      {/* Benefits */}
      <RevealGroup
        stagger={0.1}
        className="mx-auto mt-14 grid max-w-[900px] gap-4 sm:grid-cols-3 md:mt-16"
      >
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <RevealItem key={benefit.title} y={28} blur={4}>
              <motion.div
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.8 }}
                className="card h-full p-6 text-center"
              >
                <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#5865F2]/15 text-[#8b95f7]">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold text-white">{benefit.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.text}</p>
              </motion.div>
            </RevealItem>
          );
        })}
      </RevealGroup>

      {/* Social proof.
          The avatar row pops in one face at a time. It is the only element on
          the page that reads as a group of people rather than a group of
          cards, so it is the one place a stagger reads as arrival. */}
      <ScrollReveal className="mt-12 flex items-center justify-center gap-3 md:mt-14" distance={18}>
        {/* RevealGroup rather than framer's own whileInView: these avatars are
            the one place a skipped trigger is very obvious (four of five faces
            missing), so they go through the same reveal path the rest of the
            page uses, which self-heals when a fast scroll skips the observer. */}
        <RevealGroup stagger={0.07} amount={0.3} className="flex -space-x-3">
          {MEMBER_INITIALS.map((ini, i) => (
            <RevealItem
              as="span"
              key={ini}
              y={0}
              x={-10}
              scale={0.6}
              className="inline-flex"
            >
              <Avatar size="sm" className={`ring-2 ring-night ${i % 2 ? 'grayscale' : ''}`}>
                <span className="text-[10px] font-bold">{ini}</span>
              </Avatar>
            </RevealItem>
          ))}
        </RevealGroup>
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-white">
            <AnimatedFigure value={FEED_STATS.dealsInFeed} /> finds
          </span>{' '}
          posted to the server so far
        </p>
      </ScrollReveal>

      {/* CTA. Revealed on scroll like the sections above it, so the closing ask
          arrives rather than already being there. */}
      <ScrollReveal distance={30}>
        <CTASection
          eyebrow="Live community"
          title="New members are joining as finds are caught."
          description="Join the server, catch the next price error first, and learn from the people who find them daily."
          actions={
            <a
              href="https://discord.gg/dealprofit"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-7 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(88,101,242,0.4)] transition-all duration-200 hover:bg-[#6b76f3] hover:shadow-[0_0_32px_rgba(88,101,242,0.55)] active:scale-[0.98]"
            >
              <FaDiscord className="text-base" />
              Join the Deal Profit Discord
            </a>
          }
        />
      </ScrollReveal>
    </section>
  );
};

export default Discord;
