import { FaCalendarDays, FaArrowRight } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { WHOP_BILLING_URL } from '../lib/checkout';

/**
 * When you get charged, how much, and how to stop it.
 *
 * WHY THIS EXISTS
 * ---------------
 * A Whop trial takes a card on file and charges at the end of the window. Every
 * word about that lived on the pricing page, which is where someone goes to
 * decide whether to buy — and the people who most need it are the ones already
 * inside the product, past the point of decision. Someone on day 5 of a trial
 * who visits the pricing page is looking for the price, not the features, and
 * the charge date is nowhere on that page in a form they can act on.
 *
 * The cost of getting this wrong is not an angry comment. It is a dispute, and
 * on a card that is a chargeback against Whop's account rather than a message
 * to you — which is a worse outcome than the sale was worth. Everything below
 * is written so it can be read in ten seconds by someone holding their card
 * and mildly worried.
 *
 * NO DATES ARE HARDCODED. The trial length is a constant because it is a
 * product decision that lives in checkout config, not a per-buyer value, and
 * the copy refers to it relatively ("7 days from the day you start") so it
 * cannot go stale against a real account.
 */

const TRIAL_DAYS = 7;

// Prices are mirrored from the pricing page. If either changes there, this
// needs the same edit — the test pins that they agree so the two pages cannot
// quietly disagree, which is the failure mode that produces a surprise charge.
export const PLAN_PRICES = {
  monthly: 25,
  annual: 200,
};

export default function BillingTransparency({ className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-white/10 bg-charcoal p-6 sm:p-7 ${className}`}
      aria-labelledby="billing-when-heading"
    >
      <h2 id="billing-when-heading" className="flex items-center gap-2 text-base font-bold text-white">
        <FaCalendarDays className="h-4 w-4 text-brand" aria-hidden="true" />
        When you are charged
      </h2>

      {/* The free Discord path. Someone reading this is often not a trial user
          at all, and leading with the charge date when there is no charge is
          how a page starts confusing the people it should reassure. */}
      <p className="mt-3 text-sm leading-relaxed text-zinc-400">
        <strong className="font-semibold text-white">Joining the Discord is free.</strong> There is
        no card, no charge and nothing to cancel. If a post saves you money, that is the whole deal.
      </p>

      <hr className="my-5 border-white/10" />

      {/* The trial path. Stated as three separate facts rather than a paragraph,
          because the three questions are different: when, how much, and how do
          I stop it. A reader scanning for one of them should not have to read
          past the other two to find it. */}
      <p className="text-sm leading-relaxed text-zinc-400">
        <strong className="font-semibold text-white">Free trial:</strong> your card is saved when
        you start. You are charged {TRIAL_DAYS} days after that, not before, and not again unless
        you choose to stay.
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
          <dt className="text-zinc-400">
            Monthly, after the trial
            <span className="ml-2 text-xs text-zinc-500">billed every month</span>
          </dt>
          <dd className="shrink-0 font-mono tabular-nums text-white">${PLAN_PRICES.monthly}/mo</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-b border-white/5 pb-3">
          <dt className="text-zinc-400">
            Yearly
            <span className="ml-2 text-xs text-zinc-500">one charge, once a year</span>
          </dt>
          <dd className="shrink-0 font-mono tabular-nums text-white">
            ${PLAN_PRICES.annual}/yr
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm leading-relaxed text-zinc-400">
        <strong className="font-semibold text-white">To stop the charge</strong>, cancel on Whop
        before the trial ends. You keep access until the day it would have billed, and you are not
        charged. It takes one click and there is nothing to remember to do.
      </p>

      {/* The direct billing link is the whole point of this section. A reader
          who has decided to cancel should reach the cancel screen in one
          click, not navigate a dashboard to find it — every extra step between
          "I want to cancel" and the cancel button is a step where they talk
          themselves out of it, which is exactly the wrong direction for this
          link to point. */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <a
          href={WHOP_BILLING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:border-brand/50"
        >
          Manage or cancel in Whop
          <FaArrowRight className="text-xs" aria-hidden="true" />
        </a>
        <Link
          to="/refunds"
          className="text-sm text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white"
        >
          Refund policy
        </Link>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        We do not see or store your card details. Payments are handled entirely by Whop.
      </p>
    </section>
  );
}
