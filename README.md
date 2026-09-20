# Deal Profit — Deal-Finding Community Website

A dark, scannable website for Deal Profit — a price error, penny deal and glitch-finding Discord community.

## Pages

- `/` — Home: hero, what we hunt, latest finds, community CTA
- `/deals` — Real deal feed with search, category chips and sorting
- `/trial` — Membership / free trial page
- `/discord` — Community page with Discord screenshots

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS v4 (CSS-first config in `src/index.css`)
- **Icons**: React Icons
- **Routing**: React Router v7

## Development

```bash
npm install
npm run dev       # start dev server
npm run build     # production build to dist/
npm run preview   # preview the production build
npm run lint      # oxlint
```

## Structure

- `src/routes/` — page components (Home, Deals, Trial, Discord)
- `src/components/` — shared UI (Navbar, Footer, Layout, DealCard)
- `src/data/deals.js` — deal data, separate from presentation
- `src/index.css` — Tailwind v4 entry: design tokens (`@theme`) plus layered components
- `public/` — static assets (favicon, etc.)

## Customization

1. Edit page text in `src/routes/`
2. Add/edit deals in `src/data/deals.js`
3. Adjust brand tokens (colors, shadows) in the `@theme` block of `src/index.css`
4. Update the Whop and Discord invite links wherever you see them

## Deployment

Cloudflare Pages (Git-connected) — build command `npm run build`, output directory `dist`.