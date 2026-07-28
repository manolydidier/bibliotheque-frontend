// src/utils/dynamicTranslate.js
//
// Moteur de traduction pour le CONTENU DYNAMIQUE (BDD/API : articles, slides,
// sections CMS...) — indépendant d'i18next, qui lui gère déjà tout le texte
// statique de l'interface (menus, boutons, labels).
//
// Utilise translate.googleapis.com (API "gtx" non-officielle, gratuite, sans clé).
// Ne traduit QUE la portion de DOM qu'on lui donne explicitement (un article,
// un slide, une section CMS) — jamais tout document.body — pour ne jamais
// entrer en conflit avec le texte déjà traduit par i18next.

export const SOURCE_LANG = 'fr';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'IFRAME']);
const DEFAULT_SKIP_SEL = '[data-notranslate], .notranslate';

// Caches partagés (globaux) : sûrs à partager entre plusieurs zones, une
// même phrase FR se traduit toujours pareil.
const translatedCache = new Map();   // "texte|lang" -> traduction
const originalCache = new WeakMap(); // TextNode -> texte FR original

function collectTextNodes(root, skipSelector = DEFAULT_SKIP_SEL) {
  if (!root) return [];
  const doc = root.ownerDocument || document;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (SKIP_TAGS.has(p.tagName)) return NodeFilter.FILTER_REJECT;
      if (skipSelector && p.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  return nodes;
}

async function gtranslate(text, from, to) {
  const key = `${text}|${to}`;
  if (translatedCache.has(key)) return translatedCache.get(key);
  try {
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();
    const out = json[0]?.map((s) => s?.[0] ?? '').join('') ?? text;
    translatedCache.set(key, out);
    return out;
  } catch {
    return text;
  }
}

async function translateNodes(nodes, from, to) {
  const toProcess = nodes.filter((n) => {
    if (!n.parentElement) return false;
    const orig = originalCache.get(n) ?? n.textContent;
    // Ne retraduit pas un noeud déjà traduit dans cet état (évite les boucles
    // avec le MutationObserver qui voit notre propre écriture).
    return n.textContent === orig;
  });
  if (!toProcess.length) return;

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

function restoreOriginals(root, skipSelector = DEFAULT_SKIP_SEL) {
  collectTextNodes(root, skipSelector).forEach((node) => {
    const orig = originalCache.get(node);
    if (orig !== undefined) node.textContent = orig;
  });
}

/**
 * Pré-traduit `root` vers `targetLang` en arrière-plan SANS toucher au DOM —
 * remplit juste le cache. Objectif : quand l'utilisateur clique sur le
 * sélecteur de langue, la traduction est déjà en cache => application
 * instantanée (plus d'appel réseau à ce moment-là).
 */
export async function prewarmTranslation(root, targetLang, skipSelector = DEFAULT_SKIP_SEL) {
  if (!root || targetLang === SOURCE_LANG) return;

  const nodes = collectTextNodes(root, skipSelector);
  const texts = new Set();
  nodes.forEach((n) => {
    const orig = originalCache.get(n) ?? n.textContent;
    if (orig && orig.trim()) texts.add(orig);
  });

  const list = [...texts];
  const BATCH = 15;
  for (let i = 0; i < list.length; i += BATCH) {
    await Promise.all(list.slice(i, i + BATCH).map((t) => gtranslate(t, SOURCE_LANG, targetLang)));
  }
}

/** Traduit (ou restaure si targetLang === SOURCE_LANG) tout le texte dans `root`. */
export async function translateSubtree(root, targetLang, skipSelector = DEFAULT_SKIP_SEL) {
  if (!root) return;
  if (targetLang === SOURCE_LANG) {
    restoreOriginals(root, skipSelector);
    return;
  }
  const nodes = collectTextNodes(root, skipSelector);
  await translateNodes(nodes, SOURCE_LANG, targetLang);
}

/**
 * Observe `root` pour traduire automatiquement le texte qui arrive après coup
 * (fetch API après montage, pagination, contenu async). Retourne une fonction
 * de nettoyage (disconnect).
 */
export function observeSubtree(root, getTargetLang, skipSelector = DEFAULT_SKIP_SEL, debounceMs = 400) {
  if (!root) return () => {};
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || window;
  if (!win?.MutationObserver) return () => {};

  let pending = [];
  let timer = null;

  const observer = new win.MutationObserver((mutations) => {
    const fresh = [];
    mutations.forEach((mut) => {
      mut.addedNodes.forEach((added) => {
        if (added.nodeType === 1) {
          if (skipSelector && added.matches?.(skipSelector)) return;
          fresh.push(...collectTextNodes(added, skipSelector));
        } else if (added.nodeType === 3 && added.textContent.trim()) {
          fresh.push(added);
        }
      });
      if (mut.type === 'characterData' && mut.target.textContent.trim()) {
        fresh.push(mut.target);
      }
    });
    if (!fresh.length) return;

    pending.push(...new Set(fresh));
    clearTimeout(timer);
    timer = setTimeout(() => {
      const targetLang = getTargetLang();
      const batch = [...new Set(pending)];
      pending = [];
      if (targetLang === SOURCE_LANG) return;
      translateNodes(batch, SOURCE_LANG, targetLang);
    }, debounceMs);
  });

  observer.observe(root, { childList: true, subtree: true, characterData: true });
  return () => {
    observer.disconnect();
    clearTimeout(timer);
  };
}
