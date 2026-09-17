# Deal Profit - Premium Deal Finding Community Website

A modern, high-converting landing page for Deal Profit - a price error and deal alert Discord community.

## Features

- **Modern Dark Theme** - Premium SaaS-style design with smooth animations
- **Responsive Design** - Works perfectly on mobile and desktop
- **High-Converting Sections**:
  - Hero section with clear value proposition
  - Prominent Free Trial section
  - How it works explanation
  - Features showcase
  - Proof and credibility section
  - Discord community invitation
  - Comprehensive FAQ
  - Professional footer

## Tech Stack

- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Icons**: React Icons

## Sections Implemented

1. **Hero Section** - Attention-grabbing headline, value proposition, primary and secondary CTAs
2. **Free Trial Section** - Highlighted card/banner emphasizing risk-free trial
3. **How It Works** - 3-step process visualization
4. **Features Section** - 6 key features with icons and descriptions
5. **Proof / Credibility** - Member stats, success stories, deal examples
6. **Discord Section** - Invitation to join the community with support messaging
7. **FAQ Section** - Common questions about the service
8. **Footer** - Navigation links to Free Trial, Discord, and Contact

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set the build command to: `npm run build`
3. Set the build output directory to: `dist`
4. Optional: Create a `wrangler.toml` file (already included)

### Vercel

1. Push the repository to GitHub
2. Import the project in Vercel
3. Vercel will auto-detect the Vite/React configuration
4. Deploy!

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

No environment variables are required for this static site.

## Files Included

- `src/App.jsx` - Main application component with all sections
- `src/index.css` - Tailwind CSS base directives
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration with Tailwind plugin
- `package.json` - Dependencies and scripts
- `wrangler.toml` - Cloudflare Pages configuration
- `public/` - Static assets (favicon, etc.)

## Customization

To customize this website for your own use:

1. Update the text content in `src/App.jsx`
2. Modify colors in `tailwind.config.js` if needed
3. Replace any placeholder images in the `public/` directory
4. Update the Discord and Whop links to your actual URLs