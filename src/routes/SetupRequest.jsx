import { useState } from 'react';
import {
  FaDiscord,
  FaPaperPlane,
  FaCircleCheck,
  FaTriangleExclamation,
  FaArrowRight,
} from 'react-icons/fa6';
import { motion } from 'framer-motion';
import { WHOP_SETUP_URL } from '../lib/checkout';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';

const ERRORS = {
  invite_required: 'Paste the invite link to your Discord server.',
  invite_not_a_discord_link: 'That does not look like a Discord invite. It should start with discord.gg/ or discord.com/invite/.',
  username_required: 'Tell us which Discord account to expect you on.',
  username_invalid: 'That username has characters Discord does not use.',
  rate_limited: 'Too many attempts from this device. Try again in a few minutes.',
  not_configured: 'This form is not switched on yet. Message us on Discord instead.',
  delivery_failed: 'That did not reach us. Please try again in a moment.',
  bad_request: 'Something went wrong sending that. Try again.',
};

export default function SetupRequest() {
  const prefersReduced = useReducedMotion();
  const [invite, setInvite] = useState('');
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, visually hidden
  const [state, setState] = useState({ status: 'idle', error: null });

  const submit = async (e) => {
    e.preventDefault();
    setState({ status: 'sending', error: null });
    try {
      const res = await fetch('/api/setup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite, username, note, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setState({ status: 'sent', error: null });
        return;
      }
      setState({ status: 'error', error: data.error || 'bad_request' });
    } catch {
      setState({ status: 'error', error: 'delivery_failed' });
    }
  };

  return (
    <section className="band-full band-bleed tint-brand relative pb-20 pt-12 md:pb-24 md:pt-16">
      <div className="radial-glow-hero pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="text-center"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-brand">One-time service</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-[44px]">
            Deal Feed Setup
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
            Run your own Discord? We will put the live deal feed into it — the same feed that runs
            on this site, catching price errors and penny deals every few minutes and posting them
            straight into your channels.
          </p>
          <p className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            $55
            <span className="ml-2 text-base font-semibold text-zinc-400">once, not a subscription</span>
          </p>
          <a
            href={WHOP_SETUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-6 inline-flex items-center justify-center gap-2"
          >
            Buy the setup on Whop
            <FaArrowRight className="text-sm" aria-hidden="true" />
          </a>
          <p className="mt-3 text-xs text-zinc-500">
            One payment, done once. Nothing recurring, nothing to cancel.
          </p>
        </motion.div>

        {/* What it is, before anyone spends anything. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-16 grid gap-4 sm:grid-cols-3"
        >
          {[
            {
              title: 'The same live feed',
              text: 'Price errors, penny finds and glitch deals, caught every few minutes across the retailers we watch. Not a screenshot of last week — the thing that is on goosiev.com right now.',
            },
            {
              title: 'Posted into your server',
              text: 'Your channels, your formatting, your roles. We set it up so the finds land where your members already are, instead of you copying them across by hand.',
            },
            {
              title: 'Set up once, for $55',
              text: 'You buy once and the work gets done. There is no subscription here and nothing recurring to cancel afterwards.',
            },
          ].map((item) => (
            <div key={item.title} className="card p-5 sm:p-6">
              <h2 className="text-sm font-bold text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.text}</p>
            </div>
          ))}
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-14"
        >
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Already bought it?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
              Put your Discord server below and the work starts. You do not need to message us your
              invite, and this page does not keep a copy of it.
            </p>
          </div>
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        >
          {state.status === 'sent' ? (
            <div className="surface-raised rounded-2xl border border-emerald-400/30 p-8 text-center">
              <FaCircleCheck className="mx-auto h-10 w-10 text-emerald-400" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-extrabold text-white">It is with us</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                Your request is in our logs and we will reach you on Discord as{' '}
                <strong className="font-semibold text-white">{username || 'the account you named'}</strong>.
                Keep an eye on your DMs.
              </p>
              <p className="mx-auto mt-4 max-w-md rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-zinc-400">
                Want it moving faster? DM{' '}
                <strong className="font-semibold text-white">goosievv</strong> and ask for{' '}
                <strong className="font-semibold text-white">Admin</strong> on your server — we
                can usually get in and start straight away.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="surface-raised rounded-2xl border border-white/10 bg-charcoal p-6 sm:p-8"
              noValidate
            >
              {/* One column, labels above the fields. A two-column form on a
                  phone reads as two fields where there is one. */}
              <div className="space-y-5">
                <div>
                  <label htmlFor="invite" className="block text-sm font-semibold text-white">
                    Your Discord server invite
                  </label>
                  <p className="mt-1 text-xs text-zinc-400">
                    In Discord: right-click your server → Invite People → Copy Link.
                  </p>
                  <input
                    id="invite"
                    name="invite"
                    type="url"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck="false"
                    required
                    value={invite}
                    onChange={(e) => setInvite(e.target.value)}
                    placeholder="https://discord.gg/yourserver"
                    className="input mt-2 w-full"
                    aria-describedby={state.error ? 'setup-error' : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-white">
                    Your Discord username
                  </label>
                  <p className="mt-1 text-xs text-zinc-400">
                    So we know which account to look for when we add you.
                  </p>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="off"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="yourname"
                    className="input mt-2 w-full"
                    aria-describedby={state.error ? 'setup-error' : undefined}
                  />
                </div>

                <div>
                  <label htmlFor="note" className="block text-sm font-semibold text-white">
                    Anything we should know? <span className="font-normal text-zinc-500">Optional</span>
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Which channels you want the finds in, or anything about your setup."
                    className="input mt-2 w-full resize-y"
                  />
                </div>

                {/* Honeypot. Hidden from people, tempting to bots. */}
                <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>

              {state.error && (
                <p
                  id="setup-error"
                  role="alert"
                  className="mt-5 flex items-start gap-2 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-3.5 py-2.5 text-sm leading-relaxed text-red-200"
                >
                  <FaTriangleExclamation className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  {ERRORS[state.error] || 'Something went wrong. Try again.'}
                </p>
              )}

              <button
                type="submit"
                disabled={state.status === 'sending'}
                aria-busy={state.status === 'sending'}
                className="btn btn-primary mt-6 inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <FaPaperPlane className="text-sm" aria-hidden="true" />
                {state.status === 'sending' ? 'Sending…' : 'Send it over'}
              </button>

              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
                <FaDiscord className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  This goes straight to our Discord logs and nowhere else — we do not store your
                  invite. Prefer to just talk? DM{' '}
                  <strong className="font-semibold text-zinc-300">goosievv</strong> on{' '}
                  <a
                    href="https://discord.gg/dealprofit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    our Discord
                  </a>{' '}
                  and ask for <strong className="font-semibold text-zinc-300">Admin</strong> on
                  your server — that is how we get in to set it up.
                </span>
              </p>
            </form>
          )}
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8 text-center text-sm text-zinc-500"
        >
          Haven&apos;t bought the setup yet?{' '}
          <a
            href={WHOP_SETUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand hover:underline"
          >
            Deal Feed Setup — $55 once
          </a>
        </motion.div>
      </div>
    </section>
  );
}