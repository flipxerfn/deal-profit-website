import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaDiscord,
  FaCrown,
  FaCreditCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaSpinner,
} from 'react-icons/fa';
import { buttonClass, Badge, SectionHeader } from './ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { fetchSubscription as fetchSubscriptionStatus, startCheckout } from '../lib/checkout';

const DISCORD_INVITE = 'https://discord.gg/dealprofit';
const PRICE = '$25';

const STEPS = [
  {
    number: 1,
    title: 'Link Discord',
    description: 'Connect your account — the role is granted only after purchase',
    icon: FaDiscord,
    complete: false,
  },
  {
    number: 2,
    title: 'Trial or Subscribe',
    description: 'Start a free 7-day trial, or skip straight to premium',
    icon: FaCrown,
    complete: false,
  },
];

// The /upgrade page's interactive core (formerly the whole /payment page):
// status banner, 2-step stepper, trial-or-subscribe choice, active view.
const PaymentFlow = () => {
  const prefersReduced = useReducedMotion();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [message, setMessage] = useState(null);
  const [discordLinked, setDiscordLinked] = useState(false);
  const [discordUser, setDiscordUser] = useState(null);
  // Live Discord role check — source of truth for ACCESS (null = unknown)
  const [premiumRole, setPremiumRole] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    fetchSubscription();
    checkUrlParams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'true') {
      setDiscordLinked(true);
      setMessage({ type: 'success', text: 'Discord account linked successfully!' });
      window.history.replaceState({}, '', '/upgrade');
    }
    if (params.get('linked') === 'failed') {
      setMessage({ type: 'error', text: "Discord sign-in didn't complete — please try linking again." });
      window.history.replaceState({}, '', '/upgrade');
    }
    if (params.get('discord_linked') === 'true') {
      setDiscordLinked(true);
      setMessage({ type: 'info', text: 'Discord linked! Now log in to complete the connection.' });
      window.history.replaceState({}, '', '/upgrade');
    }
    if (params.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription active! Check Discord for your premium role.' });
      window.history.replaceState({}, '', '/upgrade');
      fetchSubscription();
    }
    if (params.get('canceled') === 'true') {
      setMessage({ type: 'info', text: 'Checkout canceled. You can try again anytime.' });
      window.history.replaceState({}, '', '/upgrade');
    }
  };

  const fetchSubscription = async () => {
    try {
      const data = await fetchSubscriptionStatus();
      if (data.unauthorized) {
        // No Discord identity yet — step 1 stays active
        setSubscription(null);
        setPremiumRole(null);
        setDiscordLinked(false);
        setDiscordUser(null);
        setStep(1);
      } else {
        setSubscription(data.subscription);
        setPremiumRole(typeof data.premiumRole === 'boolean' ? data.premiumRole : null);
        if (data.discord) {
          setDiscordUser(data.discord);
          setDiscordLinked(true);
        }
        updateStepsFromSubscription(data.subscription, data.discord, data.premiumRole);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  // "Already linked? Check" — verifies an existing link for this browser
  const handleCheckLink = async () => {
    setCheckingLink(true);
    setMessage(null);
    try {
      const data = await fetchSubscriptionStatus();
      if (data.unauthorized) {
        setSubscription(null);
        setPremiumRole(null);
        setDiscordLinked(false);
        setDiscordUser(null);
        setStep(1);
        setMessage({ type: 'info', text: 'No link found for this browser — link your Discord below to continue.' });
      } else {
        setSubscription(data.subscription);
        setPremiumRole(typeof data.premiumRole === 'boolean' ? data.premiumRole : null);
        const linked = !!data.discord || !!data.subscription?.discord_id;
        if (data.discord) setDiscordUser(data.discord);
        updateStepsFromSubscription(data.subscription, data.discord, data.premiumRole);
        if (linked) {
          setMessage({
            type: 'success',
            text: `Already linked${data.discord?.username ? ` as ${data.discord.username}` : ''} — no need to link again.`,
          });
        } else {
          setMessage({ type: 'info', text: 'No link found yet — use the button below to link your Discord.' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not check link status. Please try again.' });
    } finally {
      setCheckingLink(false);
    }
  };

  const updateStepsFromSubscription = (sub, discord, hasRole) => {
    const linked = !!discord || !!sub?.discord_id;
    const newSteps = [...STEPS];
    newSteps[0].complete = linked;
    // Step 2 is done once they actually have access: a paid subscription, an
    // in-progress trial, or the premium role live on their Discord account.
    newSteps[1].complete =
      sub?.status === 'active' || sub?.status === 'trialing' || hasRole === true;
    const firstIncomplete = newSteps.findIndex((s) => !s.complete);
    setStep(firstIncomplete === -1 ? 3 : firstIncomplete + 1);
    setDiscordLinked(linked);
  };

  const handleDiscordLink = () => {
    window.location.href = '/api/discord/auth';
  };

  const handleCreateCheckout = async () => {
    setCheckoutLoading(true);
    setMessage(null);
    const result = await startCheckout();
    if (!result.ok) {
      setMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
      setCheckoutLoading(false);
    }
  };

  const handleStartTrial = async () => {
    setTrialLoading(true);
    setMessage(null);
    const result = await startCheckout({ trial: true });
    if (!result.ok) {
      setMessage({ type: 'error', text: 'Failed to start the free trial. Please try again.' });
      setTrialLoading(false);
    }
  };

  // Cancel (cancel-at-period-end) / resume the caller's own subscription.
  const handleCancelSubscription = async (resume = false) => {
    if (cancelLoading) return;
    if (
      !resume &&
      !window.confirm(
        'Cancel your subscription? You keep full access until the end of the current billing period.'
      )
    ) {
      return;
    }
    setCancelLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ resume }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSubscription((prev) => ({
          ...(prev ?? {}),
          user_id: prev?.user_id ?? discordUser?.id,
          status: data.status,
          current_period_end: data.current_period_end,
          cancel_at_period_end: data.cancel_at_period_end,
        }));
        setMessage({
          type: resume ? 'success' : 'info',
          text: resume
            ? 'Subscription resumed — it will renew as normal.'
            : `Subscription canceled — you keep access until ${formatDate(data.current_period_end)}.`,
        });
      } else if (data.error === 'no_subscription') {
        setMessage({ type: 'error', text: 'No subscription found to update on this account.' });
      } else {
        setMessage({ type: 'error', text: 'Could not update the subscription. Please try again.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not update the subscription. Please try again.' });
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const getStatusBadge = (status, hasRole) => {
    // The Discord role is the source of truth for access — never show a
    // "not subscribed" badge to someone who actually holds it.
    if (hasRole && status !== 'trialing') {
      return { variant: 'brand', text: 'Premium Active' };
    }
    const badges = {
      active: { variant: 'brand', text: 'Active' },
      trialing: { variant: 'brand', text: 'Trial' },
      past_due: { variant: 'warning', text: 'Past Due' },
      canceled: { variant: 'outline', text: 'Canceled' },
      expired: { variant: 'outline', text: 'Expired' },
      pending_discord: { variant: 'outline', text: 'Linked — Not Subscribed' },
    };
    return badges[status] || { variant: 'outline', text: status };
  };

  const roleActive = premiumRole === true;
  const subActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isMember = subActive || roleActive;

  return (
    <section aria-label="Set up Deal Profit Premium" id="start">
      <SectionHeader
        align="center"
        eyebrow="Get started"
        title="Set up in two steps"
        description={`Link your Discord, then start your 7-day free trial or subscribe for ${PRICE}/mo — cancel anytime.`}
      />

      {/* Status badge — role-aware: the live role wins over a stale record */}
      {(subscription || roleActive) && (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="mt-6 flex items-center justify-center gap-3"
        >
          <Badge variant={getStatusBadge(subscription?.status, roleActive).variant}>
            {getStatusBadge(subscription?.status, roleActive).text}
          </Badge>
          {subscription?.current_period_end &&
            (subActive ? (
              <span className="text-sm text-zinc-400">
                {subscription.cancel_at_period_end ? 'Cancels ' : 'Renews '}
                {formatDate(subscription.current_period_end)}
              </span>
            ) : !roleActive ? (
              <span className="text-sm text-zinc-400">
                Ended {formatDate(subscription.current_period_end)}
              </span>
            ) : null)}
        </motion.div>
      )}

      {/* Messages */}
      {message && (
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className={`mx-auto mt-6 max-w-[1000px] rounded-lg p-4 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : message.type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'}`}
        >
          {message.text}
        </motion.div>
      )}

      {loading ? (
        <div className="py-16 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
          <p className="mt-4 text-zinc-400">Loading your subscription status...</p>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="mx-auto mt-12 max-w-[1000px]"
          >
            <div className="relative">
              <div className="absolute left-1/2 top-8 h-1 w-full -translate-x-1/2 bg-zinc-800" aria-hidden="true" />
              <div className="relative flex justify-between">
                {STEPS.map((s, i) => (
                  <motion.div
                    key={s.number}
                    {...getMotionProps(prefersReduced, motionVariants.staggerItem)}
                    className="relative z-10 flex flex-col items-center"
                  >
                    <div
                      className={`relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300 ${
                        s.complete || i + 1 < step
                          ? 'bg-brand border-brand text-white'
                          : i + 1 === step
                          ? 'bg-charcoal border-brand text-brand'
                          : 'bg-charcoal border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {s.complete || i + 1 < step ? (
                        <FaCheckCircle className="h-8 w-8" />
                      ) : (
                        <span className="text-2xl font-extrabold">{s.number}</span>
                      )}
                    </div>
                    <div className="mt-4 w-48 text-center">
                      <p className="font-bold text-white">{s.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">{s.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Step Content */}
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="mx-auto mt-10 max-w-[1000px]"
          >
            {/* Step 1: Link Discord */}
            {step === 1 && (
              <div className="card relative overflow-hidden p-6 sm:p-8">
                <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
                <div className="text-center">
                  <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5865F2]/15 text-[#8b95f7]">
                    <FaDiscord className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white">Link Your Discord Account</h2>
                  <p className="mt-2 text-zinc-400">
                    We verify your Discord identity so we can grant you the <strong className="text-brand">deals-profit</strong> role
                    after you subscribe or start a trial. <span className="text-zinc-500">Linking alone does not give you the role — only buying does.</span>
                  </p>
                  <button
                    onClick={handleDiscordLink}
                    className={buttonClass({ variant: 'primary', size: 'lg' })}
                    disabled={discordLinked}
                  >
                    {discordLinked ? (
                      <>
                        <FaCheckCircle className="text-sm" />
                        Discord Linked
                      </>
                    ) : (
                      <>
                        <FaDiscord className="text-sm" />
                        Link Discord Account
                      </>
                    )}
                  </button>
                  {!discordLinked && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleCheckLink}
                        disabled={checkingLink}
                        className={buttonClass({ variant: 'outline', size: 'lg' })}
                      >
                        {checkingLink ? (
                          <>
                            <FaSpinner className="animate-spin text-sm" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <FaCheckCircle className="text-sm" />
                            Already linked? Check status
                          </>
                        )}
                      </button>
                    </div>
                  )}
                  {discordLinked && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-emerald-300">
                        <FaCheckCircle className="inline mr-1" />
                        Your Discord is linked{discordUser?.username ? ` as ${discordUser.username}` : ''}.
                      </p>
                      <p className="text-xs text-zinc-500">
                        The deals-profit role will be granted after you start a trial or subscribe.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className={buttonClass({ variant: 'primary', size: 'lg' })}
                      >
                        Continue
                        <FaArrowRight className="text-sm" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: optional trial OR straight to subscribe */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Optional trial */}
                <div className="card relative overflow-hidden p-6 sm:p-8">
                  <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
                  <div className="text-center">
                    <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                      <FaCrown className="h-8 w-8" />
                    </div>
                    <span className="mb-3 inline-block rounded-full border border-zinc-700 px-3 py-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Optional
                    </span>
                    <h2 className="text-xl font-extrabold text-white">Start Your 7-Day Free Trial</h2>
                    <p className="mt-2 text-zinc-400 max-w-md mx-auto">
                      Free for 7 days, then <strong className="text-white">$25/month</strong>. Cancel anytime
                      during the trial and you won't be charged.
                    </p>
                    {subscription?.status === 'trialing' && subscription.current_period_end && (
                      <p className="mt-3 text-sm text-emerald-300">
                        <FaCheckCircle className="inline mr-1" />
                        Trial active — first charge {formatDate(subscription.current_period_end)}
                      </p>
                    )}
                    <div className="mt-5 flex flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={handleStartTrial}
                        disabled={trialLoading || !discordLinked}
                        className={`${buttonClass({ variant: 'primary', size: 'lg' })} ${!discordLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {trialLoading ? (
                          <>
                            <FaSpinner className="animate-spin text-sm" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <FaCrown className="text-sm" />
                            Start 7-Day Free Trial
                            <FaArrowRight className="text-sm" />
                          </>
                        )}
                      </button>
                      {!discordLinked && (
                        <p className="text-sm text-amber-300">
                          <FaExclamationTriangle className="inline mr-1" />
                          Link your Discord first (Step 1)
                        </p>
                      )}
                      <p className="text-xs text-zinc-500">
                        Card required at signup — charged only after 7 days. Then{' '}
                        <a
                          href={DISCORD_INVITE}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline"
                        >
                          join our Discord
                        </a>{' '}
                        for the premium channels.
                      </p>
                      <p className="text-sm text-zinc-500">
                        Already have a trial or subscription?{' '}
                        <button
                          onClick={() => fetchSubscription()}
                          className="text-brand hover:underline"
                        >
                          Refresh Status
                        </button>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4" aria-hidden="true">
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">or</span>
                  <div className="h-px flex-1 bg-zinc-800" />
                </div>

                {/* Subscribe now */}
                <div className="card relative overflow-hidden p-6 sm:p-8">
                  <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
                  <div className="text-center">
                    <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                      <FaCreditCard className="h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-extrabold text-white">Skip Trial — Subscribe Now</h2>
                    <p className="mt-2 text-zinc-400">
                      <strong className="text-white">{PRICE}/month</strong> — cancel anytime. Includes all premium features.
                    </p>
                    <ul className="mt-6 text-left max-w-xs mx-auto space-y-3 text-sm text-zinc-300">
                      {[
                        'Faster member-first alerts',
                        'Price errors & penny finds',
                        'Premium Discord access',
                        'Reselling opportunities',
                        'Cancel anytime',
                      ].map((feature) => (
                        <li key={feature} className="flex items-center gap-2.5">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-brand/20 text-brand shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                            <FaCheckCircle className="h-3 w-3" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleCreateCheckout}
                      disabled={checkoutLoading || !discordLinked}
                      className={`${buttonClass({ variant: 'primary', size: 'xl' })} mt-8 w-full max-w-xs mx-auto ${!discordLinked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {checkoutLoading ? (
                        <>
                          <FaSpinner className="animate-spin text-sm" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          <FaCrown className="text-sm" />
                          Subscribe for {PRICE}/mo
                          <FaArrowRight className="text-sm" />
                        </>
                      )}
                    </button>
                    {!discordLinked && (
                      <p className="mt-4 text-sm text-amber-300">
                        <FaExclamationTriangle className="inline mr-1" />
                        Please link your Discord account first (Step 1)
                      </p>
                    )}
                    {discordLinked && (
                      <p className="mt-4 text-xs text-zinc-500">
                        Your deals-profit role is granted in Discord as soon as payment goes through.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active view: paid/trial subscription OR the live Discord role */}
            {isMember && step > 2 && (
              <div className="card relative overflow-hidden border-emerald-400/30 p-6 sm:p-8">
                <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
                <div className="text-center">
                  <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                    <FaCheckCircle className="h-8 w-8" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white">
                    {subActive && subscription.status === 'trialing' ? 'Trial Active' : 'Premium Active'}
                  </h2>
                  <p className="mt-2 text-zinc-400">
                    You have access to all premium features.{' '}
                    {subActive ? (
                      <>
                        The <strong className="text-brand">deals-profit</strong> role has been granted in
                        Discord.
                      </>
                    ) : (
                      <>
                        Your Discord account has the{' '}
                        <strong className="text-brand">deals-profit</strong> role.
                      </>
                    )}
                  </p>
                  {subActive && roleActive === false && (
                    <p className="mt-2 text-sm text-amber-300">
                      <FaExclamationTriangle className="mr-1 inline" />
                      The deals-profit role has not synced to your Discord yet — this usually resolves
                      within a few seconds of payment.
                    </p>
                  )}
                  {subActive && subscription.current_period_end && (
                    <p className="mt-4 text-sm text-zinc-500">
                      {subscription.status === 'trialing' ? 'Trial ends' : 'Next billing'}:
                      <strong className="text-white ml-2">{formatDate(subscription.current_period_end)}</strong>
                    </p>
                  )}
                  {subActive && subscription.cancel_at_period_end && (
                    <div className="mx-auto mt-4 max-w-md rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                      <FaExclamationTriangle className="mr-1 inline" />
                      Set to cancel on {formatDate(subscription.current_period_end)} — you will not be
                      charged again.
                    </div>
                  )}
                  {subActive ? (
                    subscription.cancel_at_period_end ? (
                      <button
                        onClick={() => handleCancelSubscription(true)}
                        disabled={cancelLoading}
                        className={`${buttonClass({ variant: 'primary', size: 'lg' })} mt-6 w-full max-w-xs mx-auto`}
                      >
                        {cancelLoading ? (
                          <FaSpinner className="animate-spin text-sm" />
                        ) : (
                          <>
                            <FaCheckCircle className="text-sm" />
                            Keep My Subscription
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelSubscription(false)}
                        disabled={cancelLoading}
                        className={`${buttonClass({ variant: 'outline', size: 'lg' })} mt-6 w-full max-w-xs mx-auto`}
                      >
                        {cancelLoading ? (
                          <FaSpinner className="animate-spin text-sm" />
                        ) : (
                          <>
                            <FaExclamationTriangle className="text-sm" />
                            Cancel Subscription
                          </>
                        )}
                      </button>
                    )
                  ) : (
                    <p className="mt-5 text-sm text-zinc-500">
                      Role detected live on your Discord account — there is no billing to manage here.
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </section>
  );
};

export default PaymentFlow;
