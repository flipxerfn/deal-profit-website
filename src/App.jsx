import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './routes/Home';
import usePrefetchRoutes from './lib/usePrefetchRoutes';

// Only Home is in the initial bundle. Every other route is code-split so the
// first paint only downloads what the landing page needs.
const Deals = lazy(() => import('./routes/Deals'));
const Reviews = lazy(() => import('./routes/Reviews'));
const Discord = lazy(() => import('./routes/Discord'));
const Upgrade = lazy(() => import('./routes/Upgrade'));
const SetupRequest = lazy(() => import('./routes/SetupRequest'));
const Welcome = lazy(() => import('./routes/Welcome'));
const Terms = lazy(() => import('./routes/Terms'));
const Privacy = lazy(() => import('./routes/Privacy'));
const Refunds = lazy(() => import('./routes/Refunds'));

// Admin is only reachable at the hidden /admin route — code-split it out of
// the main bundle so public pages don't pay for its (heavy) icon set.
const Admin = lazy(() => import('./routes/Admin'));

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
  </div>
);

// /payment and /trial folded into /upgrade — keep old links (Stripe return
// URLs, bookmarks, shared links) working with their query params intact.
function Redirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}

function App() {
  // Pull every code-split route into the module cache while the browser is
  // idle. Without it the first visit to any route has to wait for its chunk,
  // and AnimatePresence mode="wait" means that wait stacks on top of the exit
  // animation — measured at 4s to change the page for /setup-request, which
  // reads as a broken site and sends people to the refresh button.
  usePrefetchRoutes();

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/reviews" element={<Reviews />} />
            <Route path="/discord" element={<Discord />} />
            <Route path="/upgrade" element={<Upgrade />} />
            <Route path="/setup-request" element={<SetupRequest />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refunds" element={<Refunds />} />
            <Route path="/payment" element={<Redirect to="/upgrade" />} />
            <Route path="/trial" element={<Redirect to="/upgrade" />} />
          </Route>
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;