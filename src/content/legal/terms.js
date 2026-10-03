import {
  CONTACT_EMAIL,
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  JURISDICTION,
  DISCORD_INVITE,
  PRICE_MONTHLY,
  PRICE_YEARLY,
} from './config';

export const terms = {
  slug: 'terms',
  title: 'Terms of Service',
  eyebrow: 'Legal',
  intro:
    `These Terms govern your use of ${BUSINESS_LEGAL_NAME} (the "Service") at goosiev.com. ` +
    `By creating an account, purchasing a membership, or otherwise using the Service, you agree to them.`,
  updated: 'September 30, 2026',
  sections: [
    {
      id: 'eligibility',
      heading: '1. Eligibility and accounts',
      body: [
        'You must be legally able to enter into a binding contract where you live, and at least 18 years old (or the age of majority where you live).',
        'Membership is tied to your Discord account. You are responsible for activity under your account and for keeping access to your Discord email and account secure. Memberships are personal and not transferable.',
        'You may not share, resell, or distribute your membership or premium access to anyone else. Automated access, scraping, or resale of deal alerts without written permission is prohibited.',
      ],
    },
    {
      id: 'service',
      heading: '2. What you get',
      body: [
        'Deal Profit surfaces price errors, penny deals, glitches, and reselling opportunities we find across retailers, plus access to our community Discord. Premium members receive faster alerts, priority notifications, and the **deals-profit** role in our Discord server.',
        'Deals are posted as we find them, often within seconds. Availability, pricing, and stock are controlled entirely by the retailer — see "No guarantee of deals" below.',
      ],
    },
    {
      id: 'subscriptions',
      heading: '3. Subscriptions, trials, and billing',
      body: [
        `Paid membership is offered as ${PRICE_MONTHLY}/month or ${PRICE_YEARLY}/year. Prices are shown in US dollars and may change with at least 30 days notice before your next renewal.`,
        `New members can try the member channels free for 7 days through our checkout page on Whop. A payment method is required to start the trial so that it can continue as a subscription if you let it run. If you do not cancel before the trial ends, the plan you selected begins and bills at its normal rate from that date. You can cancel at any time before then and will not be charged — see section 4.`,
        'Billing is recurring and renews automatically at the end of each period until you cancel. We will notify you by email and/or in Discord before each renewal.',
        'Payments are processed by Whop, which is our payment provider. Whop handles your card details; we never see or store your full card number. Wallets such as Apple Pay and Google Pay may be used where supported.',
        'If a payment fails, Whop may retry it. If it cannot be collected, your membership and premium Discord role may be suspended until payment succeeds.',
      ],
    },
    {
      id: 'cancel',
      heading: '4. Cancellation',
      body: [
        'You can cancel at any time from your Whop account — use "Manage membership" on our Whop product page, or Profile → Orders on whop.com. There are no cancellation fees and no minimum commitment. You can also message us and we will cancel it for you.',
        'When you cancel, your premium access continues until the end of the period you already paid for, and your Discord role stays active until that date. After that date you are not charged again and the role is removed.',
        'Cancelling during the 7-day trial stops the subscription before it converts, so no charge is made. We will email you before the trial converts, and again before each renewal.',
      ],
    },
    {
      id: 'no-guarantee',
      heading: '5. No guarantee of deals',
      body: [
        'We work hard to verify every post, but we cannot guarantee that any deal is available, that a retailer will honor the advertised price, or that a listing is accurate. Retailers may correct prices, remove stock, or cancel orders at any time — often within minutes.',
        'Deal content is provided for informational purposes. Your decision to purchase, and any resulting purchase, is entirely between you and the retailer.',
      ],
    },
    {
      id: 'acceptable-use',
      heading: '6. Acceptable use',
      body: [
        'Do not use the Service to break the law, to harass others, to scrape or overload our systems, to bypass access controls, or to republish our deal content as your own.',
        'We may suspend or terminate access for abuse, fraud, chargeback abuse, or violation of these terms. Where a paid term remains, we will not charge for suspended periods.',
      ],
    },
    {
      id: 'ip',
      heading: '7. Intellectual property',
      body: [
        'The Service, including its design, code, branding, and deal formatting, is owned by Deal Profit and protected by copyright and related laws.',
        'You may share deal links and quote short excerpts with attribution. You may not reproduce substantial portions of the Service or resell deal data without written permission.',
      ],
    },
    {
      id: 'liability',
      heading: '8. Disclaimers and limitation of liability',
      body: [
        'THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING FITNESS FOR A PARTICULAR PURPOSE.',
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, DEAL PROFIT IS NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS OR LOST DEALS, ARISING FROM YOUR USE OF THE SERVICE.',
        'Nothing in these terms limits rights you have under consumer law that cannot be waived by agreement.',
      ],
    },
    {
      id: 'changes',
      heading: '9. Changes and termination',
      body: [
        'We may update these terms. Material changes will be announced in Discord and/or by email before they take effect. Continuing to use the Service after changes take effect means you accept them.',
        'We may discontinue the Service or any part of it at any time, and will provide notice and refund any prepaid, unused portion where required by law.',
      ],
    },
    {
      id: 'contact',
      heading: '10. Contact',
      body: [
        `Questions about these terms: ${CONTACT_EMAIL}. Community and support: ${DISCORD_INVITE}.`,
        // No street address is published, so the line is dropped rather than
        // rendered as a dangling "Business address: ." with nothing after it.
        ...(BUSINESS_ADDRESS ? [`Business address: ${BUSINESS_ADDRESS}.`] : []),
        `These terms are governed by the laws of ${JURISDICTION}, without regard to conflict-of-law rules.`,
      ],
    },
  ],
};
