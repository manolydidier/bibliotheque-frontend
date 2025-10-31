// src/services/api.js
import axios from 'axios';

export const DEBUG_HTTP = import.meta.env.VITE_DEBUG_HTTP === "true";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // ESSENTIEL pour Sanctum
});

/* ===========================
   Helpers
   =========================== */
const safeUrl = (url) => {
  try { return typeof url === "string" ? url : (url?.toString?.() || ""); } catch { return ""; }
};
const isArticlesReq = (url) => safeUrl(url).includes("/articles");

/* ===========================
   Request interceptor
   =========================== */
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('tokenGuard') || sessionStorage.getItem('tokenGuard');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Pour les requêtes CSRF si nécessaire (axios le fait automatiquement si withCredentials est true et cookie XSRF-TOKEN présent)
    config.headers = config.headers || {};
    config.headers['X-Requested-With'] = 'XMLHttpRequest';

    // Logging conditionnel
    if (DEBUG_HTTP || isArticlesReq(config.url)) {
      // masque éventuellement les données sensibles
      const logged = {
        method: (config.method || 'GET').toUpperCase(),
        url: config.baseURL ? (config.baseURL + config.url) : config.url,
        params: config.params,
        data: config.data ? (typeof config.data === "object" ? { ...config.data } : config.data) : undefined,
        headers: config.headers && DEBUG_HTTP ? config.headers : undefined
      };
      // si on ne veut pas logger tout le header en prod, on supprime
      if (!DEBUG_HTTP && logged.headers) delete logged.headers;
      console.log("[API request]", logged);
      if (isArticlesReq(config.url)) console.log("[API -> /articles] REQUEST:", logged);
    }
  } catch (e) {
    if (DEBUG_HTTP) console.warn("[API request] logging failed", e);
  }
  return config;
}, (error) => {
  if (DEBUG_HTTP) console.error("[API request error]", error);
  return Promise.reject(error);
});

/* ===========================
   Response interceptor
   =========================== */
api.interceptors.response.use((response) => {
  try {
    const url = response.config?.url || "";
    if (DEBUG_HTTP || isArticlesReq(url)) {
      const small = {
        status: response.status,
        url: response.config?.url,
        method: (response.config?.method || "GET").toUpperCase(),
        params: response.config?.params,
        dataShape: Array.isArray(response.data) ? `Array(${response.data.length})` : (response.data && typeof response.data === "object" ? "Object" : typeof response.data),
        meta: response.data?.meta ? response.data.meta : undefined
      };
      console.log("[API response]", small);
      if (isArticlesReq(url)) console.log("[API -> /articles] RESPONSE:", small, "fullData:", DEBUG_HTTP ? response.data : undefined);
    }
  } catch (e) {
    if (DEBUG_HTTP) console.warn("[API response] logging failed", e);
  }
  return response;
}, (error) => {
  try {
    const cfg = error?.config || {};
    const url = cfg.url || "";
    if (DEBUG_HTTP || isArticlesReq(url)) {
      console.error("[API error]", {
        message: error.message,
        status: error?.response?.status,
        url,
        params: cfg.params,
        data: cfg.data,
        responseData: DEBUG_HTTP ? error?.response?.data : undefined,
      });
    }
  } catch (e) {
    if (DEBUG_HTTP) console.warn("[API error] logging failed", e);
  }
  return Promise.reject(error);
});

/* ===========================
   CSRF init helper (exporté)
   =========================== */
export const initializeCSRF = async () => {
  try {
    // on forme l'URL absolue si base present
    const csrfUrl = `${API_BASE_URL || ""}/sanctum/csrf-cookie`.replace(/\/+$/, "");
    if (DEBUG_HTTP) console.log("[API] initializeCSRF ->", csrfUrl);
    // axios utilisera la baseURL si fournie; on peut appeler via api.get('/sanctum/csrf-cookie')
    await api.get('/sanctum/csrf-cookie');
  } catch (error) {
    console.error('CSRF initialization failed:', error);
    throw error;
  }
};

export default api;
