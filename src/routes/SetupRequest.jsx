import { useState } from 'react';
import {
  FaDiscord,
  FaPaperPlane,
  FaCircleCheck,
  FaTriangleExclamation,
  FaArrowRight,
  FaBolt,
  FaClock,
  FaShieldHalved,
} from 'react-icons/fa6';
import { motion } from 'framer-motion';
import { WHOP_SETUP_URL } from '../lib/checkout';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { useLiveProof, pct } from '../lib/useLiveProof';

const ERRORS = {
  invite_required: 'Paste the invite link to your Discord server.',
  invite_not_a_discord_link: 'That does not look like a Discord invite. It should start with discord.gg/ or discord.com/invoice/.',
  username_required: 'Tell us which Discord account to expect you on.',
  username_invalid: 'That username has characters Discord does not use.',
  rate_limited: 'Too many attempts from this device. Try again in a few minutes.',
  not_configured: 'This form is not switched on yet. Message us on Discord instead.',
  delivery_failed: 'That did not reach us. Please try again in a moment.',
  bad_request: 'Something went wrong sending that. Try again.',
};

/**
 * What actually gets done, in the order it happens.
 *
 * This list replaced three vague value cards ("The same live feed", "Posted
 * into your server", "Set up once"). Nobody pays $55 to be told a thing is
 * "posted into your server" — that is a restatement of the product name.
 * Specific steps are checkable against a promise, and a buyer can tell the
 * difference between a description of work and a description of a feeling.
 */
const DELIVERABLES = [
  {
    icon: FaBolt,
    title: 'We connect the bot to your server',
    text: 'You give us the invite and an Admin role. We handle the OAuth flow and permissions — you do not touch a single setting yourself.',
  },
  {
    icon: FaDiscord,
    title: 'We pick your channels and format',
    text: 'Tell us which channels are for finds and which are for discussion. Posts land formatted, with the price, the reference price and the retailer already in place.',
  },
  {
    icon: FaClock,
    title: 'We watch it fire for a week',
    text: 'Posts going out are not proof the job is finished. We stay in for seven days, fix anything that breaks, and tune the noise level to what your members actually want.',
  },
];

/**
 * Objections, answered before they are asked.
 *
 * The two that matter most are the first two. "What if a deal is wrong" is the
 * one that kills a feed product outright, because the buyer is trusting you
 * with their server's reputation. Answering it with the limit of the claim —
 * we post what members find, we do not guarantee stock or price — is more
 * persuasive than any promise, and it is also the only version of the answer
 * that survives a member checking.
 */
const FAQS = [
  {
    q: 'What if a deal turns out to be wrong or out of stock?',
    a: 'It happens, and it is the honest limit of what this is. We post what members find across the retailers we watch. We do not control those retailers and we cannot hold stock. Price errors are usually gone within minutes to hours. Treat anything from the feed as a lead to check, not a guaranteed buy.',
  },
  {
    q: 'Do I need to know how Discord works?',
    a: 'No. All we need from you is the invite link and your username. We set up the permissions and formatting. If you can send a link, you can buy this.',
  },
  {
    q: 'What do you need from me to start?',
    a: 'The server invite, and the Admin role for our bot. After that it runs on its own. There is nothing to log into and nothing to maintain.',
  },
  {
    q: 'Can I cancel it?',
    a: 'There is nothing recurring to cancel. It is one payment of $55 and the work gets done. You can remove the bot from your server at any time with one click, and the posts you have already made stay put.',
  },
  {
    q: 'Is my server invite stored?',
    a: 'No. The form sends it to us so we can do the work, and this page keeps no copy of it. There is no account, no dashboard and no list of servers we have access to.',
  },
];

