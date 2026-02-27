// src/components/langue/LanguageSwitcher.jsx
//
// ✅ Toujours afficher en FR au chargement, puis traduire après
// ✅ MutationObserver robuste : capture les données chargées depuis la BDD
// ✅ Persistance localStorage : la langue est mémorisée entre les pages
// ✅ translate.googleapis.com : gratuit, sans clé, sans popup

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGlobe, faChevronDown, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { language } from '../../store/slices/Slice';
import { useDispatch } from 'react-redux';

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const SOURCE_LANG       = 'fr';
const STORAGE_KEY       = 'miradia_lang';
const OBSERVER_DEBOUNCE = 400;   // ms – attendre la fin du burst de mutations
const RETRY_DELAY       = 800;   // ms – 2e passe pour les données lentes (BDD)
const RETRY_COUNT       = 5;     // nombre de re-scans après la 1ère traduction

/* ═══════════════════════════════════════════════
   ÉTAT GLOBAL DU MOTEUR
═══════════════════════════════════════════════ */
let activeTargetLang  = null;
const originalCache   = new Map();   // TextNode → texte FR original
const translatedCache = new Map();   // "texte|lang" → traduction
let domObserver       = null;
let pendingNodes      = [];
let debounceTimer     = null;
let retryTimers       = [];

/* ═══════════════════════════════════════════════
   COLLECTE DES NOEUDS TEXTE
   – tout document.body
   – sauf nav, script, style, .notranslate
═══════════════════════════════════════════════ */
const SKIP_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','TEXTAREA','IFRAME']);
const SKIP_SEL  = 'nav, [data-notranslate], .notranslate';

function collectTextNodes(root) {
  const nodes = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p)                              return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(p.tagName))        return NodeFilter.FILTER_REJECT;
      if (p.closest(SKIP_SEL))            return NodeFilter.FILTER_REJECT;
      if (node.textContent.trim() === '') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

/* ═══════════════════════════════════════════════
   API GOOGLE TRANSLATE (non-officielle, gratuite)
═══════════════════════════════════════════════ */
async function gtranslate(text, from, to) {
  const key = `${text}|${to}`;
  if (translatedCache.has(key)) return translatedCache.get(key);
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res  = await fetch(url);
    const json = await res.json();
    const out  = json[0]?.map((s) => s?.[0] ?? '').join('') ?? text;
    translatedCache.set(key, out);
    return out;
  } catch {
    return text;
  }
}

/* ═══════════════════════════════════════════════
   TRADUCTION D'UN LOT DE NOEUDS
═══════════════════════════════════════════════ */
async function translateNodes(nodes, from, to) {
  // Filtrer les nœuds déjà traduits dans cette session
  const toProcess = nodes.filter((n) => {
    if (!n.parentElement) return false;
    const orig = originalCache.get(n) ?? n.textContent;
    // Si le texte actuel est déjà la traduction → ne pas retraduire
    const cached = translatedCache.get(`${orig}|${to}`);
    return cached === undefined || n.textContent === orig;
  });

  if (!toProcess.length) return;

  // Sauvegarder les originaux
  toProcess.forEach((n) => {
    if (!originalCache.has(n)) originalCache.set(n, n.textContent);
  });

  const BATCH = 15;
  for (let i = 0; i < toProcess.length; i += BATCH) {
    await Promise.all(
      toProcess.slice(i, i + BATCH).map(async (node) => {
        const src = originalCache.get(node) ?? node.textContent;
        const out = await gtranslate(src, from, to);
        if (node.parentElement) node.textContent = out;
      })
    );
  }
}

/* ═══════════════════════════════════════════════
   RESTAURATION FR
═══════════════════════════════════════════════ */
function restoreOriginals() {
  originalCache.forEach((orig, node) => {
    if (node.parentElement) node.textContent = orig;
  });
}

/* ═══════════════════════════════════════════════
   MUTATION OBSERVER
   Capture : éléments animés, données BDD chargées
   en async, modales, infinite scroll...
═══════════════════════════════════════════════ */
function startObserver(from, to) {
  stopObserver();

  domObserver = new MutationObserver((mutations) => {
    const fresh = [];

    mutations.forEach((mut) => {
      mut.addedNodes.forEach((added) => {
        if (added.nodeType === Node.ELEMENT_NODE && !added.matches?.(SKIP_SEL)) {
          fresh.push(...collectTextNodes(added));
        } else if (
          added.nodeType === Node.TEXT_NODE &&
          added.textContent.trim() &&
          !added.parentElement?.closest(SKIP_SEL)
        ) {
          fresh.push(added);
        }
      });

      // Texte remplacé directement (ex: données remplacées par React/Redux)
      if (
        mut.type === 'characterData' &&
        mut.target.textContent.trim() &&
        !mut.target.parentElement?.closest(SKIP_SEL)
      ) {
        const node = mut.target;
        const prev = originalCache.get(node);
        // Si le texte a changé depuis l'original connu → c'est une nouvelle donnée BDD
        if (!prev || prev !== node.textContent) {
          // Mémoriser ce nouveau texte comme original
          originalCache.set(node, node.textContent);
          fresh.push(node);
        }
      }
    });

    if (!fresh.length) return;

    // Dédoublonner
    const unique = [...new Set(fresh)];
    pendingNodes.push(...unique);

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!activeTargetLang || activeTargetLang === from) return;
      const batch = [...pendingNodes];
      pendingNodes = [];
      await translateNodes(batch, from, to);
    }, OBSERVER_DEBOUNCE);
  });

  domObserver.observe(document.body, {
    childList:     true,
    subtree:       true,
    characterData: true,
  });
}

