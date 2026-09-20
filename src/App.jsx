import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './routes/Home';
import Deals from './routes/Deals';
import Reviews from './routes/Reviews';
import Trial from './routes/Trial';
import Discord from './routes/Discord';
import Upgrade from './routes/Upgrade';
import Admin from './routes/Admin';

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
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;