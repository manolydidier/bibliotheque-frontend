import { toast } from '../../component/toast/toast';

import {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutUser as logoutAction
} from '../../store/slices/Slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Configuration des headers communs
const commonHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

// Fonction utilitaire pour gérer les requêtes API
const makeRequest = async (url, method, data = null, token = null) => {
  
  const headers = token 
    ? { ...commonHeaders, 'Authorization': `Bearer ${token}` } 
    : commonHeaders;

  const config = {
    method,
    headers,
    body: data ? JSON.stringify(data) : null
  };

  const response = await fetch(`${API_BASE_URL}${url}`, config);
  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.message || 'Une erreur est survenue');
  }

  return responseData;
};

// Fonction utilitaire pour gérer les erreurs
const handleAuthError = (error) => {
  console.error('Auth error:', error);
  
  if (error.response) {
    const { data } = error.response;
    if (data?.errors) {
      return Object.values(data.errors).flat().join('\n');
    }
    return data?.message || error.message;
  }
  return error.message || 'Une erreur est survenue';
};

export const loginUser = (credentials) => async (dispatch) => {
  
 toast.loading(
  credentials.langue === 'fr' 
    ? 'Connexion en cours...' 
    : 'Signing in...', 
  {
    duration: 300, // Mets une durée plus longue si besoin
    position: 'top-right',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    closable: true
  }
);


  try {
    const data = await makeRequest('/login', 'POST', credentials);
    
    localStorage.setItem('auth_token', data.token);  
    localStorage.setItem('user', data);   
    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    toast.success(
      credentials.langue === 'fr' 
        ? 'Connexion réussie !' 
        : 'login success', 
      {
        duration: 300, // Mets une durée plus longue si besoin
        position: 'top-right',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        closable: true
      }
    );
    return data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    const errorMessage = handleAuthError(error);
    dispatch(loginFailure(errorMessage));
    toast.error(errorMessage);
    throw error;
  }
};

export const registerUser = (userData) => async (dispatch) => {
  dispatch(loginStart());
  
  toast.loading(
      userData.langue === 'fr' 
        ? 'Enregistrement en cours...' 
        : 'Signing up...', 
      {
        duration: 300, // Mets une durée plus longue si besoin
        position: 'top-right',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        closable: true
      }
    );
  try {
    const data = await makeRequest('/register', 'POST', userData); 
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', data);
    
    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    toast.success(
      userData.langue === 'fr' 
        ? 'Inscription réussie !' 
        : 'Registration_success', 
      {
        duration: 300, // Mets une durée plus longue si besoin
        position: 'top-right',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        closable: true
      }
    );
    return data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    const errorMessage = handleAuthError(error);
    dispatch(loginFailure(errorMessage));
    toast.error(errorMessage);
    throw error;
  }
};

export const fetchCurrentUser = () => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  dispatch(loginStart());

  try {
    const data = await makeRequest('/user', 'GET', null, token);
    
    dispatch(loginSuccess({
      user: data.user,
      token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    return data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    const errorMessage = handleAuthError(error);
    dispatch(loginFailure(errorMessage));
    throw error;
  }
};

export const logoutUser = (langue) => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  try {
    await makeRequest('/logout', 'POST', null, token);  
    toast.success(
      langue === 'fr' 
        ? 'Déconnexion réussie !' 
        : 'Logout success', 
      {
        duration: 300, // Mets une durée plus longue si besoin
        position: 'top-right',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        closable: true
      }
    );
    
  } catch (error) {
    console.error('Logout API error:', error);
    toast.error(langue === 'fr' 
        ? 'Échec de la déconnexion!' 
        : 'logout_failed', );
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    dispatch(logoutAction());
    toast.success(
      langue === 'fr' 
        ? 'Déconnexion réussie !' 
        : 'Logout success', 
      {
        duration: 300, // Mets une durée plus longue si besoin
        position: 'top-right',
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        closable: true
      }
    );
  }
};