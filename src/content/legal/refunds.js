import {
  CONTACT_EMAIL,
  BUSINESS_LEGAL_NAME,
  PRICE_MONTHLY,
  PRICE_YEARLY,
  TRIAL_DAYS,
  DISCORD_INVITE,
} from './config';

export const refunds = {
  slug: 'refunds',
  title: 'Refund & Cancellation Policy',
  eyebrow: 'Legal',
  intro:
    `The short version: you can cancel whenever you want, you keep what you paid for, and you are never charged for a trial you cancel. ` +
    `Full details for ${BUSINESS_LEGAL_NAME} are below.`,
  updated: 'September 28, 2026',
  sections: [
    {
      id: 'cancel-now',
      heading: '1. How to cancel',
      body: [
        'Sign in and open the /upgrade page on this site. The member card shows your status and a Cancel Subscription button. Click it and confirm.',
        'Cancellation takes effect immediately as a flag and ends your billing at the end of your current period. You can also manage or cancel at any time from the billing portal linked in your confirmation email.',
        `If you have trouble cancelling, email ${CONTACT_EMAIL} or ask in ${DISCORD_INVITE} and we will cancel it for you.`,
      ],
    },
    {
      id: 'trial',
      heading: '2. Free trial',
      body: [
        `A trial is ${TRIAL_DAYS} days. Cancel during the trial and you will never be charged — no charge is created at all.`,
        'A payment method is required to start a trial so that your membership can continue automatically if you do nothing.',
      ],
    },
    {
      id: 'what-happens',
      heading: '3. What happens after you cancel',
      body: [
        'You keep full premium access — faster alerts, premium channels, and your Discord role — until the end of the period you already paid for.',
        'After that date you are not charged again, the premium role is removed, and the membership ends.',
        'Cancelling does not delete your account, your Discord link, or your posted reviews.',
      ],
    },
    {
      id: 'refund-requests',
      heading: '4. Refunds',
      body: [
        `Because you keep access for the full period you paid for, we generally do not refund the remainder of a period you have already used. This mirrors how most streaming and membership services work, and it is what makes the ${PRICE_YEARLY}/year price possible.`,
        'We do refund, at our discretion and normally in full, when:',
      ],
      list: [
        'You were charged twice for the same membership.',
        'You were charged for a renewal you did not intend after already cancelling.',
        'You started a paid membership by mistake within 14 days and have not used premium features.',
        'We failed to deliver the Service (for example premium channels or alerts were unavailable) and you tell us promptly.',
        'A charge was the result of an error on our part, including a Discord role we failed to grant after a successful payment.',
        'Required by law where you live, or as part of resolving a chargeback you raised in good faith.',
      ],
    },
    {
      id: 'how-to-request',
      heading: '5. How to request a refund',
      body: [
        `Email ${CONTACT_EMAIL} from the address used for the membership, with the Discord username and the approximate date of the charge. We aim to respond within 3 business days.`,
        'Approved refunds are returned to the original payment method. Depending on your bank, it can take 5–10 business days to appear.',
        'Refunds reduce your paid-through date. If a refund leaves you without a current period, your premium role is removed when that period ends.',
      ],
    },
    {
      id: 'upgrades',
      heading: '6. Changing plans (monthly ↔ yearly)',
      body: [
        `You can switch between ${PRICE_MONTHLY}/month and ${PRICE_YEARLY}/year. When you switch, the new plan starts and the previous plan ends; you are charged or credited the difference for the remaining time at the moment of the change.`,
        'Switching to yearly from monthly never charges you twice for the same period.',
      ],
    },
    {
      id: 'no-other-refunds',
      heading: '7. No other refunds',
      body: [
        'Except as stated here or where the law requires otherwise, Deal Profit has no obligation to refund fees already paid, and any unused portion of a period is not refundable. Nothing in this policy limits rights you have under consumer law that cannot be waived.',
      ],
    },
    {
      id: 'chargebacks',
      heading: '8. Disputes and chargebacks',
      body: [
        'Please contact us first — we can usually resolve billing issues faster than a bank can. If a charge is disputed through your bank, we will see the case and share the relevant records; repeated unfounded disputes may result in your membership and account being closed.',
      ],
    },
    {
      id: 'contact',
      heading: '9. Contact',
      body: [
        `Refunds and billing questions: ${CONTACT_EMAIL}. Support and community: ${DISCORD_INVITE}.`,
      ],
    },
  ],
};
