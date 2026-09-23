import rtpcImg from '../assets/crops/deal1-hero.webp';
import headphonesImg from '../assets/crops/deal2-card.webp';
import cpuImg from '../assets/crops/cpu-card.webp';
import cpuSquareImg from '../assets/crops/cpu-square.webp';

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tech', label: 'Tech' },
  { id: 'penny', label: 'Penny Deals' },
  { id: 'other', label: 'Other' },
];

export const DEALS = [
  {
    id: 'penny-cpu',
    title: 'Penny CPU',
    category: 'penny',
    categoryLabel: 'Penny Deals',
    badge: 'Penny find',
    price: 0.01,
    referencePrice: 299.99,
    description:
      'A brand-new desktop CPU caught at a penny — a retailer price error posted the moment it went live. First come, first served.',
    meta: ['Live now', 'Save 100%', 'Found by Deal Profit'],
    image: cpuImg,
    imageSquare: cpuSquareImg,
    imageAlt: 'Penny CPU deal caught at $0.01',
    imagePosition: 'center',
    cta: { label: 'View Deal', href: 'https://whop.com/deal-profit-6dcc?a=phillipkuz9' },
  },
  {
    id: 'rtx-5060-gaming-pc',
    title: 'RTX 5060 Gaming PC',
    category: 'tech',
    categoryLabel: 'Tech',
    badge: 'Price error',
    price: 39.99,
    referencePrice: 599.99,
    description:
      'Brand new RTX 5060 gaming PC with RGB lighting — flagged the moment the retailer pricing error went live.',
    meta: ['Live now', 'Save 93%', 'Found by Deal Profit'],
    image: rtpcImg,
    imageAlt: 'RTX 5060 Gaming PC retailer listing at $39.99',
    imagePosition: 'center top',
    cta: { label: 'View Deal', href: 'https://whop.com/deal-profit-6dcc?a=phillipkuz9' },
  },
  {
    id: 'wireless-headphones',
    title: 'Wireless Headphones',
    category: 'other',
    categoryLabel: 'Audio',
    badge: 'Glitch',
    price: 12.99,
    referencePrice: 129.99,
    description:
      'Premium noise-cancelling Bluetooth headphones stacked down to a fraction of retail on the listing.',
    meta: ['Save 90%', 'Found by Deal Profit'],
    image: headphonesImg,
    imageAlt: 'Wireless Headphones retailer listing at $12.99',
    imagePosition: 'center top',
    cta: { label: 'View Deal', href: 'https://whop.com/deal-profit-6dcc?a=phillipkuz9' },
  },
];

export const HOME_FINDS = DEALS.filter((d) => d.id === 'penny-cpu' || d.id === 'rtx-5060-gaming-pc');

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Join the community',
    text: 'Hop into the Deal Profit Discord and grab the free trial to unlock member-only channels.',
  },
  {
    step: '02',
    title: 'Get real-time alerts',
    text: 'Price errors, penny finds and glitches are posted the second they go live — in your feed and Discord.',
  },
  {
    step: '03',
    title: 'Catch the deal first',
    text: 'Check the listing fast, lock in the price and resell or keep the savings — before everyone else.',
  },
];

export const COMMUNITY_STATS = [
  { value: '10K+', label: 'Deal hunters', icon: 'users' },
  { value: '50+', label: 'Deals posted daily', icon: 'bolt' },
  { value: '93%', label: 'Average savings', icon: 'percent' },
  { value: '24/7', label: 'Live alerts', icon: 'bell' },
];

export const WHAT_WE_HUNT = [
  {
    title: 'Price Errors',
    text: 'Retailer mis-prices, caught and shared before they get corrected.',
  },
  {
    title: 'Penny Deals',
    text: 'Products that drop to the lowest possible price point — as low as $0.01.',
  },
  {
    title: 'Hidden Discounts',
    text: 'Silent price cuts, stacked discounts and deals most shoppers never see.',
  },
  {
    title: 'Fast Alerts',
    text: 'Member-first notifications the second a find goes live.',
  },
];