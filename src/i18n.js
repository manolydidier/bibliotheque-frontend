import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {
          // Main menu
          "home": "Home",
          "platform": "Platform",
          "genre": "Genre",
          "about": "About",

          // Platform submenu
          "summary": "Summary",
          "video": "Video",
          "audio": "Audio",
          "podcast": "Podcast",

          // Genre submenu
          "playdoier": "Playdoier",
          "fundraising": "Fundraising",
          "technical": "Technical",

          // About submenu
          "structure": "Structure",
          "goals": "Goals",
          "members": "Members",
          "contact": "Contact",

          // User section
          "search": "Search",
          "profile": "Profile",
          "settings": "Settings",
          "notifications": "Notifications",
          "logout": "Logout",

          // Auth
          "login": "Login",
          "signup": "Sign Up",
          "welcome_back": "Welcome back",
          "login_to_account": "Login to your account",
          "create_account": "Create your account",
          "join_community": "Join our community now",
          "email": "Email address",
          "password": "Password",
          "remember_me": "Remember me",
          "forgot_password": "Forgot password?",
          "no_account": "Don't have an account?",
          "have_account": "Already have an account?",
          "first_name": "First name",
          "last_name": "Last name",
          "to_connect": "To connect",
          "confirm_password": "Confirm password",
          "accept_terms": "I accept the terms and conditions",
          "login_with": "Or login with",
          "signup_with": "Or sign up with",
          "password_strength": "Password strength",
          "continue_with_google": "Continue with Google",
          "connect": "Connect",
          "register": "Register",

          // Auth errors
          "required": "This field is required",
          "invalidEmail": "Invalid email",
          "passwordMinLength": "Minimum 8 characters",
          "passwordMismatch": "Passwords don't match",
          "an_error_has_occurred": "An error has occurred",
          "incorrect_credentials": "Incorrect credentials",
          "failed_to_register": "Failed to register",
          "generic": "An error occurred",
          "invalid_credentials": "Invalid credentials",
          "registration_failed": "Registration failed",
          "invalid_session": "Invalid session",
          "logout_failed": "Logout failed",
          "email_required": "Email is required",
          "password_required": "Password is required",
          "email_invalid": "Invalid email",
          "password_too_short": "Password must be at least 8 characters",
          "login_success": "Login successful!",
          "registration_success": "Registration successful!",
          "logout_success": "Logout successful",

          // Auth messages
          "loading": "Loading...",

          // Language
          "language": "Language"
        }
      },
      fr: {
        translation: {
          // Menu principal
          "home": "Accueil",
          "platform": "Plateforme",
          "genre": "Genre",
          "about": "À propos",

          // Sous-menu Plateforme
          "summary": "Résumé",
          "video": "Vidéo",
          "audio": "Audio",
          "podcast": "Podcast",

          // Sous-menu Genre
          "playdoier": "Playdoier",
          "fundraising": "Fundraising",
          "technical": "Technique",

          // Sous-menu À propos
          "structure": "Structure",
          "goals": "Objectifs",
          "members": "Membres",
          "contact": "Contact",

          // Section utilisateur
          "search": "Rechercher",
          "profile": "Profil",
          "settings": "Paramètres",
          "notifications": "Notifications",
          "logout": "Déconnexion",

          // Authentification
          "login": "Connexion",
          "signup": "Inscription",
          "welcome_back": "Content de vous revoir",
          "login_to_account": "Connectez-vous à votre compte",
          "create_account": "Créez votre compte",
          "join_community": "Rejoignez notre communauté dès maintenant",
          "email": "Adresse email",
          "password": "Mot de passe",
          "remember_me": "Se souvenir de moi",
          "forgot_password": "Mot de passe oublié ?",
          "no_account": "Pas encore de compte ?",
          "have_account": "Déjà un compte ?",
          "first_name": "Prénom",
          "last_name": "Nom",
          "to_connect": "Se connecter",
          "confirm_password": "Confirmez le mot de passe",
          "accept_terms": "J'accepte les conditions d'utilisation",
          "login_with": "Ou connectez-vous avec",
          "signup_with": "Ou inscrivez-vous avec",
          "password_strength": "Force du mot de passe",
          "continue_with_google": "Continuer avec Google",
          "connect": "Se connecter",
          "register": "S'inscrire",

          // Auth errors
          "required": "Ce champ est obligatoire",
          "invalidEmail": "Email invalide",
          "passwordMinLength": "8 caractères minimum",
          "passwordMismatch": "Les mots de passe ne correspondent pas",
          "an_error_has_occurred": "Une erreur est survenue",
          "incorrect_credentials": "Identifiants incorrects",
          "failed_to_register": "Échec de l'inscription",
          "generic": "Une erreur est survenue",
          "invalid_credentials": "Identifiants incorrects",
          "registration_failed": "Échec de l'inscription",
          "invalid_session": "Session invalide",
          "logout_failed": "Échec de la déconnexion",
          "email_required": "L'email est requis",
          "password_required": "Le mot de passe est requis",
          "email_invalid": "Email invalide",
          "password_too_short": "Le mot de passe doit contenir au moins 8 caractères",
          "login_success": "Connexion réussie !",
          "registration_success": "Inscription réussie !",
          "logout_success": "Déconnexion réussie",

          // Auth messages
          "loading": "Chargement en cours...",

          // Langue
          "language": "Langue"
        }
      }
    },
    lng: "fr", // Langue par défaut
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
