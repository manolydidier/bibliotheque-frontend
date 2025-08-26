// src/features/auth/oauthActions.js
import { toast } from '../../component/toast/toast';
import { loginSuccess, loginFailure } from '../../store/slices/Slice';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''; // ex: http://127.0.0.1:8000/api
const API_ORIGIN = (() => {
  try { return new URL(API_BASE_URL).origin; } catch { return window.location.origin; }
})();
const FRONTEND_ORIGIN = window.location.origin;

/** Ouvre une popup centrée */
const openPopup = (url, name = 'oauth-google', w = 520, h = 640) => {
  const dualLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualTop  = window.screenTop  ?? window.screenY ?? 0;
  const width  = window.innerWidth  || document.documentElement.clientWidth  || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = dualLeft + (width - w) / 2;
  const top  = dualTop  + (height - h) / 2;
  const features = [
    'scrollbars=yes','resizable=yes',`width=${w}`,`height=${h}`,`top=${top}`,`left=${left}`
  ].join(',');
  return window.open(url, name, features);
};

/**
 * Lance l'OAuth Google
 * - GET /oauth/google/url → URL vers Google
 * - Ouvre popup → /oauth/google/callback renvoie postMessage({ source:'google-oauth', data })
 */
export const startGoogleOAuth = (langue = 'fr') => async (dispatch) => {
  // Pas de dispatch(loginStart) ici → n’enclenche pas le loader global ni le “blocage UI”
  toast.loading(langue === 'fr' ? 'Ouverture de Google...' : 'Opening Google...', {
    duration: 800, position: 'top-right'
  });

  // 1) récupère l’URL Google
  let redirectUrl = '';
  try {
    const resp = await fetch(`${API_BASE_URL}/oauth/google/url`, { credentials: 'omit' });
    console.log(resp);

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    console.log(json);
    
    redirectUrl = json?.url;
    if (!redirectUrl) throw new Error('Missing redirect url');
    
  } catch (e) {
    dispatch(loginFailure('OAuth bootstrap failed'));
    toast.error(
      langue === 'fr'
        ? 'Impossible d’ouvrir Google (endpoint /oauth/google/url)'
        : 'Cannot start Google OAuth',
      { duration: 5000, position: 'top-right' }
    );
    return { error: true, message: 'bootstrap_failed' };
  }

  // 2) ouvre la popup (fallback: plein écran)
  let popup;
  try {
    popup = openPopup(redirectUrl);
    if (!popup) { window.location.href = redirectUrl; return; }
  } catch { window.location.href = redirectUrl; return; }

  // 3) écoute du postMessage depuis le callback
  const allowedOrigins = new Set([API_ORIGIN, FRONTEND_ORIGIN]);

  try {
    const result = await new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timeoutMs = 60_000;

      const onMessage = (event) => {
        if (!event?.origin || !allowedOrigins.has(event.origin)) return;
        const payload = event.data || {};

        if (payload.source === 'google-oauth' && payload.data) {
          cleanup();
          resolve(payload.data);
        } else if (payload.source === 'google-oauth' && payload.error) {
          cleanup();
          reject({ message: String(payload.error) });
        }
      };

      const tick = setInterval(() => {
        if (popup.closed) { clearInterval(tick); window.removeEventListener('message', onMessage); reject({ message: 'Popup fermée' }); }
        else if (Date.now() - startedAt > timeoutMs) { clearInterval(tick); window.removeEventListener('message', onMessage); try { popup.close(); } catch {} reject({ message: 'Timeout OAuth' }); }
      }, 400);

      const cleanup = () => { try { clearInterval(tick); window.removeEventListener('message', onMessage); popup.close(); } catch {} };
      window.addEventListener('message', onMessage);
    });

    // 4) succès → stock + Redux
    if (result?.token && result?.user) {
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      dispatch(loginSuccess({
        user: result.user,
        token: result.token,
        roles: result.roles || result.user?.roles || [],
        permissions: result.permissions || result.user?.permissions || []
      }));
      toast.success(
        langue === 'fr' ? 'Connexion Google réussie !' : 'Signed in with Google',
        { duration: 3000, position: 'top-right' }
      );
      return result;
    }

    dispatch(loginFailure('OAuth: payload invalide'));
    toast.error(
      langue === 'fr' ? 'Réponse OAuth invalide' : 'Invalid OAuth response',
      { duration: 5000, position: 'top-right' }
    );
    return { error: true, message: 'invalid_payload' };
  } catch (e) {
    const message = e?.message || (langue === 'fr' ? 'Échec de la connexion Google' : 'Google sign-in failed');
    dispatch(loginFailure(message));
    toast.error(message, { duration: 5000, position: 'top-right' });
    return { error: true, message };
  }
};
