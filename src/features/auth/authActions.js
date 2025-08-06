import axios from 'axios';
import { toast } from '../../component/toast/toast';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutUser as logoutAction
} from '../../store/slices/Slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Intercepteur pour ajouter le token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const handleAuthError = (error) => {
  console.error('Auth error:', error);
  
  if (error.response) {
    const { data } = error.response;
    if (data?.errors) {
      return { errors: data.errors, message: data.message || 'Validation failed' };
    }
    return { message: data?.message || error.message };
  }
  return { message: error.message || 'An error occurred' };
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
    // Ajout de la date actuelle au format ISO
    const enrichedCredentials = {
      ...credentials,
      last_login: new Date().toISOString()
    };

    const response = await axios.post('/login', enrichedCredentials);
    const data = response.data;
    
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
    const errorData = handleAuthError(error);
    dispatch(loginFailure(errorData.message || 'Login failed'));
    
    toast.error(
      errorData.message || 
      (credentials.langue === 'fr' ? 'Échec de la connexion' : 'Login failed'),
      {
        duration: 5000,
        position: 'top-right'
      }
    );
    
    throw errorData;
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
    const errorData = handleAuthError(error);
    dispatch(loginFailure(errorData.message || 'Registration failed'));
    
    toast.error(
      errorData.message || 
      (userData.langue === 'fr' ? 'Échec de l\'inscription' : 'Registration failed'),
      {
        duration: 5000,
        position: 'top-right'
      }
    );
    
    throw errorData;
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
      await axios.post('/logout');
    } catch (error) {
      console.error('Logout API error:', error);
      toast.error(
        langue === 'fr' 
          ? 'Échec de la déconnexion côté serveur!' 
          : 'Server logout failed',
        {
          duration: 5000,
          position: 'top-right'
        }
      );
    }
  }
  
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