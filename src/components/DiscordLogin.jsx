import { FaDiscord } from 'react-icons/fa6';
import { buttonClass } from './ui';

// The site's single sign-in affordance. Discord is the account here, so this is
// the only "log in" that exists — reused by the navbar, the deals gate and the
// review form so they can never drift apart.
export default function DiscordLogin({
  label = 'Sign in with Discord',
  size = 'md',
  variant = 'primary',
  className = '',
  onClick,
  ...rest
}) {
  return (
    <button
      type="button"
      onClick={onClick || (() => { window.location.href = '/api/discord/auth'; })}
      className={`${buttonClass({ variant, size })} ${className}`}
      {...rest}
    >
      <FaDiscord className="text-sm" aria-hidden="true" />
      {label}
    </button>
  );
}
