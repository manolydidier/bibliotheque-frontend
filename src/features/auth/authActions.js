import axios from 'axios';
import { toast } from '../../component/toast/toast';
import { loginStart, loginSuccess, loginFailure, logoutUser as logoutAction } from '../../store/slices/Slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ==== Storage keys ===========================================================
const TOKEN_KEY = 'tokenGuard';
const USER_KEY  = 'user';
const REMEMBER_EMAIL = 'remember_email';

// ✅ Helpers de stockage: session vs local selon "remember me"
const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  } catch { return null; }
};

const getActiveStorage = () => {
  try {
    if (sessionStorage.getItem(TOKEN_KEY)) return 'session';
    if (localStorage.getItem(TOKEN_KEY)) return 'local';
  } catch {}
  return null;
};

const saveSession = (token, user, { persist = false, rememberEmail = null } = {}) => {
  try {
    const target = persist ? localStorage : sessionStorage;
    const other  = persist ? sessionStorage : localStorage;

    if (token) target.setItem(TOKEN_KEY, token);
    if (user)  target.setItem(USER_KEY, JSON.stringify(user));

    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);

    if (rememberEmail) localStorage.setItem(REMEMBER_EMAIL, rememberEmail);
    else localStorage.removeItem(REMEMBER_EMAIL);
  } catch {}
};

const clearSession = () => {
  try {
    [localStorage, sessionStorage].forEach(s => {
      s.removeItem(TOKEN_KEY);
      s.removeItem(USER_KEY);
    });
    localStorage.removeItem(REMEMBER_EMAIL);
  } catch {}
};

// ==== Axios ================================================================
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Content-Type'] = 'application/json';

