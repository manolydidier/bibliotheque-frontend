// src/component/langue/languageStorage.js
//
// Contrat de persistance partagé entre TOUS les sélecteurs de langue de
// l'app (LanguageSwitcher.jsx pour le site public, DashboardLayout.jsx pour
// le backoffice...). Toujours passer par changeAppLanguage() pour changer de
// langue, sinon le choix ne survit pas à un changement de page/layout.

export const SOURCE_LANG = 'fr';
export const STORAGE_KEY = 'miradia_lang';

export function getSavedLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || SOURCE_LANG;
  } catch {
    return SOURCE_LANG;
  }
}

/**
 * Change la langue i18n ET persiste le choix, pour que tous les
 * sélecteurs de l'app (site public + backoffice) restent synchronisés.
 */
export function changeAppLanguage(i18n, lng, dispatch, languageAction) {
  i18n.changeLanguage(lng);
  if (dispatch && languageAction) dispatch(languageAction({ langue: lng }));
  try {
    if (lng === SOURCE_LANG) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, lng);
  } catch {}
}
