// src/features/auth/oAuthFirebaseAction.js
import { auth } from '../../firebase/firebase';  // Importer Firebase
import { GoogleAuthProvider, signInWithPopup, getIdToken } from 'firebase/auth';
import { toast } from '../../component/toast/toast';
import { loginSuccess, loginFailure } from '../../store/slices/Slice';

// Fonction pour démarrer l'authentification avec Google via Firebase
export const startGoogleOAuthFirebase = () => async (dispatch) => {
  const provider = new GoogleAuthProvider();

  try {
    // Ouvrir la fenêtre pop-up Google pour se connecter
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Obtenir le token Firebase de l'utilisateur connecté
    const idToken = await getIdToken(user);

    // Envoi du token Firebase au backend Laravel
    const res = await fetch('http://127.0.0.1:8000/api/auth/firebase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: idToken }),
    });

    const data = await res.json();

    if (res.ok) {
      // Si le token est validé par le backend
      dispatch(loginSuccess(data));
      toast.success('Connexion réussie avec Google', { duration: 3000, position: 'top-right' });
    } else {
      dispatch(loginFailure('Erreur de connexion avec Google'));
      toast.error(data.error || 'Erreur de connexion avec Google', { duration: 5000, position: 'top-right' });
    }
  } catch (error) {
    // En cas d'erreur
    dispatch(loginFailure('Échec de la connexion avec Google'));
    toast.error(error.message, { duration: 5000, position: 'top-right' });
  }
};
