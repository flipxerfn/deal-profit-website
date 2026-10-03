import { FaDiscord, FaArrowRight, FaCheck } from 'react-icons/fa6';
import { DISCORD_INVITE } from '../lib/checkout';

/**
 * "Link your Discord to Whop" — the step that was missing.
 *
 * Payment happens on Whop, so Whop is what knows someone subscribed. The role
 * in Discord is granted by the Whop bot, and that bot can only pick an account
 * to grant it to if the buyer has attached a Discord account to their Whop
 * account. Nobody was being told this, so a paying customer would sit there
 * waiting for a role that was never going to arrive.
 *
 * This used to be described as "our bot invites you". That was never true
 * about the Whop path and it is the sort of claim that produces a support
 * ticket and a chargeback, because the person is told to expect something
 * automatic and then nothing automatic happens.
 *
 * The link goes straight to the settings page rather than describing the path,
 * because "go to settings" with no link means three wrong guesses.
 */
const WHOP_SOCIAL_ACCOUNTS = 'https://whop.com/@me/settings/social-accounts/';

export default function LinkDiscordToWhop({ className = '' }) {
  return (
    <div className={`surface-raised rounded-2xl border border-brand/25 p-6 sm:p-7 ${className}`}>
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-3 sm:text-left">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <FaDiscord className="text-lg" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-extrabold text-white">
            Last step: connect your Discord to Whop
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            Your membership lives on Whop, and Whop&apos;s bot is what puts you in the member
            channels. It can only do that once your Discord account is attached to your Whop
            account — otherwise it has no idea which account to grant the role to.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {[
          {
            step: 'Open your Whop account settings',
            body: 'Sign in at whop.com and go to Social accounts — the button below takes you straight there.',
          },
          {
            step: 'Connect Discord',
            body: 'Hit the + or Connect next to Discord, then Authorize when Discord asks. Make sure you are logged into the Discord account you actually want in the server.',
          },
          {
            step: 'Claim access',
            body: 'Open your purchase on Whop, pick the Discord app, choose the account you just linked and choose Claim Access. Your role lands within a minute.',
          },
        ].map((item, i) => (
          <li key={item.step} className="flex gap-3">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand/40 bg-brand/10 text-[11px] font-bold text-brand"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{item.step}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-zinc-400">{item.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={WHOP_SOCIAL_ACCOUNTS}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-flex items-center gap-2 text-sm"
        >
          <FaDiscord className="text-sm" aria-hidden="true" />
          Open Whop social accounts
          <FaArrowRight className="text-xs" aria-hidden="true" />
        </a>
        <a
          href={DISCORD_INVITE}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline inline-flex items-center gap-2 text-sm"
        >
          Not a member yet? Join the Discord
        </a>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
        <FaCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden="true" />
        <span>
          If you already linked Discord and are still waiting, check that you authorised{' '}
          <strong className="font-semibold text-zinc-400">Whop Bot</strong> and not a different
          account. Most of these are signed into the wrong Discord.
        </span>
      </p>
    </div>
  );
}