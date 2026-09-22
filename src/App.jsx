import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './routes/Home';
import Deals from './routes/Deals';
import Reviews from './routes/Reviews';
import Trial from './routes/Trial';
import Discord from './routes/Discord';
import Upgrade from './routes/Upgrade';

// Admin is only reachable at the hidden /admin route — code-split it out of
// the main bundle so public pages don't pay for its (heavy) icon set.
const Admin = lazy(() => import('./routes/Admin'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/reviews" element={<Reviews />} />
          <Route path="/trial" element={<Trial />} />
          <Route path="/discord" element={<Discord />} />
          <Route path="/upgrade" element={<Upgrade />} />
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