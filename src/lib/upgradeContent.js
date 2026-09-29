// The upgrade FAQ lives here rather than inside the route component so that the
// page and the site search index render from the same data. Two copies would
// drift, and the search would then advertise answers that don't exist.
export const UPGRADE_FAQS = [
  {
    title: 'How does the free trial work?',
    content:
      'Click any trial button and you land in our Discord server, where the member channels are. Try it there. No card is taken for the trial, so there is nothing to cancel and no charge to forget about. Subscribe on Whop when you are ready.',
  },
  {
    title: 'Can I cancel anytime?',
    content:
      'Yes — cancel from your Whop account at any time, or just ask in the Discord server. Your access stays until the end of the period you already paid for.',
  },
  {
    title: 'Do I need a card to try it?',
    content:
      'No. The trial lives in our Discord server, so there is no card and no auto-charge to forget about. If you decide you want the member channels permanently, subscribe on Whop then.',
  },
  {
    title: 'Who holds my payment details?',
    content:
      'Whop does — not us. Checkout happens on Whop\'s page and they handle the card. We only ever see that a subscription is active, and they email you the receipt.',
  },
  {
    title: 'What makes the premium feed different?',
    content:
      'Premium members get faster alerts plus priority notifications for price errors, penny deals and reselling opportunities that stay out of the public feed.',
  },
  {
    title: 'Are the deals guaranteed?',
    content:
      'No. Retailers can correct pricing errors at any time, and stock is often limited. Deals are posted fast specifically so you can act before that happens.',
  },
  {
    title: 'Is there a yearly plan?',
    content:
      'Yes — choose the yearly plan for $200/year and save $100 compared to monthly billing. You get the same premium features with a full year of uninterrupted access.',
  },
];