axios.interceptors.request.use(
  (config) => {
    const t = getToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ==== Helpers erreurs (propager status, code, errors) =======================
const handleAuthError = (error) => {
  if (error?.response) {
    const { data, status } = error.response;
    return {
      message: data?.message || 'Validation failed',
      errors: data?.errors || {},
      status,
      code: data?.code || null,
    };
  }
  return { message: error?.message || 'An error occurred', errors: {}, status: 0, code: null };
};

// ==== OTP (inchangé) =======================================================
const EMAIL_EXISTS_EP     = '/email/exists';
const EMAIL_SEND_CODE_EP  = '/email/verification/request';
const EMAIL_CHECK_CODE_EP = '/email/verification/confirm';
const emailRegexSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const checkEmailExists = async (email, langue='fr') => {
  try {
    const { data } = await axios.get(EMAIL_EXISTS_EP, { params: { email } });
    return !!data?.exists;
  } catch {
    try {
      const { data } = await axios.get('/validate-unique', {
        params: { field: 'email', value: email, lang: langue }
      });
      return data?.unique === false;
    } catch {
      return null;
    }
  }
};

export const preVerifyEmail = (email, langue='fr', intent='login') => async () => {
  if (!email || !emailRegexSimple.test(email)) {
    const msg = langue === 'fr' ? 'Adresse e-mail invalide.' : 'Invalid email address.';
    toast.error(msg, { duration: 4000, position: 'top-right' });
    throw new Error(msg);
  }
  if (intent !== 'register') {
    const exists = await checkEmailExists(email, langue);
    if (exists === false) {
      const msg = langue === 'fr' ? "Cet e-mail n'est pas reconnu." : 'This email is not recognized.';
      toast.error(msg, { duration: 5000, position: 'top-right' });
      throw new Error(msg);
    }
  }

  try {
    toast.loading(langue === 'fr' ? 'Envoi du code…' : 'Sending code…', {
      duration: 300, position: 'top-right', color: 'bg-blue-100 text-blue-800 border-blue-300', closable: true
    });
    const { data } = await axios.post(EMAIL_SEND_CODE_EP, { email, lang: langue, intent });
    toast.success(langue === 'fr' ? 'Code envoyé par e-mail.' : 'Verification code sent.', {
      duration: 3000, position: 'top-right', color: 'bg-green-100 text-green-800 border-green-300', closable: true
    });
    return data;
  } catch (error) {
    const err = (error?.response?.data?.message) || (langue === 'fr' ? "Échec d'envoi du code." : 'Failed to send code.');
    toast.error(err, { duration: 5000, position: 'top-right' });
    throw error;
  }
};

export const verifyEmailCode = (email, code, langue='fr') => async () => {
  const codeOk = typeof code === 'string' && /^[0-9]{6}$/.test(code.trim());
  if (!codeOk) {
    const msg = langue === 'fr'
      ? 'Code invalide. Entrez les 6 chiffres reçus par e-mail.'
      : 'Invalid code. Enter the 6-digit code sent by email.';
    toast.error(msg, { duration: 5000, position: 'top-right' });
    throw new Error(msg);
  }

  try {
    const { data } = await axios.post(EMAIL_CHECK_CODE_EP, { email, code: code.trim(), lang: langue });
    if (data?.verified) {
      toast.success(langue === 'fr' ? 'E-mail vérifié.' : 'Email verified.', {
        duration: 2500, position: 'top-right', color: 'bg-green-100 text-green-800 border-green-300', closable: true
      });
    } else {
      toast.error(
        (langue === 'fr' ? 'Code incorrect ou expiré.' : 'Incorrect or expired code.'),
        { duration: 5000, position: 'top-right' }
      );
    }
    return data;
  } catch (error) {
    const err = (error?.response?.data?.message) || (langue === 'fr' ? 'Vérification impossible.' : 'Verification failed.');
    toast.error(err, { duration: 5000, position: 'top-right' });
    throw error;
  }
};

// === NOUVEAUX HELPERS: challenge login & policy inscription ===============
export const checkPasswordPolicy = async (password, langue='fr') => {
  try {
    const { data } = await axios.post('/password/validate', { password, lang: langue });
    return data;
  } catch (e) {
    return { valid: false, errors: ['server'], message: (langue==='fr'?'Vérification impossible.':'Validation failed.') };
  }
};

export const challengeLoginCredentials = async (email, password, langue='fr') => {
  try {
    const { data } = await axios.post('/login/challenge', { email, password, lang: langue });
    return data; // { ok: true }
  } catch (error) {
    // Normaliser pour le front
    const err = handleAuthError(error);
    const fieldErrors = err.errors || {};
    // Rejeter avec forme exploitable
    const e = new Error(err.message || 'Challenge failed');
    e.status = err.status;
    e.code = err.code;
    e.fieldErrors = fieldErrors;
    throw e;
  }
};

// ==== AUTH ================================================================
export const loginUser = (credentials) => async (dispatch) => {
  dispatch(loginStart());
  toast.loading(credentials.langue === 'fr' ? 'Connexion en cours...' : 'Signing in...', {
    duration: 300, position: 'top-right', color: 'bg-blue-100 text-blue-800 border-blue-300', closable: true
  });

  try {
    const enriched = { ...credentials, last_login: new Date().toISOString() };
    const { data } = await axios.post('/login', enriched);

    saveSession(
      data.token,
      data.user,
      {
        persist: !!credentials.rememberMe,
        rememberEmail: credentials.rememberMe ? credentials.email : null
      }
    );

    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

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
    clearSession();
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

    saveSession(
      data.token,
      data.user,
      { persist: false, rememberEmail: null }
    );
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;

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
    clearSession();
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
  const token = getToken();
  if (!token) {
    dispatch(loginFailure('No token found'));
    return;
  }
  dispatch(loginStart());
  try {
    const { data } = await axios.get('/user');
    const user = data.user || data;

    try {
      const where = getActiveStorage() || 'local';
      const store = where === 'session' ? sessionStorage : localStorage;
      store.setItem(USER_KEY, JSON.stringify(user));
    } catch {}

    dispatch(loginSuccess({
      user,
      token,
      roles: user?.roles || data.roles || [],
      permissions: data.permissions || user?.permissions || []
    }));
    return data;
  } catch (error) {
    clearSession();
    const err = handleAuthError(error);
    dispatch(loginFailure(err.message || 'Fetch user failed'));
    throw err;
  }
};

export const logoutUser = (langue) => async (dispatch) => {
  const token = getToken();
  if (token) {
    try { await axios.post('/logout'); } catch {}
  }
  clearSession();
  delete axios.defaults.headers.common['Authorization'];
  dispatch(logoutAction());
  toast.success(langue === 'fr' ? 'Déconnexion réussie !' : 'Logout success', {
    duration: 3000, position: 'top-right', color: 'bg-green-100 text-green-800 border-green-300', closable: true
  });
};

export const checkUnique = async (field, value, ignoreId, lang = 'fr') => {
  const { data } = await axios.get('/validate-unique', {
    params: { field, value, ignore_id: ignoreId, lang }
  });
  return data;
};

// Réhydratation au démarrage (depuis sessionStorage ou localStorage)
export const rehydrateAuthFromStorage = () => async (dispatch) => {
  const token = getToken();
  if (!token) return;

  try {
    dispatch(loginStart());
    const { data } = await axios.get('/user');
    const user = data.user || data;

    try {
      const where = getActiveStorage() || 'local';
      const store = where === 'session' ? sessionStorage : localStorage;
      store.setItem(USER_KEY, JSON.stringify(user));
    } catch {}

    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    dispatch(loginSuccess({
      user,
      token,
      roles: user?.roles || data.roles || [],
      permissions: data.permissions || user?.permissions || []
    }));
  } catch {
    clearSession();
    dispatch(loginFailure('Session invalid'));
  }
};
