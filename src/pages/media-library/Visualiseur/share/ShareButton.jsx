// src/pages/media-library/Visualiseur/share/ShareButton.jsx
import React from "react";
import { FaShareAlt } from "react-icons/fa";
import ShareModal from "./ShareModal";
import {
  shareOnFacebook,
  shareByEmailMailto,
  buildShareDefaults,
  shareOnWhatsApp,
  shareOnWhatsAppToNumber,
  shareByEmailAuto,
  showToast,
} from "./shareUtils";

/**
 * Bouton de partage réutilisable.
 */
export default function ShareButton({
  title,
  excerpt,
  url,
  articleId = null,
  variant = "button",
  label = "Partager",
  className = "",
  buttonProps = {},
  channels = ["email", "emailAuto", "facebook", "whatsapp", "whatsappNumber"],
  emailEndpoint = "/share/email",
  defaultWhatsNumber = "",
}) {
  const [open, setOpen] = React.useState(false);
  const defs = React.useMemo(
    () => buildShareDefaults({ title, excerpt, url }),
    [title, excerpt, url]
  );

  // --- EMAIL: client mail (mailto)
  const onEmailMailto = ({ to }) => {
    shareByEmailMailto({ to, subject: defs.subject, body: defs.body, articleId });
    setOpen(false);
  };

  // --- EMAIL: envoi auto via API
  const onEmailAuto = async ({ to, senderEmail, senderName }) => {
    try {
      await shareByEmailAuto({
        to: String(to || "").split(/[;,]/),
        subject: defs.subject,
        body: defs.body,
        url: defs.url,
        articleId,
        senderEmail,
        senderName,
        endpoint: emailEndpoint,
      });
      // le toast succès est déclenché dans shareByEmailAuto()
      setOpen(false);
    } catch (e) {
      console.error("Echec envoi auto", e);
      showToast(e?.response?.data?.message || "Échec de l'envoi e-mail.", "error");
    }
  };

  // --- FACEBOOK: FENÊTRE immédiate (pas d'attente)
  const onFacebook = () => {
    // Passer l’URL explicite maximise la fiabilité
    shareOnFacebook({ url: defs.url, articleId, quote: title || "", title, excerpt });
    setOpen(false);
  };

  // --- WHATSAPP (général)
  const onWhatsAppGeneral = () => {
    const text = defs.body || defs.url || document.title;
    shareOnWhatsApp({ text, articleId });
    setOpen(false);
  };

  // --- WHATSAPP (vers un numéro)
  const onWhatsAppToNumber = ({ phone }) => {
    const text = defs.body || defs.url || document.title;
    shareOnWhatsAppToNumber({ phone, text, articleId });
    setOpen(false);
  };

  const commonBtn =
    "inline-flex items-center gap-2 rounded-xl border border-gray-300 transition-all duration-200";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${commonBtn} p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 ${className}`}
          {...buttonProps}
          title="Partager"
          aria-label="Partager"
        >
          <FaShareAlt />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${commonBtn} px-4 py-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 ${className}`}
          {...buttonProps}
        >
          <FaShareAlt className="mr-2" />
          <span>{label}</span>
        </button>
      )}

      <ShareModal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        excerpt={excerpt}
        url={defs.url}
        channels={channels}
        onEmailMailto={channels.includes("email") ? onEmailMailto : undefined}
        onEmailAuto={channels.includes("emailAuto") ? onEmailAuto : undefined}
        onFacebook={channels.includes("facebook") ? onFacebook : undefined}
        onWhatsAppGeneral={channels.includes("whatsapp") ? onWhatsAppGeneral : undefined}
        onWhatsAppToNumber={channels.includes("whatsappNumber") ? onWhatsAppToNumber : undefined}
        defaultWhatsNumber={defaultWhatsNumber}
      />
    </>
  );
}
