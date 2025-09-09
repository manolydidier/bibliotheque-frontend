// src/api/articles.js
import axios from "axios";

/* ===================== Base ===================== */
export const DEBUG_HTTP = import.meta.env.VITE_DEBUG_HTTP === "true";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
const api = axios.create({
  baseURL: API_BASE,
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

/* ===================== SHOW ===================== */
export function buildArticleShowUrl(idOrSlug, { include = [], fields = [] } = {}) {
  const key = cleanKey(idOrSlug);
  if (!key) throw new Error("idOrSlug manquant pour buildArticleShowUrl");
  const params = new URLSearchParams();
  if (include?.length) params.set("include", toParam(include));
  if (fields?.length) params.set("fields", toParam(fields));
  const qs = params.toString();
  return `${API_BASE}/articles/${encodeURIComponent(key)}${qs ? `?${qs}` : ""}`;
}

export async function fetchArticle(idOrSlug, opts = {}) {
  const url = buildArticleShowUrl(idOrSlug, opts);
  if (DEBUG_HTTP) console.log("[API] GET", url);
  const { data } = await api.get(url);
  return data;
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
  const fields = [
    "id",
    "title",
    "slug",
    "excerpt",
    "published_at",
    "featured_image",
  ];
  const include = ["categories", "media"];

  const attempts = [
    // 1) style "filter[...]"
    {
      params: {
        "fields": fields.join(","),
        "include": include.join(","),
        "filter[categories]": categoryIds.join(",") || undefined,
        "filter[tag_ids]": tagIds.join(",") || undefined,
        "filter[exclude_id]": excludeId || undefined,
        "limit": limit,
        "status": "published",
      },
    },
    // 2) style simple
    {
      params: {
        "fields": fields.join(","),
        "include": include.join(","),
        "categories": categoryIds.join(",") || undefined,
        "tags": tagIds.join(",") || undefined,
        "exclude_id": excludeId || undefined,
        "limit": limit,
        "status": "published",
      },
    },
    // 3) style array
    {
      params: {
        "fields": fields.join(","),
        "include": include.join(","),
        "category_ids": categoryIds,
        "tag_ids": tagIds,
        "exclude_id": excludeId || undefined,
        "limit": limit,
        "status": "published",
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
