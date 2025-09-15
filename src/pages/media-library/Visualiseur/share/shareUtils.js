// src/pages/media-library/Visualiseur/share/shareUtils.js
import axios from "axios";

/* Debug activable via .env: VITE_DEBUG_SHARE=true */
const isBrowser = typeof window !== "undefined";
const DEBUG_SHARE =
  (import.meta?.env?.VITE_DEBUG_SHARE ?? "false").toString().toLowerCase() ===
  "true";

/* ---------- Mini logger ---------- */
function dlog(...args) {
  if (!DEBUG_SHARE) return;
  // eslint-disable-next-line no-console
  console.log("[share]", new Date().toISOString(), ...args);
}

/* ---------- Mini toast (vanilla, autonome) ---------- */
let TOAST_STYLE_INJECTED = false;
let TOAST_CONTAINER = null;

function ensureToastInfra() {
  if (!isBrowser) return;
  if (!TOAST_STYLE_INJECTED) {
    const style = document.createElement("style");
    style.id = "share-toast-style";
    style.textContent = `
      .share-toast-container {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .share-toast {
        min-width: 240px;
        max-width: 360px;
        background: #111827;
        color: #fff;
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        line-height: 1.3;
        opacity: 0;
        transform: translateY(-6px);
        transition: opacity .25s ease, transform .25s ease;
        pointer-events: auto;
      }
      .share-toast.show { opacity: 1; transform: translateY(0); }
      .share-toast.success { background: #16a34a; }
      .share-toast.error { background: #dc2626; }
      .share-toast.info { background: #2563eb; }
      .share-toast .share-toast-close {
        margin-left: auto;
        background: transparent;
        border: none;
        color: rgba(255,255,255,.9);
        font-size: 16px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
    TOAST_STYLE_INJECTED = true;
  }
  if (!TOAST_CONTAINER) {
    const div = document.createElement("div");
    div.className = "share-toast-container";
    document.body.appendChild(div);
    TOAST_CONTAINER = div;
  }
}

/** Affiche un toast simple */
export function showToast(message, type = "success", duration = 2800) {
  if (!isBrowser) return;
  ensureToastInfra();

  const el = document.createElement("div");
  el.className = `share-toast ${type}`;
  el.innerHTML = `
    <div>${message}</div>
    <button class="share-toast-close" aria-label="Fermer">×</button>
  `;
  TOAST_CONTAINER.appendChild(el);

  // Animation in
  requestAnimationFrame(() => el.classList.add("show"));

  const close = () => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  };

  el.querySelector(".share-toast-close")?.addEventListener("click", close);
  if (duration > 0) setTimeout(close, duration);
}

/* ---------- API base ---------- */
export function getApiBaseURL() {
  let raw = (import.meta?.env?.VITE_API_BASE_URL || "").trim();
  if (raw) {
    raw = raw.replace(/\/+$/, "");
    dlog("API_BASE (env)", raw);
    return raw; // ex: http://127.0.0.1:8000/api
  }
  if (isBrowser) {
    const origin = window.location.origin;
    if (/^https?:\/\/(127\.0\.0\.1|localhost):5173$/i.test(origin)) {
      dlog("API_BASE (fallback dev 8000/api)");
      return "http://127.0.0.1:8000/api";
    }
    dlog("API_BASE (origin+/api)");
    return origin.replace(/\/+$/, "") + "/api";
  }
  dlog("API_BASE (/api)");
  return "/api";
}

export function getBearerToken() {
  try {
    return (
      localStorage.getItem("tokenGuard") ||
      sessionStorage.getItem("tokenGuard") ||
      null
    );
  } catch {
    return null;
  }
}

function buildAuthHeaders(bearerToken = getBearerToken()) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
  };
}

function normalizeRecipients(to = []) {
  const list = Array.isArray(to) ? to : String(to || "").split(/[;,]/);
  return list
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
}

/* ---------- Axios client ---------- */
function apiClient(baseURL = getApiBaseURL(), bearerToken = getBearerToken()) {
  const client = axios.create({
    baseURL,
    headers: buildAuthHeaders(bearerToken),
    timeout: 20000,
  });

  client.interceptors.request.use((cfg) => {
    dlog("REQ", cfg.method?.toUpperCase(), (cfg.baseURL || "") + cfg.url, cfg.data);
    return cfg;
  });

  client.interceptors.response.use(
    (res) => {
      dlog("RES", res.status, res.data);
      return res;
    },
    (err) => {
      const status = err?.response?.status;
      const data = err?.response?.data || err?.message;
      dlog("ERR", status, data);
      throw err;
    }
  );

  return client;
}

/* ---------- helper : vraie FENÊTRE (pas un onglet), appelée immédiatement au clic ---------- */
function openPopupWindow(href, { width = 700, height = 600, name = "share_popup" } = {}) {
  if (!isBrowser) return null;

  try {
    const topWin = window.top ?? window;
    const y = topWin?.outerHeight
      ? Math.max(0, Math.floor(topWin.outerHeight / 2 + (topWin.screenY ?? 0) - height / 2))
      : 100;
    const x = topWin?.outerWidth
      ? Math.max(0, Math.floor(topWin.outerWidth / 2 + (topWin.screenX ?? 0) - width / 2))
      : 100;

    const features = [
      `width=${width}`,
      `height=${height}`,
      `left=${x}`,
      `top=${y}`,
      "toolbar=no",
      "menubar=no",
      "location=no",
      "status=no",
      "resizable=yes",
      "scrollbars=yes",
    ].join(",");

    // Ouvrir une fenêtre *nommée* vide puis pousser l'URL
    const win = window.open("", name, features);
    if (win) {
      try { win.opener = null; } catch {}
      if (href) win.location.href = href;
      try { win.focus(); } catch {}
      dlog("popup:window", { name, features });
      return win;
    }

    // Fallback si le navigateur impose un onglet
    if (href) {
      dlog("popup:fallback-tab");
      window.open(href, "_blank");
    }
    return null;
  } catch {
    if (href) window.open(href, "_blank");
    return null;
  }
}

/* ---------- Partage tracké (DB) ---------- */
export async function createTrackedShare({
  articleId,
  method = "social",
  platform = null,
  url = "",
  meta = {},
  endpoint = "/share",
  baseURL = getApiBaseURL(),
  bearerToken = getBearerToken(),
}) {
  if (!articleId) throw new Error("articleId requis pour le partage tracké.");

  const { data } = await apiClient(baseURL, bearerToken).post(endpoint, {
    article_id: articleId,
    method,
    platform,
    url: url || undefined,
    meta,
  });

  const out = {
    id: data?.id || null,
    redirectUrl: data?.redirect_url || null,
    externalUrl: data?.external_url || null,
    raw: data,
  };
  dlog("share-created", out);
  return out;
}

/* ---------- Fire-and-forget tracking (ne bloque jamais la nav) ---------- */
async function fireAndForgetCreateTrackedShare(payload) {
  try {
    const apiRoot = (getApiBaseURL() || "/").replace(/\/+$/, "");
    const absUrl = apiRoot + "/share";
    const bodyObj = {
      article_id: payload.articleId,
      method: payload.method,
      platform: payload.platform,
      url: payload.url || undefined,
      meta: payload.meta || {},
    };
    const body = JSON.stringify(bodyObj);

    if (isBrowser) {
      fetch(absUrl, {
        method: "POST",
        body,
        headers: buildAuthHeaders(getBearerToken()),
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      }).catch((e) => dlog("ff-share-fetch:fail", e?.message));

      if (navigator?.sendBeacon) {
        const ok = navigator.sendBeacon(
          absUrl,
          new Blob([body], { type: "application/json" })
        );
        dlog("beacon", ok ? "sent" : "failed", absUrl);
      }
      return;
    }

    await apiClient(apiRoot).post("/share", bodyObj);
    dlog("ff-share-axios:ok", absUrl);
  } catch (e) {
    dlog("ff-share-error", e?.message);
  }
}

/* ---------- Facebook : fenêtre centrée (nommée) ---------- */
export function shareOnFacebook({ url, quote = "", articleId = null, title = "", excerpt = "" }) {
  const href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url || (isBrowser ? window.location.href : "")
  )}${quote ? `&quote=${encodeURIComponent(quote)}` : ""}`;

  // 1) OUVERTURE IMMÉDIATE (synchrone au clic)
  openPopupWindow(href, { width: 700, height: 600, name: "fb_share_popup" });

  // 2) Tracking non bloquant
  if (articleId) {
    fireAndForgetCreateTrackedShare({
      articleId,
      method: "social",
      platform: "facebook",
      url: href,
      meta: { quote, title, excerpt },
    });
  }
}

/* ---------- Mailto (ouvre le client mail) ---------- */
export function shareByEmailMailto({ to = "", subject = "", body = "", articleId = null }) {
  const recipients = normalizeRecipients(to);
  const mailto = `mailto:${encodeURIComponent(
    recipients.join(";")
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    String(body).replace(/\r?\n/g, "\r\n")
  )}`;

  if (articleId) {
    fireAndForgetCreateTrackedShare({
      articleId,
      method: "email",
      platform: "email",
      url: mailto,
      meta: { recipients },
    });
  }

  if (isBrowser) window.location.href = mailto;
}

/* ---------- Envoi e-mail auto via API (aucune redirection) ---------- */
export async function shareByEmailAuto({
  to = [],
  subject = "",
  body = "",
  url = "",
  articleId = null,
  senderEmail = "",
  senderName = "",
  endpoint = "/share/email",
  baseURL = getApiBaseURL(),
  bearerToken = getBearerToken(),
}) {
  const recipients = normalizeRecipients(to);
  if (!recipients.length) throw new Error("Aucun destinataire e-mail.");

  const { data } = await apiClient(baseURL, bearerToken).post(endpoint, {
    to: recipients,
    subject,
    body,
    url,
    article_id: articleId,
    sender_email: senderEmail || undefined,
    sender_name: senderName || undefined,
  });

  showToast("E-mail envoyé ✅", "success");
  return data;
}

/* ---------- WhatsApp : fenêtre centrée (nommée) ---------- */
export function shareOnWhatsApp({ text, articleId = null }) {
  const fallbackText = text || (isBrowser ? document.title : "");
  const href = `https://api.whatsapp.com/send?text=${encodeURIComponent(fallbackText)}`;

  openPopupWindow(href, { width: 560, height: 650, name: "wa_share_popup" });

  if (articleId) {
    fireAndForgetCreateTrackedShare({
      articleId,
      method: "social",
      platform: "whatsapp",
      url: href,
      meta: text ? { text } : {},
    });
  }
}

export function shareOnWhatsAppToNumber({ phone, text, articleId = null }) {
  const clean = String(phone || "").replace(/[^\d]/g, "");
  if (!clean) {
    showToast("Numéro WhatsApp invalide.", "error");
    return;
  }
  const href = `https://wa.me/${encodeURIComponent(clean)}?text=${encodeURIComponent(text || "")}`;

  openPopupWindow(href, { width: 560, height: 650, name: "wa_share_to_number_popup" });

  if (articleId) {
    fireAndForgetCreateTrackedShare({
      articleId,
      method: "social",
      platform: "whatsapp",
      url: href,
      meta: { phone: clean, text },
    });
  }
}

/* ---------- Defaults (sujet/texte) ---------- */
export function buildShareDefaults({ title, excerpt, url }) {
  const safeUrl = url || (isBrowser ? window.location.href : "");
  const subject = `[Partage] ${title || "Contenu à découvrir"}`;
  const body =
    (excerpt || title || "Je partage ce contenu avec toi.") +
    (safeUrl ? `\n\n${safeUrl}` : "");
  return { subject, body, url: safeUrl };
}
