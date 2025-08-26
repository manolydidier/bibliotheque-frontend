// src/features/auth/authActions.js
import axios from 'axios';
import { toast } from '../../component/toast/toast';
import { loginStart, loginSuccess, loginFailure, logoutUser as logoutAction } from '../../store/slices/Slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

const handleAuthError = (error) => {
  if (error?.response) {
    const { data } = error.response;
    return { message: data?.message || 'Validation failed', errors: data?.errors || {} };
  }
  return { message: error?.message || 'An error occurred', errors: {} };
};

export const loginUser = (credentials) => async (dispatch) => {
  dispatch(loginStart());
  toast.loading(credentials.langue === 'fr' ? 'Connexion en cours...' : 'Signing in...', {
    duration: 300, position: 'top-right', color: 'bg-blue-100 text-blue-800 border-blue-300', closable: true
  });

  try {
    const enriched = { ...credentials, last_login: new Date().toISOString() };
    const { data } = await axios.post('/login', enriched);

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    toast.success(credentials.langue === 'fr' ? 'Connexion réussie !' : 'Login success', {
      duration: 3000, position: 'top-right', color: 'bg-green-100 text-green-800 border-green-300', closable: true
    });
    return data;

  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    const err = handleAuthError(error);
    dispatch(loginFailure(err.message || 'Login failed'));
    toast.error(err.message || (credentials.langue === 'fr' ? 'Échec de la connexion' : 'Login failed'), {
      duration: 5000, position: 'top-right'
    });
    throw err;
  }
};

export const registerUser = (userData) => async (dispatch) => {
  dispatch(loginStart());
  toast.loading(userData.langue === 'fr' ? 'Enregistrement en cours...' : 'Signing up...', {
    duration: 300, position: 'top-right', color: 'bg-blue-100 text-blue-800 border-blue-300', closable: true
  });

  const toStr = (v) => (typeof v === 'string' ? v : (v == null ? '' : String(v)));
  const payload = {
    username: toStr(userData.username).trim(),
    email: toStr(userData.email).trim(),
    password: toStr(userData.password),
    password_confirmation: toStr(userData.password_confirmation ?? userData.confirmPassword),
    first_name: toStr(userData.first_name ?? userData.firstName).trim(),
    last_name: toStr(userData.last_name ?? userData.lastName).trim(),
    acceptTerms: userData.acceptTerms ? '1' : '0',
  };

  try {
    const { data } = await axios.post('/register', payload, {
      headers: { 'Content-Type': 'application/json' },
      transformRequest: [(d) => JSON.stringify(d)],
    });

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));

    toast.success(userData.langue === 'fr' ? 'Inscription réussie !' : 'Registration success', {
      duration: 3000, position: 'top-right', color: 'bg-green-100 text-green-800 border-green-300', closable: true
    });
    return data;

  } catch (error) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    const err = handleAuthError(error);
    dispatch(loginFailure(err.message || 'Registration failed'));
    toast.error(err.message || (userData.langue === 'fr' ? "Échec de l'inscription" : 'Registration failed'), {
      duration: 5000, position: 'top-right'
    });

    const apiErrors = err.errors || {};
    const flatten = {};
    Object.keys(apiErrors).forEach((k) => {
      if (Array.isArray(apiErrors[k]) && apiErrors[k].length) flatten[k] = apiErrors[k][0];
    });

    return { error: true, payload: { errors: apiErrors, message: err.message, flatten } };
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
    const { data } = await axios.get('/user');
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
    const err = handleAuthError(error);
    dispatch(loginFailure(err.message || 'Fetch user failed'));
    throw err;
  }
};

export const logoutUser = (langue) => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      await axios.post('/logout');
    } catch (error) {
      toast.error(langue === 'fr' ? 'Échec de la déconnexion côté serveur!' : 'Server logout failed', {
        duration: 5000, position: 'top-right'
      });
    }
  }
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  dispatch(logoutAction());
  toast.success(langue === 'fr' ? 'Déconnexion réussie !' : 'Logout success', {
    duration: 3000, position: 'top-right', color: 'bg-green-100 text-green-800 border-green-300', closable: true
  });
};

// ✅ endpoint vérif unique
export const checkUnique = async (field, value, ignoreId, lang = 'fr') => {
  const { data } = await axios.get('/validate-unique', {
    params: { field, value, ignore_id: ignoreId, lang }
  });
  return data; // { unique: true/false, message?: string }
};
