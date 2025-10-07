// src/routes/RouteGuards.jsx
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { rehydrateAuthFromStorage } from "../features/auth/authActions";

const LoadingSpinner = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="bg-white p-8 rounded-lg shadow-md">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Chargement...</p>
    </div>
  </div>
);

export const RequireAuth = ({ redirectTo = "/auth", fallback = null }) => {
  const dispatch = useDispatch();
  const location = useLocation();

  // ⬇️ Primitifs uniquement (aucun objet/array re-créé dans le sélecteur)
  const loading = useSelector(s => s.library?.auth?.loading);
  const token   = useSelector(s => s.library?.auth?.token);

  useEffect(() => {
    const hasToken = localStorage.getItem('tokenGuard');
    if (!token && hasToken) {
      dispatch(rehydrateAuthFromStorage());
    }
  }, [dispatch, token]);

  if (loading) return fallback || <LoadingSpinner />;

  const hasValidAuth = !!(token || localStorage.getItem('tokenGuard'));
  if (hasValidAuth) return <Outlet />;

  return <Navigate to={redirectTo} replace state={{ from: location }} />;
};

export const RequireGuest = ({ redirectTo = "/", fallback = null }) => {
  const dispatch = useDispatch();

  const loading = useSelector(s => s.library?.auth?.loading);
  const token   = useSelector(s => s.library?.auth?.token);

  useEffect(() => {
    const hasToken = localStorage.getItem('tokenGuard');
    if (!token && hasToken) {
      dispatch(rehydrateAuthFromStorage());
    }
  }, [dispatch, token]);

  if (loading) return fallback || <LoadingSpinner />;

  const hasValidAuth = !!(token || localStorage.getItem('tokenGuard'));
  if (hasValidAuth) return <Navigate to={redirectTo} replace />;

  return <Outlet />;
};
