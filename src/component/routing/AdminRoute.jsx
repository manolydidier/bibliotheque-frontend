// src/components/routing/AdminRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useMeFromLaravel from '../../hooks/useMeFromLaravel';
import { computeRights } from '../../utils/access';

export default function AdminRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, user } = useSelector(s => s.library?.auth || {});
  const { me } = useMeFromLaravel();

  const mergedUser        = { ...(user || {}), ...(me?.user || {}) };
  const mergedRoles       = [...(user?.roles || []), ...(me?.roles || [])];
  const mergedPermissions = [...(user?.permissions || []), ...(me?.permissions || [])];

  const { isAdmin } = computeRights(mergedPermissions, mergedRoles, mergedUser);

  if (!isAuthenticated) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    return <Navigate to={`/auth?view=login&next=${next}`} replace />;
  }
  if (!isAdmin) return <Navigate to="/403" replace />;
  return children;
}