export default function SetupRequest() {
  const prefersReduced = useReducedMotion();
  const { proof, failed } = useLiveProof();
  const [openFaq, setOpenFaq] = useState(null);
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

      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {};
      }

      if (res.ok && data.ok) {
        setState({ status: 'sent', error: null });
        return;
      }
      const code = data.error || (raw ? `http_${res.status}` : 'no_response');
      setState({ status: 'error', error: code });
    } catch {
      setState({ status: 'error', error: 'delivery_failed' });
    }
  };

  const medianPct = proof ? pct(proof.median) : null;

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
            Run your own Discord? We put the live deal feed into it — the same feed behind this
            site, posting price errors and penny deals into your channels as they land.
          </p>
          <p className="mt-6 text-3xl font-extrabold tracking-tight text-white">
            $55
            <span className="ml-2 text-base font-semibold text-zinc-400">once, not a subscription</span>
          </p>
        </motion.div>

        {/* Proof before price.
            This block sits ABOVE the buy button on purpose. The previous
            layout opened with the checkout link and put the evidence after it,
            so the page asked for money before it had shown anything. The
            figures below are measured from /api/deals at request time — if the
            feed is empty, the block renders nothing rather than claiming a
            number it cannot back up. */}
        {!failed && proof && (
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="mt-10 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-5 sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Measured from the live feed just now
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <dt className="text-xs text-zinc-400">Finds right now</dt>
                <dd className="mt-1 text-3xl font-extrabold tabular-nums text-white">{proof.finds}</dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Median off</dt>
                <dd className="mt-1 text-3xl font-extrabold tabular-nums text-brand-2">
                  {medianPct}%
                </dd>
              </div>
              <div>
                <dt className="text-xs text-zinc-400">Retailers</dt>
                <dd className="mt-1 text-3xl font-extrabold tabular-nums text-white">
                  {proof.retailers}
                </dd>
              </div>
            </dl>
            {proof.latest && (
              <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-relaxed text-zinc-400">
                <span className="font-semibold text-white">Newest catch:</span> {proof.latest}
              </p>
            )}
          </motion.div>
        )}

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-8 text-center"
        >
          <a
            href={WHOP_SETUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex items-center justify-center gap-2"
          >
            Buy the setup on Whop
            <FaArrowRight className="text-sm" aria-hidden="true" />
          </a>
          <p className="mt-3 text-xs text-zinc-500">
            One payment, done once. Nothing recurring, nothing to cancel.
          </p>
        </motion.div>

        {/* The product, demonstrated rather than described.

            This is the highest-leverage section on the page and it was missing.
            Everything above it argues that the feed is alive — the live figures
            prove the feed exists, but nothing proves that installing it in
            someone's server produces the thing being sold. A visitor comparing
            this against "just look at the site" needs to see the two are the
            same product, and the cheapest honest way to show that is to show
            this site's own feed, measured live, next to the promise.

            Three real entries from /api/deals rather than stock imagery. A
            mockup would be the one thing on this page that is not true. */}

        {!failed && proof && proof.samples.length > 0 && (
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="mt-14"
          >
            <div className="text-center">
              <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                This is what lands in your server
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                Three live from the feed at the moment you loaded this page. Same
                numbers, same formatting — posted into your channels instead of
                here.
              </p>
            </div>

            <ul className="mt-7 space-y-3">
              {proof.samples.map((d) => (
                <li
                  key={d.id || d.title}
                  className="card flex items-center gap-4 p-4"
                >
                  {d.image && (
                    <img
                      src={d.image}
                      alt=""
                      loading="lazy"
                      className="h-14 w-14 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{d.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {(d.meta || []).filter((m) => typeof m === 'string').slice(0, 2).join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-lg font-bold tabular-nums text-brand-2">
                      ${d.price}
                    </p>
                    {d.referencePrice > d.price && (
                      <p className="text-xs tabular-nums text-zinc-500 line-through">
                        ${d.referencePrice}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-center text-xs text-zinc-500">
              <strong className="font-semibold text-zinc-400">
                Prices and stock are not ours.
              </strong>{' '}
              These move within minutes and a price error can be gone before you
              read this. The formatting is the product — the finding is the bonus.
            </p>
          </motion.div>
        )}

        {/* What actually happens. Concrete steps, not adjectives. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-16"
        >
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            What the $55 actually buys
          </h2>
          <ul className="mt-6 space-y-4">
            {DELIVERABLES.map((d) => {
              const Icon = d.icon;
              return (
                <li key={d.title} className="card flex gap-4 p-5 sm:p-6">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{d.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.div>

        {/* The limit of the claim, stated plainly and early.
            Placed above the form on purpose. A feed product whose failure mode
            is "you told a channel full of people to buy something that was
            never in stock" has exactly one honest defence, and burying it in a
            footer is how a buyer finds out about it in public instead. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-10 rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-5 sm:p-6"
        >
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <FaShieldHalved className="h-4 w-4 text-amber-400" aria-hidden="true" />
            What this is not
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            We are not a retailer and we cannot hold stock. We post what our members find, so a
            price error can be gone within minutes. Anything from the feed is a lead worth checking,
            not a guaranteed buy. We would rather you know that now than hear it from your members.
          </p>
        </motion.div>

        {/* Objections, before the form. */}
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-14"
        >
          <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Fair questions
          </h2>
          <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-charcoal">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q}>
                  <h3>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(open ? null : i)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-white hover:bg-white/[0.03]"
                    >
                      <span>{f.q}</span>
                      <span aria-hidden="true" className="shrink-0 text-brand">
                        {open ? '−' : '+'}
                      </span>
                    </button>
                  </h3>
                  {open && (
                    <p className="px-5 pb-4 text-sm leading-relaxed text-zinc-400">{f.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-16"
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
                    spellCheck="false"
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
                  <p className="mt-1 text-xs text-zinc-400">
                    Which channels are for finds, how chatty you want it, anything to avoid.
                  </p>
                  <textarea
                    id="note"
                    name="note"
                    rows={4}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. post in #deals, keep it to stuff under $200"
                    className="input mt-2 w-full resize-y"
                    aria-describedby={state.error ? 'setup-error' : undefined}
                  />
                </div>

                {/* Honeypot. A real person never fills a field they cannot see. */}
                <div className="hidden" aria-hidden="true">
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

                {state.error && (
                  <p
                    id="setup-error"
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
                  >
                    <FaTriangleExclamation className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{ERRORS[state.error] || ERRORS.bad_request}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={state.status === 'sending'}
                  className="btn btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
                >
                  <FaPaperPlane className="text-sm" aria-hidden="true" />
                  {state.status === 'sending' ? 'Sending…' : 'Send my server'}
                </button>
                <p className="text-center text-xs text-zinc-500">
                  Goes straight to us on Discord. No account, no dashboard, nothing stored here.
                </p>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
