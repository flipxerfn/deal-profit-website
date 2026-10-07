import { FaDiscord, FaTag, FaCircleCheck } from 'react-icons/fa6';
import { WHOP_CHECKOUT_URL, WHOP_BILLING_URL, DISCORD_INVITE } from '../lib/checkout';

/**
 * The save offer, for someone who has already decided to leave.
 *
 * WHY THIS IS A SEPARATE COMPONENT
 * --------------------------------
 * CancelViaWhop tells someone how to cancel and is mounted inside the payment
 * flow, including its compact button variant. This block is the opposite
 * instinct — it offers a reason to stay first, then the exit. Folding one into
 * the other would mean the save offer appears wherever a cancel button is
 * rendered, including a settings row where someone is tidying up rather than
 * leaving, and a discount shown to someone who was never leaving cheapens the
 * thing it is discounting.
 *
 * WHY THE CODES ARE ONE-USE AND HANDED OUT ONE AT A TIME
 * ------------------------------------------------------
 * A single shared public code would be worth nothing: one person finds it on a
 * forum, tells everyone, and the discount becomes the price. Twelve
 * single-stock codes, given to whoever asks, keeps the ceiling finite and the
 * reason to ask quietly.
 *
 * Delete each code as you hand it over. An unused code is inventory; a used
 * one is litter, and a list where nine of twelve are already redeemed tells a
 * canceller exactly what the offer is worth.
 *
 * THE OFFER IS NOT AUTOMATIC
 * --------------------------
 * Whop has no outbound email, so it cannot tell anyone this exists. A human
 * has to notice and paste a code. That step will not always happen. Do not
 * describe this to anyone as a safety net — it is a thing you can offer.
 */

const CODES = [
  'SAVEHALF1', 'SAVEHALF2', 'SAVEHALF3', 'SAVEHALF4',
  'SAVEHALF5', 'SAVEHALF6', 'SAVEHALF7', 'SAVEHALF8',
  'SAVEHALF9', 'SAVEHALF10', 'SAVEHALF11', 'SAVEHALF12',
];

export default function CancelSaveOffer() {
  return (
    <div className="rounded-xl border border-white/10 bg-charcoal-2/60 p-5">
      <p className="text-sm font-semibold text-white">Leaving because of the price?</p>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
        There is a code that takes 50% off for three months. You keep everything you have now —
        same plan, nothing to re-sign, and it ends on its own.
      </p>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3.5">
        <p className="text-xs leading-relaxed text-zinc-400">
          <FaTag className="mr-1.5 inline text-brand" aria-hidden="true" />
          There are {CODES.length} left and they are given out one at a time. Ask in the Discord and
          someone will send you one — it takes a minute and nobody else is getting the same code.
        </p>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-charcoal px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand/50"
        >
          <FaDiscord className="h-4 w-4" aria-hidden="true" />
          Ask for a code
        </a>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        If you would rather just close it, that is completely fine.{' '}
        <a
          href={WHOP_BILLING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white"
        >
          Cancel on Whop
        </a>{' '}
        and you keep access until the end of the period you already paid for. Once you have a code,{' '}
        <a
          href={WHOP_CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-zinc-400 underline decoration-white/20 underline-offset-4 hover:text-white"
        >
          apply it in billing
        </a>
        .
      </p>
    </div>
  );
}

export { CODES as CANCEL_SAVE_CODES };
