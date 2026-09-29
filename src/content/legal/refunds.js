import {
  CONTACT_EMAIL,
  BUSINESS_LEGAL_NAME,
  PRICE_MONTHLY,
  PRICE_YEARLY,
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
        'Subscriptions are billed through Whop, which is our payment provider, so cancelling is done from your Whop account rather than on this site. Whop holds your card and is the only party that can stop a future charge.',
        'On our Whop product page, open the community menu and choose "Manage membership". Alternatively, sign in at whop.com, go to Profile → Orders, select the subscription and choose "Cancel membership".',
        'You can also just ask: message us in Discord or email us and we will cancel it for you. You do not need to do anything technical.',
      ],
    },
    {
      id: 'trial',
      heading: '2. Free trial',
      body: [
        'The free trial happens in our Discord server, not through a checkout. No card is involved at any point, so there is no charge to be made, no payment method on file, and nothing for you to cancel.',
        'If you decide to subscribe, that is a separate, deliberate step where you choose a plan and pay on Whop. We will never start a paid subscription for you, and we will never charge a card that you have not personally used to buy a plan.',
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
        `Both plans are offered on the same Whop product: ${PRICE_MONTHLY}/month and ${PRICE_YEARLY}/year. Manage the change from "Manage membership" on the Whop product page, where the available plans and any credit for the remainder of your current period are shown before you confirm.`,
        'You are never charged twice for the same period, and switching to the yearly plan never charges you more than the yearly price in total.',
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
