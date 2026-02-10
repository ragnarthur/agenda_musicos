import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router (BrowserRouter + Routes) does not reset scroll position by default.
// This forces the viewport back to the top whenever the route changes.
export default function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return null;
}

