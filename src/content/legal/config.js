// Shared facts for the legal pages.
//
// These were placeholders until 30 September 2026, when the site was live at
// goosiev.com/terms and goosiev.com/privacy with the text
// "[Business address — add before going live]" and
// "[Your state / country of residence]" showing to the public. A note-to-self
// on a published legal page is worse than no page: it tells a reader that
// nobody checked. config.test.js now fails if either placeholder comes back.
export const CONTACT_EMAIL = 'altacc901210@gmail.com';
export const BUSINESS_LEGAL_NAME = 'Deal Profit';
// No street address is published. A contact email and a named jurisdiction
// satisfy the governing-law and contact requirements without putting a home
// address on a public page, and Whop does not require one for dispute evidence.
export const BUSINESS_ADDRESS = '';
export const JURISDICTION = 'the State of New York, United States';
export const COUNTRY = 'United States';
export const STATE = 'New York';
export const SITE_URL = 'https://goosiev.com';
export const DISCORD_INVITE = 'https://discord.gg/dealprofit';
export const LAST_UPDATED = 'September 30, 2026';
export const SERVICE_NAME = 'Deal Profit';
export const PREMIUM_ROLE = 'deals-profit';
export const PRICE_MONTHLY = '$25';
export const PRICE_YEARLY = '$200';
// There is no timed card trial any more: the trial lives in Discord and is not
// billed, so a TRIAL_DAYS value would only invite copy that promises a charge.
