// src/utils/idbCache.js
//
// Cache stale-while-revalidate pour les GROS payloads (sections CMS avec
// images en base64, plusieurs Mo) : sessionStorage a un quota bien trop
// petit (~5 Mo au total, PARTAGÉ entre toutes les pages du site) pour y
// stocker ce genre de contenu de façon fiable. IndexedDB a un quota
// largement supérieur (dizaines/centaines de Mo) et ne rentre pas en
// conflit avec les petits caches sessionStorage (voir apiCache.js).
//
// Lecture asynchrone (contrairement à apiCache.js) : la page démarre en
// "Chargement…" puis bascule sur le contenu en cache en quelques
// millisecondes si présent — quasi instantané, sans le risque de
// dépassement de quota de sessionStorage.

const DB_NAME = "mrd_cache_db";
const STORE_NAME = "sections";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponible"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getIdbCache(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setIdbCache(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // pas bloquant : au pire, pas de cache pour cette fois
  }
}
