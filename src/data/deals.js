import rtpcImg from '../assets/crops/deal1-cropped.jpg';
import headphonesImg from '../assets/crops/deal2-cropped.png';

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tech', label: 'Tech' },
  { id: 'penny', label: 'Penny Deals' },
  { id: 'other', label: 'Other' },
];

export const DEALS = [
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
    cta: { label: 'View Deal', href: 'https://whop.com/deals-profit/deal-profit-price-errors-deals' },
  },
  {
    id: 'penny-deals',
    title: 'Penny Deals',
    category: 'penny',
    categoryLabel: 'Penny Deals',
    badge: 'Penny finds',
    price: 0.01,
    displayPrice: 'As low as $0.01',
    description:
      'Extreme price drops and penny finds posted the moment they go live in member-only channels.',
    meta: ['Hourly updates', '50+ finds daily'],
    image: null,
    cta: { label: 'View in Community', href: 'https://discord.gg/dealprofit' },
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
    cta: { label: 'View Deal', href: 'https://whop.com/deals-profit/deal-profit-price-errors-deals' },
  },
];

export const HOME_FINDS = DEALS.filter((d) => d.id === 'rtx-5060-gaming-pc' || d.id === 'penny-deals');

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