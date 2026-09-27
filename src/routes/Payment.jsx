import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaDiscord,
  FaCrown,
  FaLock,
  FaCreditCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaSpinner,
  FaBolt,
  FaSkullCrossbones,
  FaCoins,
  FaComment,
  FaChartLine,
} from 'react-icons/fa';
import { buttonClass, Badge, SectionHeader, FeatureCard } from '../components/ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../lib/motion';
import { fetchSubscription as fetchSubscriptionStatus, startCheckout } from '../lib/checkout';

const DISCORD_INVITE = 'https://discord.gg/dealprofit';
const PRICE = '$25';

const STEPS = [
  {
    number: 1,
    title: 'Link Discord',
    description: 'Connect your Discord account so we can grant you the premium role',
    icon: FaDiscord,
    complete: false
  },
  {
    number: 2,
    title: 'Get Trial Access',
    description: 'Join Discord, create a ticket in #trials to get 7-day free access',
    icon: FaCrown,
    complete: false
  },
  {
    number: 3,
    title: 'Subscribe',
    description: 'Upgrade to premium for $25/month - cancel anytime',
    icon: FaCreditCard,
    complete: false
  }
];

const Payment = () => {
  const prefersReduced = useReducedMotion();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [discordLinked, setDiscordLinked] = useState(false);

  useEffect(() => {
    fetchSubscription();
    checkUrlParams();
  }, []);

  const checkUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'true') {
      setDiscordLinked(true);
      setMessage({ type: 'success', text: 'Discord account linked successfully!' });
      window.history.replaceState({}, '', '/payment');
    }
    if (params.get('linked') === 'failed') {
      setMessage({ type: 'error', text: "Discord sign-in didn't complete — please try linking again." });
      window.history.replaceState({}, '', '/payment');
    }
    if (params.get('discord_linked') === 'true') {
      setDiscordLinked(true);
      setMessage({ type: 'info', text: 'Discord linked! Now log in to complete the connection.' });
      window.history.replaceState({}, '', '/payment');
    }
    if (params.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription active! Check Discord for your premium role.' });
      window.history.replaceState({}, '', '/payment');
      fetchSubscription();
    }
    if (params.get('canceled') === 'true') {
      setMessage({ type: 'info', text: 'Checkout canceled. You can try again anytime.' });
      window.history.replaceState({}, '', '/payment');
    }
  };

  const fetchSubscription = async () => {
    try {
      const data = await fetchSubscriptionStatus();
      if (data.unauthorized) {
        // No Discord identity yet — step 1 stays active
        setSubscription(null);
        setDiscordLinked(false);
        setStep(1);
      } else {
        setSubscription(data.subscription);
        if (data.discord) setDiscordLinked(true);
        updateStepsFromSubscription(data.subscription, data.discord);
      }
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStepsFromSubscription = (sub, discord) => {
    const linked = !!discord || !!sub?.discord_id;
    const newSteps = [...STEPS];
    newSteps[0].complete = linked;
    newSteps[1].complete = sub?.status === 'trialing' || sub?.status === 'active';
    newSteps[2].complete = sub?.status === 'active';
    const firstIncomplete = newSteps.findIndex((s) => !s.complete);
    setStep(firstIncomplete === -1 ? 4 : firstIncomplete + 1);
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

  const handleManageSubscription = () => {
    // Redirect to Stripe Customer Portal - would need backend endpoint
    setMessage({ type: 'info', text: 'Manage subscription via Stripe portal (coming soon)' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { variant: 'brand', text: 'Active' },
      trialing: { variant: 'brand', text: 'Trial' },
      past_due: { variant: 'warning', text: 'Past Due' },
      canceled: { variant: 'outline', text: 'Canceled' },
      expired: { variant: 'outline', text: 'Expired' },
      pending_discord: { variant: 'outline', text: 'Pending Discord Link' }
    };
    return badges[status] || { variant: 'outline', text: status };
  };

  if (loading) {
    return (
      <section className="pb-4" aria-labelledby="payment-title">
        <div className="mx-auto max-w-[760px] text-center py-16">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand/30 border-t-brand" />
          <p className="mt-4 text-zinc-400">Loading your subscription status...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="pb-4" aria-labelledby="payment-title">
      {/* Hero */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto max-w-[760px] text-center"
      >
        <div className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/15 text-brand">
          <FaCrown className="h-6 w-6" />
        </div>
        <h1 id="payment-title" className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl md:text-[44px]">
          Upgrade to{' '}
          <span className="text-gradient-brand">Deal Profit Premium</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Get faster alerts, premium Discord access, price error finds, and more deal opportunities.
        </p>

        {/* Status Badge */}
        {subscription && (
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className="mt-6 flex items-center justify-center gap-3"
          >
            <Badge variant={getStatusBadge(subscription.status).variant}>
              {getStatusBadge(subscription.status).text}
            </Badge>
            {subscription.current_period_end && (
              <span className="text-sm text-zinc-400">
                {subscription.status === 'active' || subscription.status === 'trialing'
                  ? `Renews ${formatDate(subscription.current_period_end)}`
                  : `Ended ${formatDate(subscription.current_period_end)}`}
              </span>
            )}
          </motion.div>
        )}

        {/* Messages */}
        {message && (
          <motion.div
            {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
            className={`mt-6 rounded-lg p-4 text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : message.type === 'error' ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'}`}
          >
            {message.text}
          </motion.div>
        )}
      </motion.div>

      {/* Stepper */}
      <motion.div
        {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
        className="mx-auto mt-12 max-w-[800px]"
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
        className="mx-auto mt-10 max-w-[800px]"
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
                We need to verify your Discord identity to grant the <strong className="text-brand">deal-profit</strong> role when you subscribe.
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
              {discordLinked && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-emerald-300">
                    <FaCheckCircle className="inline mr-1" />
                    Your Discord is linked.
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

        {/* Step 2: Get Trial Access */}
        {step === 2 && (
          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                <FaCrown className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-white">Get Your Free Trial</h2>
              <p className="mt-2 text-zinc-400 max-w-md mx-auto">
                Join our Discord server and create a ticket in the <strong>#trials</strong> channel to get 7 days of free premium access.
              </p>
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass({ variant: 'primary', size: 'lg' })}
              >
                <FaDiscord className="text-sm" />
                Join Discord & Create Ticket
              </a>
              <p className="mt-4 text-sm text-zinc-500">
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
        )}

        {/* Step 3: Subscribe */}
        {step === 3 && (
          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/15 text-brand">
                <FaCreditCard className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-white">Subscribe to Premium</h2>
              <p className="mt-2 text-zinc-400">
                <strong className="text-white">{PRICE}/month</strong> — cancel anytime. Includes all premium features.
              </p>
              <ul className="mt-6 text-left max-w-xs mx-auto space-y-3 text-sm text-zinc-300">
                {[
                  'Faster member-first alerts',
                  'Price errors & penny finds',
                  'Premium Discord access',
                  'Reselling opportunities',
                  'Cancel anytime'
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
              {subscription?.status === 'active' && (
                <button
                  onClick={handleManageSubscription}
                  className={`${buttonClass({ variant: 'outline', size: 'lg' })} mt-4 w-full max-w-xs mx-auto`}
                >
                  <FaLock className="text-sm" />
                  Manage Subscription
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Subscription View */}
        {subscription && (subscription.status === 'active' || subscription.status === 'trialing') && step > 3 && (
          <div className="card relative overflow-hidden border-emerald-400/30 p-6 sm:p-8">
            <div className="hairline-gradient absolute inset-x-0 top-0 h-px" aria-hidden="true" />
            <div className="text-center">
              <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <FaCheckCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {subscription.status === 'trialing' ? 'Trial Active' : 'Premium Active'}
              </h2>
              <p className="mt-2 text-zinc-400">
                You have access to all premium features.{' '}
                {subscription.discord_id && 'The <strong className="text-brand">deal-profit</strong> role has been granted in Discord.'}
              </p>
              {subscription.current_period_end && (
                <p className="mt-4 text-sm text-zinc-500">
                  {subscription.status === 'trialing' ? 'Trial ends' : 'Next billing'}:
                  <strong className="text-white ml-2">{formatDate(subscription.current_period_end)}</strong>
                </p>
              )}
              <button
                onClick={handleManageSubscription}
                className={`${buttonClass({ variant: 'outline', size: 'lg' })} mt-6 w-full max-w-xs mx-auto`}
              >
                <FaLock className="text-sm" />
                Manage Subscription
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Features reminder */}
      <div className="mx-auto mt-16 max-w-[1000px]">
        <SectionHeader
          align="center"
          eyebrow="What's included"
          title="Everything you get with Premium"
          description="All features unlock immediately after your subscription is confirmed."
        />
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.staggerContainer)}
          className="mx-auto grid max-w-[1000px] gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[
            { icon: FaBolt, title: 'Faster Alerts', text: 'Get deal alerts before the public feed' },
            { icon: FaSkullCrossbones, title: 'Price Errors', text: 'Catch pricing mistakes before they\'re fixed' },
            { icon: FaCoins, title: 'Penny Deals', text: 'Extreme discounts and penny finds' },
            { icon: FaLock, title: 'Premium Discord', text: 'Private channels with exclusive finds' },
            { icon: FaComment, title: 'Community Access', text: 'Chat with experienced deal hunters' },
            { icon: FaChartLine, title: 'More Opportunities', text: 'Additional deals not in the free feed' },
          ].map((feature) => (
            <motion.div key={feature.title} {...getMotionProps(prefersReduced, motionVariants.staggerItem)}>
              <FeatureCard icon={feature.icon} title={feature.title} text={feature.text} className="h-full" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Payment;