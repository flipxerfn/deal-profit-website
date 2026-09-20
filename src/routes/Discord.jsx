import { FaDiscord, FaBolt, FaLock, FaUsers, FaArrowRight, FaCircle } from 'react-icons/fa';
import { buttonClass } from '../components/button';
import discord1Cropped from '../assets/crops/discord1-cropped.png';
import discord2Cropped from '../assets/crops/discord2-cropped.png';

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

const ScreenshotCard = ({ image, alt, title, stat, note }) => (
  <div className="group rounded-xl border border-white/10 bg-charcoal p-3">
    <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-charcoal-2">
      <img
        src={image}
        alt={alt}
        loading="lazy"
        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
      />
    </div>
    <div className="flex items-center justify-between gap-3 px-2 pb-2 pt-4">
      <div>
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-xs text-zinc-500">{note}</p>
      </div>
      <span className="whitespace-nowrap rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand">
        {stat}
      </span>
    </div>
  </div>
);

const Discord = () => {
  return (
    <section className="pb-4">
      <div className="mx-auto max-w-[760px] text-center">
        <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#5865F2]/15 text-[#8b95f7]">
          <FaDiscord className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]">
          See the deals{' '}
          <span className="bg-gradient-to-r from-brand to-brand-2 bg-clip-text text-transparent">
            before they disappear.
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Our Discord is where price errors, penny deals and glitch finds are posted in real time,
          straight to member channels.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-[860px] gap-5 sm:grid-cols-2 md:mt-14">
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
      </div>

      <div className="mx-auto mt-14 grid max-w-[900px] gap-4 sm:grid-cols-3 md:mt-16">
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="rounded-xl border border-white/10 bg-charcoal/70 p-6 text-center"
            >
              <div className="mx-auto mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <Icon className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-white">{benefit.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{benefit.text}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-12 text-center md:mt-14">
        <a
          href="https://discord.gg/dealprofit"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass('primary', 'px-8 py-3.5 text-base')}
        >
          <FaCircle className="h-2 w-2 animate-pulse" />
          Join the Deal Profit Discord
          <FaArrowRight className="text-sm" />
        </a>
      </div>
    </section>
  );
};

export default Discord;