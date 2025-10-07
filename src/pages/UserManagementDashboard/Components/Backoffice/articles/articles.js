// src/services/articles.js
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

/**
 * Instance axios centralisée.
 * IMPORTANT : on NE fixe PAS "Content-Type" quand on envoie un FormData.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    // Content-Type sera défini dynamiquement dans l'interceptor
  },
});

// Interceptor pour Auth + Content-Type dynamique + logs
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tokenGuard");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-Requested-With"] = "XMLHttpRequest";

  // ⬇️ CLÉ : si data est un FormData, on laisse le browser poser le bon boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  // Debug doux
  try {
    console.log("[API ▶]", config.method?.toUpperCase(), config.url);
    if (config.params) console.log("params:", config.params);
    if (config.headers) console.log("headers:", config.headers);
    if (config.data instanceof FormData) {
      const preview = {};
      for (const [k, v] of config.data.entries()) {
        preview[k] = v instanceof File ? `(File) name=${v.name}, type=${v.type}, size=${v.size}B` : v;
      }
      console.log("formdata:", preview);
    } else if (config.data) {
      console.log("data:", config.data);
    }
  } catch {}

  return config;
});

// Interceptor de réponse (logs)
api.interceptors.response.use(
  (res) => {
    console.log("[API ✔]", res.config?.method?.toUpperCase(), res.config?.url, res.status);
    return res;
  },
  (err) => {
    const cfg = err?.config ?? {};
    console.warn("[API ✖]", cfg.method?.toUpperCase?.(), cfg.url);
    if (err?.response) {
      console.warn("response status:", err.response.status);
      console.warn("response data:", err.response.data);
    } else {
      console.warn("network/unknown error:", err.message);
    }
    return Promise.reject(err);
  }
);

// ========= Endpoints ===========

// LISTE / SHOW
export const listArticles = (params = {}) =>
  api.get("/articles", { params }).then((r) => r.data);

export const getArticle = (id) =>
  api.get(`/articles/${id}`).then((r) => r.data);

// CREATE
// - JSON  -> POST /articlesstore
// - FILES -> POST /articles/with-files
export const createArticle = (payload, withFiles = false, onUploadProgress) => {
  if (withFiles) {
    return api
      .post("/articles/with-files", payload, {
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
          if (onUploadProgress) onUploadProgress(pct, e);
          console.log(`[upload] ${pct}% (${e.loaded}/${e.total} bytes)`);
        },
      })
      .then((r) => r.data);
  }
  return api.post("/articlesstore", payload).then((r) => r.data);
};

// UPDATE
// - JSON  -> PUT  /articles/{id}
// - FILES -> POST /articles/{id}/update-with-files
export const updateArticle = (id, payload, withFiles = false, onUploadProgress) => {
  if (withFiles) {
    return api
      .post(`/articles/${id}/update-with-files`, payload, {
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0;
          if (onUploadProgress) onUploadProgress(pct, e);
          console.log(`[upload] ${pct}% (${e.loaded}/${e.total} bytes)`);
        },
      })
      .then((r) => r.data);
  }
  return api.put(`/articles/${id}`, payload).then((r) => r.data);
};

// DELETE (force) / SOFT DELETE / RESTORE / TRASH
export const destroyArticle = (id) =>
  api.delete(`/articles/${id}`).then((r) => r.data);

export const softDeleteArticle = (id) =>
  api.delete(`/articles/${id}/soft-delete`).then((r) => r.data);

export const restoreArticle = (id) =>
  api.post(`/articles/${id}/restore`).then((r) => r.data);

export const listTrashedArticles = (params = {}) =>
  api.get("/articles/trashed", { params }).then((r) => r.data);

// TAXONOMIES
export const listCategories = () =>
  api.get("/categories").then((r) => r.data?.data || r.data);

export const listTags = () =>
  api.get("/tags").then((r) => r.data?.data || r.data);

export default api;
