import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    // Vitest had NO test config at all, so it defaulted to collecting
    // `**/*.test.js` across the whole repo. That swept up three suites written
    // for `node:test` and a Playwright spec, none of which are vitest tests.
    //
    // The damage was quiet: each of those four files reported as
    // "No test suite found" and the run showed 5 red files, so they read as
    // broken tests when in fact they were never tests as far as vitest was
    // concerned. Three of them hold 45 real assertions that had not been
    // running, and the Playwright spec had rotted into one that asserted the
    // site had no Whop links — which stopped being true when checkout moved to
    // Whop, and which would have failed if it had ever been collected.
    include: ['src/**/*.test.{js,jsx}', 'worker/**/*.test.js'],

    // These three import `node:test`, not vitest. Vitest cannot execute them;
    // `npm run test:node` runs them with their own runner.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'worker/config-persist.test.js',
      'worker/dedupe.test.js',
      'worker/reviews.test.js',
      'playwright/**',
    ],
  },
  server: {
    // Forward API calls to the wrangler dev worker (npx wrangler dev --port 8787)
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})