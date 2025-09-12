// src/components/share/shareUtils.js
import axios from "axios";

export function openCenteredPopup(href, width = 700, height = 600) {
  try {
    const topWin = window.top ?? window;
    const y = topWin?.outerHeight
      ? topWin.outerHeight / 2 + topWin.screenY - height / 2
      : 100;
    const x = topWin?.outerWidth
      ? topWin.outerWidth / 2 + topWin.screenX - width / 2
      : 100;

    window.open(
      href,
      "_blank",
      `noopener,noreferrer,width=${width},height=${height},left=${x},top=${y}`
    );
  } catch {
    window.open(href, "_blank", "noopener,noreferrer");
  }
}

export function buildShareDefaults({ title, excerpt, url }) {
  const safeUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const subject = `[Partage] ${title || "Contenu à découvrir"}`;
  const body =
    (excerpt || title || "Je partage ce contenu avec toi.") +
    (safeUrl ? `\n\n${safeUrl}` : "");
  return { subject, body, url: safeUrl };
}

/* -------------------- Facebook -------------------- */
export function shareOnFacebook({ url, quote = "" }) {
  const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url
  )}${quote ? `&quote=${encodeURIComponent(quote)}` : ""}`;
  openCenteredPopup(shareUrl, 700, 600);
}

/* -------------------- E-mail (mailto) -------------------- */
export function shareByEmailMailto({ to = "", subject = "", body = "" }) {
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}

/* -------------------- E-mail (auto via API) -------------------- */
export async function shareByEmailAuto({
  to = [],
  subject = "",
  body = "",
  url = "",
  articleId = null,
  endpoint = "/share/email",
  baseURL = (import.meta?.env?.VITE_API_BASE_URL || "").replace(/\/+$/, ""),
  bearerToken = localStorage.getItem("tokenGuard") || null,
}) {
  const recipients = to
    .flatMap((s) => String(s).split(/[;,]/))
    .map((s) => s.trim())
    .filter(Boolean);

  if (!recipients.length) throw new Error("Aucun destinataire e-mail.");

  const client = axios.create({
    baseURL: baseURL || "/",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    timeout: 20000,
  });

  await client.post(endpoint, {
    to: recipients,
    subject,
    body,
    url,
    article_id: articleId,
  });
}

/* -------------------- WhatsApp -------------------- */
export function shareOnWhatsApp({ text }) {
  const href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  openCenteredPopup(href, 560, 650);
}

export function shareOnWhatsAppToNumber({ phone, text }) {
  const clean = String(phone || "").replace(/[^\d]/g, "");
  if (!clean) return;
  const href = `https://wa.me/${encodeURIComponent(clean)}?text=${encodeURIComponent(
    text
  )}`;
  openCenteredPopup(href, 560, 650);
}
