import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ADMIN_ROUTES, adminRouteLabels } from '../../routes/adminRoutes';

const formatCityLabel = (state?: string, city?: string) => {
  if (!state || !city) return 'Detalhes';
  return `${decodeURIComponent(city)}, ${decodeURIComponent(state)}`;
};

const AdminBreadcrumbs: React.FC = () => {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const path = location.pathname.split('?')[0];
    const segments = path.replace(/^\/+|\/+$/g, '').split('/');

    if (segments[0] !== 'admin') return [];

    const crumbs: Array<{ label: string; path?: string }> = [
      { label: 'Admin', path: ADMIN_ROUTES.dashboard },
    ];

    if (segments.length < 2) return crumbs;

    const basePath = `/${segments.slice(0, 2).join('/')}`;
    const baseLabel = adminRouteLabels[basePath];
    if (baseLabel) {
      crumbs.push({ label: baseLabel, path: basePath });
    }

    if (segments.length >= 3) {
      if (basePath === ADMIN_ROUTES.cities) {
        const state = segments[2];
        const city = segments[3];
        crumbs.push({ label: formatCityLabel(state, city) });
      } else {
        crumbs.push({ label: 'Detalhes' });
      }
    }

    return crumbs;
  }, [location.pathname]);

  if (breadcrumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        if (isLast || !crumb.path) {
          return (
            <span key={`${crumb.label}-${index}`} className="text-slate-200">
              {crumb.label}
            </span>
          );
        }

        return (
          <span key={`${crumb.label}-${index}`} className="flex items-center gap-2">
            <Link to={crumb.path} className="hover:text-white transition-colors">
              {crumb.label}
            </Link>
            <span className="text-slate-500">/</span>
          </span>
        );
      })}
    </div>
  );
};

export default AdminBreadcrumbs;
