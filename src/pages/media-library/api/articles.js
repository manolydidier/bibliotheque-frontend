import axios from "axios";

/* ===================== Configuration de base ===================== */
export const DEBUG_HTTP = import.meta.env.VITE_DEBUG_HTTP === "true";
const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/* ===================== Gestion du token d'authentification ===================== */
function getToken() {
  try {
    return (
      sessionStorage.getItem("tokenGuard") ||
      localStorage.getItem("tokenGuard") ||
      null
    );
  } catch {
    return null;
  }
}

// Installation des intercepteurs pour ajouter le token aux requêtes
let _interceptorsInstalled = false;
export function installApiInterceptors() {
  if (_interceptorsInstalled) return;
  _interceptorsInstalled = true;

  api.interceptors.request.use(
    (config) => {
      const token = getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // ✅ on NE redirige PAS : on laisse le Visualiseur montrer l'écran adéquat
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      if (status === 401) {
        if (DEBUG_HTTP) console.warn("[API] 401 – non authentifié (aucune redirection auto)");
        // (optionnel) on nettoie un token invalide
        try {
          sessionStorage.removeItem("tokenGuard");
          localStorage.removeItem("tokenGuard");
        } catch {}
        return Promise.reject(error);
      }
      if (status === 403) {
        if (DEBUG_HTTP) console.warn("[API] 403 – accès restreint (laisser l'UI gérer)");
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  );
}

installApiInterceptors();

/* ===================== Utilitaires ===================== */
const toParam = (v) => (Array.isArray(v) ? v.join(",") : v || "");
const cleanKey = (x) => {
  const s = (x ?? "").toString().trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s;
};

// Extraction de l'article de la réponse (gestion des différents formats de réponse)
const unwrapArticle = (payload) => {
  const p = payload ?? null;
  return p?.data?.data ?? p?.data ?? p;
};

/* ===================== Fonctions pour les articles ===================== */

/**
 * Construction de l'URL pour récupérer un article
 */
export function buildArticleShowUrl(idOrSlug, { include = [], fields = [], password, increment_view } = {}) {
  const key = cleanKey(idOrSlug);
  if (!key) throw new Error("idOrSlug manquant pour buildArticleShowUrl");

  const params = new URLSearchParams();
  if (include?.length) params.set("include", toParam(include));
  if (fields?.length) params.set("fields", toParam(fields));
  if (password) params.set("password", password);
  if (increment_view != null) params.set("increment_view", String(Boolean(increment_view)));

  const qs = params.toString();
  return `${API_BASE}/articles/${encodeURIComponent(key)}${qs ? `?${qs}` : ""}`;
}

/**
 * Récupération d'un article spécifique
 */
export async function fetchArticle(idOrSlug, opts = {}) {
  const key = cleanKey(idOrSlug);
  if (!key) throw new Error("idOrslug manquant pour fetchArticle");

  const { include = [], fields = [], password, increment_view } = opts;
  const params = {};
  if (include?.length) params.include = toParam(include);
  if (fields?.length) params.fields = toParam(fields);
  if (password) params.password = password;
  if (increment_view != null) params.increment_view = Boolean(increment_view);

  if (DEBUG_HTTP) {
    const logParams = { ...params, ...(params.password ? { password: "********" } : {}) };
    console.log("[API] GET /articles/:id", key, logParams);
  }

  try {
    const resp = await api.get(`/articles/${encodeURIComponent(key)}`, {
      params,
      headers: { "Cache-Control": "no-store" },
    });
    console.log(resp);
    
    return unwrapArticle(resp);
  } catch (error) {
    if (error.response?.status === 403) {
      // Article verrouillé - on propage l'erreur avec les détails
      throw {
        ...error,
        locked: true,
        visibility: error.response.data?.visibility,
        code: error.response.data?.code
      };
    }
    throw error;
  }
}

/**
 * Déverrouillage d'un article protégé par mot de passe
 */
export async function unlockArticle(idOrSlug, password, opts = {}) {
  const key = cleanKey(idOrSlug);
  if (!key) throw new Error("idOrSlug manquant pour unlockArticle");
  if (!password) throw new Error("password manquant pour unlockArticle");

  const { include = [], fields = [] } = opts;
  const params = {};
  if (include?.length) params.include = toParam(include);
  if (fields?.length) params.fields = toParam(fields);

  if (DEBUG_HTTP) console.log("[API] POST /articles/:id/unlock", key, { params });

  try {
    const resp = await api.post(
      `/articles/${encodeURIComponent(key)}/unlock`,
      { password },
      { params }
    );
    return unwrapArticle(resp);
  } catch (error) {
    if (error.response?.status === 403) {
      // Mot de passe incorrect
      throw {
        ...error,
        incorrectPassword: true,
        message: error.response.data?.message || "Mot de passe incorrect"
      };
    }
    throw error;
  }
}

/**
 * Récupération des articles similaires
 */
export async function fetchSimilarArticles({
  categoryIds = [],
  tagIds = [],
  excludeId,
  limit = 8,
} = {}) {
  const fields = ["id", "title", "slug", "excerpt", "published_at", "featured_image", "visibility"];
  const include = ["categories", "media"];

  // Essayer différents formats de paramètres pour compatibilité
  const attempts = [
    {
      params: {
        fields: fields.join(","),
        include: include.join(","),
        "filter[categories]": categoryIds.join(",") || undefined,
        "filter[tag_ids]": tagIds.join(",") || undefined,
        "filter[exclude_id]": excludeId || undefined,
        per_page: limit,
        status: "published",
      },
    },
    {
      params: {
        fields: fields.join(","),
        include: include.join(","),
        category_ids: categoryIds.join(",") || undefined,
        tag_ids: tagIds.join(",") || undefined,
        exclude_id: excludeId || undefined,
        per_page: limit,
        status: "published",
      },
    }
  ];

  for (const att of attempts) {
    try {
      if (DEBUG_HTTP) console.log("[API] GET /articles (similar) params=", att.params);
      const response = await api.get("/articles", { params: att.params });
      
      // Le backend renvoie les données dans data.data pour les listes paginées
      const list = response.data?.data || [];
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {
      if (DEBUG_HTTP) console.warn("[API] similar attempt failed:", e?.response?.status);
    }
  }
  return [];
}

/**
 * Récupération du résumé des notes
 */
export async function fetchRatingsSummary(articleId) {
  try {
    const response = await api.get(`/articles/${articleId}/ratings`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération des notes:", error);
    throw error;
  }
}