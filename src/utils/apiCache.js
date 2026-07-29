// src/utils/apiCache.js
//
// Cache "stale-while-revalidate" minimal basé sur sessionStorage : permet à
// une page/section déjà visitée dans cet onglet de s'afficher INSTANTANÉMENT
// (sans écran "Chargement…") pendant qu'un rafraîchissement se fait en
// tâche de fond. Utilisé par les pages publiques Miradia dont le contenu
// (sections CMS, organigramme, slides...) change rarement mais peut être
// lourd/lent à recharger à chaque navigation.

const PREFIX = "mrd_cache_";

export function readApiCache(key) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeApiCache(key, value) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota dépassé ou storage indisponible (navigation privée...) : non bloquant
  }
}
