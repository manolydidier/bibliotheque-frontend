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

/* ---------- Popup helper ---------- */
export function openCenteredPopup(href, width = 700, height = 600) {
  if (!isBrowser) return null;
  try {
    const topWin = window.top ?? window;
    const y = topWin?.outerHeight
      ? topWin.outerHeight / 2 + (topWin.screenY ?? 0) - height / 2
      : 100;
    const x = topWin?.outerWidth
      ? topWin.outerWidth / 2 + (topWin.screenX ?? 0) - width / 2
      : 100;
    dlog("popup", href);
    return window.open(
      href,
      "_blank",
      `noopener,noreferrer,width=${width},height=${height},left=${x},top=${y}`
    );
  } catch {
    dlog("popup-fallback", href);
    return window.open(href, "_blank", "noopener,noreferrer");
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

/* ---------- Partage tracké (DB) ---------- */
export async function createTrackedShare({
  articleId,
  method = "social",
  platform = null,
  url = "",
  meta = {},
  endpoint = "/share",   // joint à baseURL
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

/* Variante non bloquante (trace mailto) */
async function fireAndForgetCreateTrackedShare(payload) {
  try {
    const apiRoot = (getApiBaseURL() || "/").replace(/\/+$/, "");
    const absUrl = apiRoot + "/share";
    const body = JSON.stringify({
      article_id: payload.articleId,
      method: payload.method,
      platform: payload.platform,
      url: payload.url || undefined,
      meta: payload.meta || {},
    });

    if (isBrowser && navigator?.sendBeacon) {
      const ok = navigator.sendBeacon(absUrl, new Blob([body], { type: "application/json" }));
      dlog("beacon", ok ? "sent" : "failed", absUrl);
      if (ok) return;
    }
    await apiClient(apiRoot).post("/share", JSON.parse(body));
    dlog("ff-share-axios:ok", absUrl);
  } catch (e) {
    dlog("ff-share-error", e?.message);
  }
}

/* ---------- Facebook ---------- */
export async function shareOnFacebook({
  url,
  quote = "",
  articleId = null,
  title = "",
  excerpt = "",
}) {
  if (articleId) {
    dlog("fb:tracked", { articleId, quote });
    const { redirectUrl } = await createTrackedShare({
      articleId,
      method: "social",
      platform: "facebook",
      url: undefined, // backend génère le sharer depuis l’article
      meta: { quote, title, excerpt },
    });
    if (redirectUrl) openCenteredPopup(redirectUrl, 700, 600);
    showToast("Fenêtre de partage Facebook ouverte.", "info");
    return;
  }
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}${quote ? `&quote=${encodeURIComponent(quote)}` : ""}`;
  dlog("fb:direct", shareUrl);
  openCenteredPopup(shareUrl, 700, 600);
  showToast("Fenêtre de partage Facebook ouverte.", "info");
}

/* ---------- Mailto (trace non bloquante si articleId) ---------- */
export function shareByEmailMailto({
  to = "",
  subject = "",
  body = "",
  articleId = null,
}) {
  const recipients = normalizeRecipients(to);
  const mailto = `mailto:${encodeURIComponent(
    recipients.join(";")
  )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    String(body).replace(/\r?\n/g, "\r\n")
  )}`;

  if (articleId) {
    dlog("mailto:tracked", { recipients, articleId });
    fireAndForgetCreateTrackedShare({
      articleId,
      method: "email",
      platform: "email",
      url: mailto,
      meta: { recipients },
    });
  } else {
    dlog("mailto:direct", { recipients });
  }

  if (isBrowser) window.location.href = mailto;
  showToast("Ouverture de votre application e-mail…", "info");
}

/* ---------- Envoi e-mail auto (NE PAS ouvrir mailto) ---------- */
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
  dlog("email:auto:begin", { recipients, articleId });

  const { data } = await apiClient(baseURL, bearerToken).post(endpoint, {
    to: recipients,
    subject,
    body,
    url,
    article_id: articleId,
    sender_email: senderEmail || undefined,
    sender_name: senderName || undefined,
  });

  dlog("email:auto:end", data);
  showToast("E-mail envoyé ✅", "success");
  return data; // { ok, id, ... }
}

/* ---------- WhatsApp ---------- */
export async function shareOnWhatsApp({ text, articleId = null }) {
  const fallbackText = text || (isBrowser ? document.title : "");
  if (articleId) {
    dlog("wa:tracked", { articleId });
    const finalUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      fallbackText
    )}`;
    const { redirectUrl } = await createTrackedShare({
      articleId,
      method: "social",
      platform: "whatsapp",
      url: finalUrl,
      meta: text ? { text } : {},
    });
    if (redirectUrl) openCenteredPopup(redirectUrl, 560, 650);
    showToast("WhatsApp prêt au partage.", "info");
    return;
  }
  const href = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    fallbackText
  )}`;
  dlog("wa:direct", href);
  openCenteredPopup(href, 560, 650);
  showToast("WhatsApp prêt au partage.", "info");
}

export async function shareOnWhatsAppToNumber({ phone, text, articleId = null }) {
  const clean = String(phone || "").replace(/[^\d]/g, "");
  if (!clean) {
    dlog("wa:number:invalid", phone);
    showToast("Numéro WhatsApp invalide.", "error");
    return;
  }
  const finalUrl = `https://wa.me/${encodeURIComponent(clean)}?text=${encodeURIComponent(
    text || ""
  )}`;

  if (articleId) {
    dlog("wa:number:tracked", { articleId, phone: clean });
    const { redirectUrl } = await createTrackedShare({
      articleId,
      method: "social",
      platform: "whatsapp",
      url: finalUrl,
      meta: { phone: clean, text },
    });
    if (redirectUrl) openCenteredPopup(redirectUrl, 560, 650);
    showToast("WhatsApp prêt au partage.", "info");
    return;
  }
  dlog("wa:number:direct", finalUrl);
  openCenteredPopup(finalUrl, 560, 650);
  showToast("WhatsApp prêt au partage.", "info");
}
