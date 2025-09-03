import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { rehydrateAuthFromStorage } from "../features/auth/authActions";

// Composant de chargement pendant la réhydratation
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
  
  // Version ultra-défensive pour éviter les erreurs
  const authState = useSelector((state) => {
    // console.log("État Redux complet:", state); // Debug
    
    // Essayer différentes structures possibles
    let auth = null;
    if (state.auth) {
      auth = state.auth;
    } else if (state.user) {
      auth = state.user;
    } else if (state.authentication) {
      auth = state.authentication;
    } else {
      // Si aucune structure trouvée, créer un état par défaut
      auth = {
        isAuthenticated: false,
        isLoading: false,
        user: null
      };
    }
    
    return {
      isAuthenticated: Boolean(auth.isAuthenticated),
      isLoading: Boolean(auth.isLoading),
      user: auth.user || null,
      token: auth.token || null
    };
  });
  
  const { isAuthenticated, isLoading, user, token } = authState;
  
  useEffect(() => {
    const hasToken = localStorage.getItem('tokenGuard');
    
    // Si on a un token mais pas d'authentification active
    if (!isAuthenticated && !isLoading && hasToken && !token) {
      // console.log("Lancement de la réhydratation");
      dispatch(rehydrateAuthFromStorage());
    }
  }, [dispatch, isAuthenticated, isLoading, token]);

  // Afficher le spinner pendant le chargement
  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }

  // Vérification simple : token présent = accès autorisé
  const hasValidAuth = isAuthenticated || localStorage.getItem('tokenGuard');
  
  if (hasValidAuth) {
    return <Outlet />;
  }

  // Sinon rediriger vers la page de connexion
  return <Navigate to={redirectTo} replace state={{ from: location }} />;
};

export const RequireGuest = ({ redirectTo = "/", fallback = null }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  
  // Version ultra-défensive
  const authState = useSelector((state) => {
    // Essayer différentes structures possibles
    let auth = null;
    if (state.auth) {
      auth = state.auth;
    } else if (state.user) {
      auth = state.user;
    } else if (state.authentication) {
      auth = state.authentication;
    } else {
      auth = {
        isAuthenticated: false,
        isLoading: false,
        user: null
      };
    }
    
    return {
      isAuthenticated: Boolean(auth.isAuthenticated),
      isLoading: Boolean(auth.isLoading),
      user: auth.user || null,
      token: auth.token || null
    };
  });
  
  const { isAuthenticated, isLoading, user, token } = authState;
  
  useEffect(() => {
    const hasToken = localStorage.getItem('tokenGuard');
    
    if (!isAuthenticated && !isLoading && hasToken && !token) {
      dispatch(rehydrateAuthFromStorage());
    }
  }, [dispatch]);

  // Afficher le spinner pendant le chargement
  if (isLoading) {
    return fallback || <LoadingSpinner />;
  }

  // Vérification : si token présent, rediriger
  const hasValidAuth = isAuthenticated || localStorage.getItem('tokenGuard');
  
  if (hasValidAuth) {
    return <Navigate to={redirectTo} replace />;
  }

  // Sinon permettre l'accès (utilisateur invité)
  return <Outlet />;
};