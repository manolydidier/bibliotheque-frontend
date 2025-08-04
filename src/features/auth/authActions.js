import axios from 'axios';
import { toast } from '../../component/toast/toast';

import {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutUser as logoutAction
} from '../../store/slices/Slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Configuration globale d'Axios pour l'authentification par tokens
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Intercepteur pour ajouter automatiquement le token Bearer
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs d'authentification
// axios.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       // Token expiré ou invalide
//       localStorage.removeItem('auth_token');
//       localStorage.removeItem('user');
//       // Optionnel: rediriger vers la page de login
//       // window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );

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
  dispatch(loginStart());
  
  toast.loading(
    credentials.langue === 'fr' 
      ? 'Connexion en cours...' 
      : 'Signing in...', 
    {
      duration: 300,
      position: 'top-right',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      closable: true
    }
  );

  try {
    const response = await axios.post('/login', credentials);
    const data = response.data;
    
    // Stocker le token et les données utilisateur
    localStorage.setItem('auth_token', data.token);  
    localStorage.setItem('user', JSON.stringify(data.user)); 
    
    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    toast.success(
      credentials.langue === 'fr' 
        ? 'Connexion réussie !' 
        : 'Login success', 
      {
        duration: 3000,
        position: 'top-right',
        color: 'bg-green-100 text-green-800 border-green-300',
        closable: true
      }
    );
    return data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    const errorMessage = handleAuthError(error);
    dispatch(loginFailure(errorMessage));
    toast.error(errorMessage, {
      duration: 5000,
      position: 'top-right',
    });
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
      duration: 300,
      position: 'top-right',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      closable: true
    }
  );

  try {
    const response = await axios.post('/register', userData);
    const data = response.data;
    
    // Stocker le token et les données utilisateur
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user)); 

    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    toast.success(
      userData.langue === 'fr' 
        ? 'Inscription réussie !' 
        : 'Registration success', 
      {
        duration: 3000,
        position: 'top-right',
        color: 'bg-green-100 text-green-800 border-green-300',
        closable: true
      }
    );
    return data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    const errorMessage = handleAuthError(error);
    dispatch(loginFailure(errorMessage));
    toast.error(errorMessage, {
      duration: 5000,
      position: 'top-right',
    });
    throw error;
  }
};

export const fetchCurrentUser = () => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    dispatch(loginFailure('No token found'));
    return;
  }

  dispatch(loginStart());

  try {
    const response = await axios.get('/user');
    const data = response.data;
    
    // Mettre à jour les données utilisateur
    localStorage.setItem('user', JSON.stringify(data));
    
    dispatch(loginSuccess({
      user: data.user || data,
      token,
      roles: data.user?.roles || data.roles || [],
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
  
  if (token) {
    try {
      // Révoquer le token côté serveur
      await axios.post('/logout');
    } catch (error) {
      console.error('Logout API error:', error);
      toast.error(langue === 'fr' 
        ? 'Échec de la déconnexion côté serveur!' 
        : 'Server logout failed');
    }
  }
  
  // Nettoyer le stockage local dans tous les cas
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  dispatch(logoutAction());
  
  toast.success(
    langue === 'fr' 
      ? 'Déconnexion réussie !' 
      : 'Logout success', 
    {
      duration: 3000,
      position: 'top-right',
      color: 'bg-green-100 text-green-800 border-green-300',
      closable: true
    }
  );
};

// Fonction pour changer le mot de passe
export const updatePassword = (userId, passwordData) => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('Token d\'authentification manquant');
  }

  try {
    const response = await axios.post(`/auth/${userId}/updatepassword`, passwordData);
    const data = response.data;
    
    toast.success('Mot de passe mis à jour avec succès !', {
      duration: 3000,
      position: 'top-right',
      color: 'bg-green-100 text-green-800 border-green-300',
    });
    
    return data;
  } catch (error) {
    const errorMessage = handleAuthError(error);
    toast.error(errorMessage, {
      duration: 5000,
      position: 'top-right',
    });
    throw error;
  }
};

// Fonction pour rafraîchir le token (optionnel)
export const refreshToken = () => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  try {
    const response = await axios.post('/refresh-token');
    const data = response.data;
    
    localStorage.setItem('auth_token', data.token);
    
    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));
    
    return data;
  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    dispatch(loginFailure('Token refresh failed'));
    throw error;
  }
};