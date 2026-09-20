import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './routes/Home';
import Deals from './routes/Deals';
import Trial from './routes/Trial';
import Discord from './routes/Discord';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/trial" element={<Trial />} />
          <Route path="/discord" element={<Discord />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;