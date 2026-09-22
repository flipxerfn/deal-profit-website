import { FaDiscord, FaBolt, FaLock, FaUsers, FaGlobe, FaShieldAlt, FaComments } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { buttonClass, StatCard, Avatar, CTASection } from '../components/ui';
import discord1Cropped from '../assets/crops/discord1-cropped.png';
import discord2Cropped from '../assets/crops/discord2-cropped.png';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

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

const STATS = [
  { icon: FaGlobe, value: '10K+', label: 'Members' },
  { icon: FaBolt, value: '50+', label: 'Deals/Day' },
  { icon: FaShieldAlt, value: '93%', label: 'Avg Savings' },
  { icon: FaComments, value: '24/7', label: 'Activity' },
];

const MEMBER_INITIALS = ['PH', 'RK', 'JT', 'MS', 'AL'];

const ScreenshotCard = ({ image, alt, title, stat, note }) => (
  <motion.div className="group card overflow-hidden p-3">
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
  const prefersReduced = useReducedMotion();

  return (
    <section className="pb-4" aria-labelledby="discord-title">
      {/* Hero */}
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

      {/* Stats */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
        className="mx-auto mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {STATS.map((stat) => (
          <motion.div key={stat.label} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
            <StatCard icon={stat.icon} value={stat.value} label={stat.label} className="h-full" />
          </motion.div>
        ))}
      </motion.div>

      {/* Screenshots */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-12 grid max-w-[860px] gap-5 sm:grid-cols-2 md:mt-14"
      >
        <ScreenshotCard
          image={discord1Cropped}
          alt="Discord channels showing real-time deal alerts"
          title="Deal alerts, live"
          note="Price errors posted as they appear"
          stat="Real-time"
        />
        <ScreenshotCard
          image={discord2Cropped}
          alt="Discord members sharing product finds and reselling opportunities"
          title="Community finds"
          note="Profitable picks shared by members"
          stat="Exclusive"
        />
      </motion.div>

      {/* Benefits */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
        className="mx-auto mt-14 grid max-w-[900px] gap-4 sm:grid-cols-3 md:mt-16"
      >
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <motion.div
              key={benefit.title}
              {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
              className="card card-hover p-6 text-center"
            >
              <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#5865F2]/15 text-[#8b95f7]">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-white">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.text}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Social proof */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mt-12 flex items-center justify-center gap-3 md:mt-14"
      >
        <div className="flex -space-x-3">
          {MEMBER_INITIALS.map((ini, i) => (
            <Avatar key={ini} size="sm" className={`ring-2 ring-night ${i % 2 ? 'grayscale' : ''}`}>
              <span className="text-[10px] font-bold">{ini}</span>
            </Avatar>
          ))}
        </div>
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-white">10,000+ deal hunters</span> already in the
          server
        </p>
      </motion.div>

      {/* CTA */}
      <CTASection
        eyebrow="Live community"
        title="10,000+ deal hunters are already inside."
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
    </section>
  );
};

export default Discord;