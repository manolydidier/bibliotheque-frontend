// src/component/langue/LanguageSwitcher.jsx
//
// ✅ Texte statique de l'UI (menus, boutons, labels...) : géré par i18next
//    (voir src/i18n.js) — changer i18n.language suffit, chaque composant
//    qui utilise useTranslation() se met à jour tout seul.
// ✅ Contenu dynamique (BDD/API : articles, slides, sections CMS...) : traduit
//    via Google, indépendamment, par chaque composant concerné grâce au hook
//    useDynamicTranslate (voir src/hooks/useDynamicTranslate.js), qui observe
//    lui aussi i18n.language. Rien à faire ici pour ça.
// ✅ Persistance localStorage : la langue est mémorisée entre les pages.

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { language } from '../../store/slices/Slice';
import { useDispatch } from 'react-redux';
import { SOURCE_LANG, getSavedLanguage, changeAppLanguage } from './languageStorage';

const LanguageSwitcher = ({ isMobile = false, isDark = false }) => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = i18n.language || SOURCE_LANG;

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' },
  ];

  /* ── Au chargement : ré-appliquer la langue sauvegardée ── */
  useEffect(() => {
    const target = getSavedLanguage();
    if (i18n.language !== target) {
      changeAppLanguage(i18n, target, dispatch, language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Changement manuel de langue ── */
  const changeLanguage = useCallback((lng) => {
    if (lng === currentLanguage) { setIsOpen(false); return; }
    changeAppLanguage(i18n, lng, dispatch, language);
    setIsOpen(false);
  }, [currentLanguage, i18n, dispatch]);

  /* ────────── MOBILE ────────── */
  if (isMobile) {
    return (
      <div className="w-full px-4 py-3 border-t border-slate-200 dark:border-slate-700 mt-4">
        <div className="flex justify-center gap-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`
                px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                ${currentLanguage === lang.code
                  ? isDark ? 'bg-sky-500 text-white shadow-md' : 'bg-sky-600 text-white shadow-md'
                  : isDark ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}
              `}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ────────── DESKTOP ────────── */
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5
          rounded-full border text-xs font-semibold transition-all duration-200
          ${isDark
            ? 'bg-white/5 border-blue-300/40 text-blue-50 hover:bg-white/10'
            : 'bg-white/80 border-sky-400/70 text-[#0b5a82] hover:bg-sky-50'}
        `}
      >
        <FontAwesomeIcon
          icon={faGlobe}
          className={`text-[11px] ${isDark ? 'text-sky-200' : 'text-sky-500'}`}
        />
        <span>{currentLanguage.toUpperCase()}</span>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className={`
          absolute top-full right-0 mt-2 rounded-xl shadow-lg py-1 z-50 min-w-[140px] border
          ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white border-sky-100'}
        `}>
          <p className={`px-4 pt-1.5 pb-1 text-[10px] border-b
            ${isDark ? 'text-slate-500 border-slate-700' : 'text-slate-400 border-sky-50'}`}>
            🌐 Traduit par Google
          </p>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`
                block w-full px-4 py-2 text-left text-sm
                ${currentLanguage === lang.code
                  ? isDark ? 'text-sky-300 font-semibold bg-slate-800' : 'text-sky-700 font-semibold bg-sky-50'
                  : isDark ? 'text-slate-100 hover:bg-slate-800' : 'text-slate-800 hover:bg-sky-50'}
              `}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
