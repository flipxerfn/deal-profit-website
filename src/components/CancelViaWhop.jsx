import { FaArrowRight, FaDiscord } from 'react-icons/fa6';
import { buttonClass } from './ui';
import { WHOP_CHECKOUT_URL, WHOP_SIGN_IN_URL } from '../lib/checkout';

// How a member cancels, now that Whop is the merchant of record.
//
// The old button called our Stripe cancel endpoint, which is exactly the wrong
// thing for a Whop member: it looks for a Stripe subscription, finds none, and
// a member whose only real subscription is on Whop was left with no way to
// cancel at all — while the policy page told them a button existed here.
//
// This component never claims to cancel anything. It hands the member over to
// Whop and tells them exactly which control to press, because Whop is the only
// party that can actually stop the next charge.
export default function CancelViaWhop({ compact = false }) {
  if (compact) {
    return (
      <a
        href={WHOP_CHECKOUT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass({ variant: 'outline', size: 'sm' })}
      >
        Cancel subscription
        <FaArrowRight className="text-xs" />
      </a>
    );
  }

  return (
    <div className="mx-auto mt-6 w-full max-w-md rounded-xl border border-white/10 bg-charcoal-2/60 p-5 text-left">
      <p className="text-sm font-semibold text-white">Want to cancel?</p>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
        Billing runs through Whop, so cancelling happens there — it is the only place that can stop
        your next charge. Two ways, both take about a minute:
      </p>
      <ol className="mt-3 space-y-2.5 text-sm text-zinc-300">
        <li className="flex gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
            1
          </span>
          <span>
            Open our{' '}
            <a
              href={WHOP_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:underline"
            >
              Whop product page
            </a>{' '}
            and use <span className="font-medium text-white">Manage membership</span> in the
            community menu.
          </span>
        </li>
        <li className="flex gap-2.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
            2
          </span>
          <span>
            Or sign in to{' '}
            <a
              href={WHOP_SIGN_IN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:underline"
            >
              whop.com
            </a>{' '}
            → Profile → Orders → pick the subscription →{' '}
            <span className="font-medium text-white">Cancel membership</span>.
          </span>
        </li>
      </ol>
      <p className="mt-4 border-t border-white/5 pt-3 text-xs text-zinc-500">
        Either way you keep Premium until the end of the period you already paid for, and you are
        not charged again. Prefer we do it?{' '}
        <a href={WHOP_CHECKOUT_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
          Just ask in the server
        </a>{' '}
        and we will sort it.
      </p>
    </div>
  );
}

export function CancelHintLine() {
  return (
    <p className="mt-4 text-xs text-zinc-500">
      <FaDiscord className="mr-1 inline text-[10px]" aria-hidden="true" />
      Billing is handled by Whop — cancelling is done from your Whop account, not here.
    </p>
  );
}