function stopObserver() {
  domObserver?.disconnect();
  domObserver = null;
  clearTimeout(debounceTimer);
  retryTimers.forEach(clearTimeout);
  retryTimers = [];
  pendingNodes = [];
}

/* ═══════════════════════════════════════════════
   RE-SCANS DIFFÉRÉS
   Pour les données BDD qui arrivent lentement
   (ex: fetch après montage, pagination, Redux async)
═══════════════════════════════════════════════ */
function scheduleRetries(from, to) {
  retryTimers.forEach(clearTimeout);
  retryTimers = [];

  for (let i = 1; i <= RETRY_COUNT; i++) {
    const t = setTimeout(async () => {
      if (activeTargetLang !== to) return;
      // Re-scanner tout le body pour attraper ce qui aurait été raté
      const nodes = collectTextNodes(document.body);
      // Ne traduire que les nœuds dont le texte actuel = texte FR (pas encore traduit)
      const untranslated = nodes.filter((n) => {
        const orig = originalCache.get(n);
        // Pas dans le cache → nouveau nœud avec données BDD
        if (!orig) return true;
        // Dans le cache mais texte actuel = original → pas encore traduit
        return n.textContent === orig;
      });
      if (untranslated.length) {
        await translateNodes(untranslated, from, to);
      }
    }, RETRY_DELAY * i);   // 800ms, 1600ms, 2400ms, 3200ms, 4000ms
    retryTimers.push(t);
  }
}

/* ═══════════════════════════════════════════════
   TRADUCTION COMPLÈTE DE LA PAGE
═══════════════════════════════════════════════ */
async function translatePage(targetLang, onStart, onEnd) {
  activeTargetLang = targetLang;

  if (targetLang === SOURCE_LANG) {
    stopObserver();
    restoreOriginals();
    localStorage.removeItem(STORAGE_KEY);
    onEnd?.();
    return;
  }

  onStart?.();
  localStorage.setItem(STORAGE_KEY, targetLang);

  // 1. Traduire tout ce qui est visible maintenant
  const nodes = collectTextNodes(document.body);
  await translateNodes(nodes, SOURCE_LANG, targetLang);

  // 2. Observer les futurs changements DOM (animations, modales...)
  startObserver(SOURCE_LANG, targetLang);

  // 3. Re-scans pour les données BDD chargées en async
  scheduleRetries(SOURCE_LANG, targetLang);

  onEnd?.();
}

/* ═══════════════════════════════════════════════
   COMPOSANT REACT
═══════════════════════════════════════════════ */
const LanguageSwitcher = ({ isMobile = false, isDark = false }) => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const [isOpen,      setIsOpen]      = useState(false);
  const [translating, setTranslating] = useState(false);
  const currentLanguage = i18n.language || SOURCE_LANG;

  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English'  },
  ];

  /* ── Au chargement :
       1. Forcer l'affichage FR d'abord
       2. Attendre que le DOM + les données initiales soient prêts
       3. Appliquer la traduction sauvegardée ── */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    // Pas de langue sauvegardée → rester en FR, rien à faire
    if (!saved || saved === SOURCE_LANG) {
      // S'assurer que i18n est bien sur FR
      if (i18n.language !== SOURCE_LANG) {
        i18n.changeLanguage(SOURCE_LANG);
        dispatch(language({ langue: SOURCE_LANG }));
      }
      return;
    }

    // Langue sauvegardée différente de FR :
    // → afficher d'abord le contenu en FR (état naturel du DOM)
    // → puis traduire après que tout soit rendu + données chargées
    i18n.changeLanguage(saved);
    dispatch(language({ langue: saved }));

    // Délai : laisser React rendre la page + les premiers fetch BDD se terminer
    const timer = setTimeout(() => {
      translatePage(saved, () => setTranslating(true), () => setTranslating(false));
    }, 500);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nettoyage
  useEffect(() => () => stopObserver(), []);

  /* ── Changement manuel de langue ── */
  const changeLanguage = useCallback(async (lng) => {
    if (lng === currentLanguage) { setIsOpen(false); return; }

    if (typeof i18n.changeLanguage === 'function') {
      i18n.changeLanguage(lng);
      dispatch(language({ langue: lng }));
    }
    setIsOpen(false);

    await translatePage(
      lng,
      () => setTranslating(true),
      () => setTranslating(false),
    );
  }, [currentLanguage, i18n, dispatch]);

  /* ────────── MOBILE ────────── */
  if (isMobile) {
    return (
      <div className="w-full px-4 py-3 border-t border-slate-200 dark:border-slate-700 mt-4">
        {translating && (
          <p className={`text-center text-xs mb-2 flex items-center justify-center gap-1.5
            ${isDark ? 'text-sky-300' : 'text-sky-500'}`}>
            <FontAwesomeIcon icon={faSpinner} spin />
            Traduction en cours…
          </p>
        )}
        <div className="flex justify-center gap-4">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              disabled={translating}
              className={`
                px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200
                ${translating ? 'opacity-50 cursor-wait' : ''}
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
        disabled={translating}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5
          rounded-full border text-xs font-semibold transition-all duration-200
          ${translating ? 'opacity-60 cursor-wait' : ''}
          ${isDark
            ? 'bg-white/5 border-blue-300/40 text-blue-50 hover:bg-white/10'
            : 'bg-white/80 border-sky-400/70 text-[#0b5a82] hover:bg-sky-50'}
        `}
      >
        <FontAwesomeIcon
          icon={translating ? faSpinner : faGlobe}
          spin={translating}
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