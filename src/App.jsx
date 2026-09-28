import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './routes/Home';
import Deals from './routes/Deals';
import Reviews from './routes/Reviews';
import Discord from './routes/Discord';
import Upgrade from './routes/Upgrade';
import Terms from './routes/Terms';
import Privacy from './routes/Privacy';
import Refunds from './routes/Refunds';

// Admin is only reachable at the hidden /admin route — code-split it out of
// the main bundle so public pages don't pay for its (heavy) icon set.
const Admin = lazy(() => import('./routes/Admin'));

// /payment and /trial folded into /upgrade — keep old links (Stripe return
// URLs, bookmarks, shared links) working with their query params intact.
function Redirect({ to }) {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: to, search, hash }} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/discord" element={<Discord />} />
          <Route path="/upgrade" element={<Upgrade />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/refunds" element={<Refunds />} />
          <Route path="/payment" element={<Redirect to="/upgrade" />} />
          <Route path="/trial" element={<Redirect to="/upgrade" />} />
        </Route>
        <Route
          path="/admin"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                </div>
              }
            >
              <Admin />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;