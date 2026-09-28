import {
  CONTACT_EMAIL,
  BUSINESS_LEGAL_NAME,
  BUSINESS_ADDRESS,
  JURISDICTION,
  DISCORD_INVITE,
  PREMIUM_ROLE,
  PRICE_MONTHLY,
  PRICE_YEARLY,
} from './config';

export const privacy = {
  slug: 'privacy',
  title: 'Privacy Policy',
  eyebrow: 'Legal',
  intro:
    `This policy explains what ${BUSINESS_LEGAL_NAME} collects, why we collect it, and the choices you have. ` +
    'We collect as little as possible and never sell your personal information.',
  updated: 'September 28, 2026',
  sections: [
    {
      id: 'summary',
      heading: '1. In short',
      body: [
        'We collect your Discord user ID and username, your membership and billing status, and basic technical data needed to run the site and prevent abuse.',
        'Payment card details are handled entirely by Stripe — we never receive or store your card number.',
        'We do not sell personal information, and we do not share it for advertising.',
      ],
    },
    {
      id: 'collect',
      heading: '2. What we collect',
      body: [
        '**Account and identity data.** When you link your Discord account, we store your Discord user ID and username so we can grant and remove your premium Discord role and confirm your membership.',
        '**Membership and billing data.** We store your Stripe customer ID, subscription ID, membership status, billing period dates, and whether a cancellation is scheduled. This lets us know whether to grant or remove access.',
        '**Payment card details.** Collected and stored by Stripe, our payment processor. We receive only the last four digits and card brand for display and support. Your full card number never touches our servers.',
        '**Content you submit.** If you post a review, we store the name, rating, and text you submit, along with the time it was submitted and its moderation status.',
        '**Technical data.** We process IP addresses to rate-limit submissions and prevent abuse, and a random, first-party identifier stored in your browser to count unique visitors and show how many members are online. This identifier is not linked to you across other sites.',
        '**Communications.** If you contact us, we keep the message and our reply so we can resolve your request.',
      ],
    },
    {
      id: 'use',
      heading: '3. How we use your information',
      body: [
        'To provide the Service: delivering deal alerts, granting and removing your premium Discord role, processing payments, and providing support.',
        'To prevent abuse: rate limiting review submissions, moderating reviews, and investigating fraud or chargebacks.',
        'To communicate: service announcements, billing notices, and responses to your support requests. We do not send marketing email, and we do not sell or rent your data.',
      ],
    },
    {
      id: 'share',
      heading: '4. Sharing with third parties',
      body: [
        '**Stripe** — processes payments and provides the billing portal.',
        '**Discord** — hosts our community, our bot, and the role that gates premium channels. Your Discord username is visible to other members of the server by nature of Discord.',
        '**Cloudflare** — hosts the site and provides security and traffic analytics.',
        'We may also disclose information where required by law, or to protect our rights, users, or the public.',
        'We do not sell your personal information to anyone, for any purpose.',
      ],
    },
    {
      id: 'retention',
      heading: '5. Data retention',
      body: [
        'Membership and billing records are kept while your membership is active and for a reasonable period afterwards for accounting and support purposes.',
        'Moderated reviews are kept while they are published. Rejected or deleted submissions are removed shortly after moderation.',
        'Visitor-count identifiers are retained only to keep totals accurate; they contain no personal information.',
        'You can ask us to delete your data, and we will do so except where retention is required by law.',
      ],
    },
    {
      id: 'cookies',
      heading: '6. Cookies and local storage',
      body: [
        'We use a first-party identifier in your browser to count unique visitors and show the online-member count. It is not used for advertising or cross-site tracking.',
        'A session cookie keeps you signed in to the member area. If you block cookies, some features — including sign-in — will not work.',
      ],
    },
    {
      id: 'security',
      heading: '7. Security',
      body: [
        'We use industry-standard safeguards: encrypted connections, access controls on our systems, and a trusted payment processor for all card data. No system is perfectly secure, and we cannot guarantee absolute security.',
      ],
    },
    {
      id: 'rights',
      heading: '8. Your rights',
      body: [
        'Depending on where you live, you may have the right to access, correct, export, or delete your personal information, to object to or restrict certain processing, and to complain to your local data-protection regulator.',
        'To exercise any of these rights, email us. We will verify your request and respond within the time required by applicable law.',
        'You can also manage or delete your Discord account at any time through Discord directly.',
      ],
    },
    {
      id: 'children',
      heading: '9. Children',
      body: [
        `The Service is not directed at anyone under 13 (or the minimum age of digital consent in your country), and we do not knowingly collect data from children. The ${PREMIUM_ROLE} role and paid membership are for adults only.`,
      ],
    },
    {
      id: 'changes-contact',
      heading: '10. Changes and contact',
      body: [
        'We may update this policy as the Service changes. Material updates will be announced in Discord.',
        `Privacy questions and data requests: ${CONTACT_EMAIL}. Community: ${DISCORD_INVITE}.`,
        `Business address: ${BUSINESS_ADDRESS}. This policy is governed by the laws of ${JURISDICTION}.`,
      ],
    },
  ],
};

export { PRICE_MONTHLY, PRICE_YEARLY };
