import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = () => {
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-128px)] bg-black">
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default Layout;