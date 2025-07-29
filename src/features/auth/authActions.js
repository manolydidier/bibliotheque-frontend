import { loginStart, loginSuccess, loginFailure } from '../../store/slices/Slice';

// Configuration de base de l'API
const API_BASE_URL = 'http://127.0.0.1:8000/api';
const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue';

/**
 * Action pour la connexion utilisateur
 */
export const loginUser = (credentials) => async (dispatch) => {
  dispatch(loginStart());
  console.log(Credential);  
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Identifiants incorrects');
    }

    // Stockage du token dans le localStorage
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
      console.log('Token stored:', data.token);
    }

    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    dispatch(loginFailure(error.message || DEFAULT_ERROR_MESSAGE));
    throw error;
  }
};

/**
 * Action pour l'inscription utilisateur
 */
export const registerUser = (userData) => async (dispatch) => {
  dispatch(loginStart());
  
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Gestion spécifique des erreurs de validation Laravel
      if (data.errors) {
        const errorMessages = Object.values(data.errors).flat();
        throw new Error(errorMessages.join('\n'));
      }
      throw new Error(data.message || "Échec de l'inscription");
    }

    // Stockage du token après inscription
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }

    dispatch(loginSuccess({
      user: data.user,
      token: data.token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    dispatch(loginFailure(error.message || DEFAULT_ERROR_MESSAGE));
    throw error;
  }
};

/**
 * Action pour récupérer l'utilisateur connecté
 */
export const fetchCurrentUser = () => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE_URL}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Session invalide');
    }

    dispatch(loginSuccess({
      user: data.user,
      token,
      roles: data.user?.roles || [],
      permissions: data.permissions || data.user?.permissions || []
    }));
    
    return data;
  } catch (error) {
    console.error('Fetch user error:', error);
    localStorage.removeItem('auth_token');
    dispatch(loginFailure(error.message || DEFAULT_ERROR_MESSAGE));
    throw error;
  }
};

/**
 * Action pour la déconnexion
 */
export const logoutUser = () => async (dispatch) => {
  const token = localStorage.getItem('auth_token');
  
  try {
    await fetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('auth_token');
    dispatch({ type: 'LOGOUT' });
  }
};

export default {
  loginUser,
  registerUser,
  fetchCurrentUser,
  logoutUser
};