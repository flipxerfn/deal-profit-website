import rtpcImg from '../assets/crops/deal1-hero.webp';
import headphonesImg from '../assets/crops/deal2-card.webp';
import discord1Cropped from '../assets/crops/discord1-cropped.webp';
import { FEED_STATS } from './siteFacts';

const MEDIAN_SAVING = FEED_STATS.medianSavingPct;

// Must stay in sync with CATEGORY_LABELS / CATEGORY_KEYWORDS in
// worker/parseDeals.js. A category the worker emits but the chip list lacks is
// invisible in the UI and silently swallowed by the filter — pinned by
// worker/feed-categories.test.js.
export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'tech', label: 'Tech' },
  { id: 'grocery', label: 'Grocery' },
  { id: 'home', label: 'Home' },
  { id: 'tools', label: 'Tools' },
  { id: 'automotive', label: 'Auto' },
  { id: 'sports', label: 'Sports' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'beauty', label: 'Beauty' },
  { id: 'crafts', label: 'Crafts' },
  { id: 'pets', label: 'Pets' },
  { id: 'toys', label: 'Toys' },
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
    archived: true,
    meta: ['Archived example', 'How a penny find surfaces'],
    image: discord1Cropped,
    imageSquare: discord1Cropped,
    imageAlt: 'Penny CPU deal caught at $0.01',
    imagePosition: 'center',
    cta: { label: 'See live deals', href: '/deals' },
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
    archived: true,
    meta: ['Archived example', 'How a price error surfaces'],
    image: rtpcImg,
    imageAlt: 'RTX 5060 Gaming PC retailer listing at $39.99',
    imagePosition: 'center top',
    cta: { label: 'See live deals', href: '/deals' },
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
    archived: true,
    meta: ['Archived example', 'How a stacked glitch surfaces'],
    image: headphonesImg,
    imageAlt: 'Wireless Headphones retailer listing at $12.99',
    imagePosition: 'center top',
    cta: { label: 'See live deals', href: '/deals' },
  },
];

export const HOME_FINDS = DEALS.filter((d) => d.id === 'penny-cpu' || d.id === 'rtx-5060-gaming-pc');

export const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Join the community',
    text: 'Join the Deal Profit Discord for the finds as they land, or start a 7-day trial on Whop to unlock the member-only channels.',
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

// Figures are measured from the live feed, not estimated — see siteFacts.js for
// how each was derived and why invented ones were removed.
// A function of the measured linkable percentage, not a constant.
//
// This array carried `${PCT_LINKABLE}%`, derived from a snapshot that counted
// 9 Discord channel links as links to a listing. Making it a function means the
// measured value has to be passed in, so it cannot be rendered with a stale
// number the way a baked-in constant always eventually is.
export const COMMUNITY_STATS = (pctLinkable) => [
  { value: '200', label: 'Finds in the feed', icon: 'bolt' },
  { value: `${MEDIAN_SAVING}%`, label: 'Median saving on a posted find', icon: 'percent' },
  { value: pctLinkable, label: 'Link straight to the listing', icon: 'shield' },
  { value: '24/7', label: 'Monitoring', icon: 'bell' },
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