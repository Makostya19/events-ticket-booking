import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header.jsx';

export default function Layout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <span>© {new Date().getFullYear()} Evently</span>
          <span className="muted">Discover and book events in Seoul</span>
        </div>
      </footer>
    </>
  );
}