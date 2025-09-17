// src/api/articles.js
import axios from "axios";

/* ===================== Base ===================== */
export const DEBUG_HTTP = import.meta.env.VITE_DEBUG_HTTP === "true";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
export const api = axios.create({
  baseURL: API_BASE, // ex: http://127.0.0.1:8000/api
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/* Helpers */
const toParam = (v) => (Array.isArray(v) ? v.join(",") : v || "");
const cleanKey = (x) => {
  const s = (x ?? "").toString().trim();
  if (!s || s === "undefined" || s === "null") return null;
  return s;
};
const unwrapArticle = (payload) => {
  const p = payload ?? null;
  // backend peut répondre { data: article, meta: {...} } ou directement article
  return p?.data?.data ?? p?.data ?? p;
};

/* ===================== SHOW ===================== */
export function buildArticleShowUrl(
  idOrSlug,
  { include = [], fields = [], password, increment_view } = {}
) {
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
 * GET /articles/:idOrSlug
 * @returns {Promise<Object>} -> objet article (pas l’enveloppe)
 */
export async function fetchArticle(idOrSlug, opts = {}) {
  const key = cleanKey(idOrSlug);
  if (!key) throw new Error("idOrSlug manquant pour fetchArticle");

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

  const resp = await api.get(`/articles/${encodeURIComponent(key)}`, { params });
  return unwrapArticle(resp);
}

/**
 * POST /articles/:idOrSlug/unlock { password }
 * Renvoie l’article déverrouillé (si mot de passe OK)
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

  const resp = await api.post(
    `/articles/${encodeURIComponent(key)}/unlock`,
    { password },
    { params }
  );
  return unwrapArticle(resp);
}

/* ===================== SIMILAIRES ===================== */
/**
 * Essaie plusieurs schémas de filtre courants (Laravel) pour trouver des articles similaires
 * selon catégories/tags. Ne renvoie JAMAIS de données inventées : [] si rien.
 */
export async function fetchSimilarArticles({
  categoryIds = [],
  tagIds = [],
  excludeId,
  limit = 8,
} = {}) {
  const fields = ["id", "title", "slug", "excerpt", "published_at", "featured_image"];
  const include = ["categories", "media"];

  const attempts = [
    // 1) style "filter[...]"
    {
      params: {
        fields: fields.join(","),
        include: include.join(","),
        "filter[categories]": categoryIds.join(",") || undefined,
        "filter[tag_ids]": tagIds.join(",") || undefined,
        "filter[exclude_id]": excludeId || undefined,
        limit,
        status: "published",
      },
    },
    // 2) style simple
    {
      params: {
        fields: fields.join(","),
        include: include.join(","),
        categories: categoryIds.join(",") || undefined,
        tags: tagIds.join(",") || undefined,
        exclude_id: excludeId || undefined,
        limit,
        status: "published",
      },
    },
    // 3) style array
    {
      params: {
        fields: fields.join(","),
        include: include.join(","),
        category_ids: categoryIds,
        tag_ids: tagIds,
        exclude_id: excludeId || undefined,
        limit,
        status: "published",
      },
    },
  ];

  for (const att of attempts) {
    try {
      if (DEBUG_HTTP) console.log("[API] GET /articles (similar) params=", att.params);
      const { data } = await api.get("/articles", { params: att.params });
      const list = data?.data || data || [];
      if (Array.isArray(list) && list.length) return list;
    } catch (e) {
      if (DEBUG_HTTP) console.warn("[API] similar attempt failed:", e?.response?.status);
      // on tente la suivante
    }
  }
  return [];
}
