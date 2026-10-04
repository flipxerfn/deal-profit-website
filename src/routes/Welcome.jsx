import { FaDiscord, FaCircleCheck, FaArrowRight } from 'react-icons/fa6';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { DISCORD_INVITE } from '../lib/checkout';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import LinkDiscordToWhop from '../components/LinkDiscordToWhop';

/**
 * Where buyers land after checkout.
 *
 * Whop appends ?payment= and ?status= to the redirect_url, which means the
 * query string on this page is attacker-controlled: anyone can type
 * /welcome?payment=paid&status=complete and see the same screen a buyer sees.
 * So nothing here says "your payment went through" as though it were verified.
 * It says the same thing either way — here is the next step — which is true
 * regardless, and that keeps the page honest whether the params are right,
 * wrong, or absent.
 *
 * The one thing that IS worth reading is `status`, to decide whether to show
 * the trial-converts warning. A trial that hits its end and gets billed is the
 * one moment a buyer genuinely needs warning about.
 */
export default function Welcome() {
  const prefersReduced = useReducedMotion();
  const [params] = useSearchParams();
  const status = (params.get('status') || '').toLowerCase();

  // Only ever used to soften copy. Never to claim a payment succeeded.
  const mayBeTrialling = status.includes('trialing') || status.includes('trial');

  return (
    <section className="band-full band-bleed tint-brand relative pb-20 pt-12 md:pb-24 md:pt-16">
      <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[820px] px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="text-center"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <FaCircleCheck className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Next step: connect your Discord
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
            Your membership is on Whop. One thing is still needed on our side — your Discord
            account has to be attached to your Whop account before the role can be granted.
          </p>
        </motion.div>

        {mayBeTrialling && (
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="mt-8 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-sm leading-relaxed text-amber-100/90"
          >
            <strong className="font-semibold text-amber-200">Your trial is running.</strong> It
            ends after 7 days and then bills at the normal rate. Cancel from your Whop account
            any time before then and you are not charged — nothing here is automatic and there
            is nothing you need to remember to do.
          </motion.div>
        )}

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8"
        >
          <LinkDiscordToWhop />
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
        >
          <Link
            to="/deals"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-2.5 text-zinc-200 transition-colors hover:border-brand/50 hover:text-white"
          >
            Browse the live deals
            <FaArrowRight className="text-xs" aria-hidden="true" />
          </Link>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
          >
            <FaDiscord className="text-sm" aria-hidden="true" />
            Not on Discord yet?
          </a>
        </motion.div>
      </div>
    </section>
  );
}