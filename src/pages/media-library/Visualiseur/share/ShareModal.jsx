// src/components/share/ShareModal.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FaTimes,
  FaFacebook,
  FaEnvelope,
  FaWhatsapp,
  FaCopy,
  FaLink,
  FaPaperPlane,
  FaShare,
  FaCheck,
} from "react-icons/fa";

/* ---------- Overlays globaux via Portal (toujours rendus) ---------- */
function GlobalToast({ open, message }) {
  if (!open || !message) return null;
  return createPortal(
    <div className="fixed top-4 right-4 z-[2147483647] transition-all">
      <div className="flex items-center gap-2 bg-green-600 text-white shadow-lg rounded-xl px-4 py-2">
        <FaCheck className="shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>,
    document.body
  );
}

function SuccessOverlay({ open, title, text, onOk }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2147483647] bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-green-100 w-full max-w-xs mx-4 p-6 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
          <FaCheck className="text-green-600" size={22} />
        </div>
        <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
        {text ? <p className="text-sm text-gray-600 mt-1">{text}</p> : null}
        <button
          onClick={onOk}
          className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
        >
          OK
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Composant principal ---------- */
export default function ShareModal({
  open,
  onClose,
  title,
  excerpt,
  url,
  channels = ["email", "emailAuto", "facebook", "whatsapp", "whatsappNumber"],
  onEmailMailto,
  onEmailAuto,
  onFacebook,
  onWhatsAppGeneral,
  onWhatsAppToNumber,
  defaultWhatsNumber = "",
}) {
  const inputRef = useRef(null);

  // champs
  const [emailTo, setEmailTo] = useState("");
  const [whatsNumber, setWhatsNumber] = useState(defaultWhatsNumber);

  // ui
  const [copyOk, setCopyOk] = useState(false);
  const [activeTab, setActiveTab] = useState("link");
  const [isVisible, setIsVisible] = useState(false);

  // email auto
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");

  // overlays (toast + succès)
  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const [successText, setSuccessText] = useState("");

  const toastTimer = useRef(null);
  const autoCloseTimer = useRef(null);
  const [isMounted, setIsMounted] = useState(false);

  const safeUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  const hasEmail =
    channels.includes("email") || channels.includes("emailAuto");
  const hasWhatsApp =
    channels.includes("whatsapp") || channels.includes("whatsappNumber");
  const hasSocial = channels.includes("facebook");

  // tabs dynamiques
  const tabs = useMemo(() => {
    const t = [{ key: "link", label: "Lien", icon: FaLink }];
    if (hasEmail) t.push({ key: "email", label: "Email", icon: FaEnvelope });
    if (hasWhatsApp)
      t.push({ key: "whatsapp", label: "WhatsApp", icon: FaWhatsapp });
    return t;
  }, [hasEmail, hasWhatsApp]);

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === activeTab));
  const tabWidthPct = 100 / Math.max(1, tabs.length);

  // marquer monté (pour Portal côté client)
  useEffect(() => setIsMounted(true), []);

  // animation d’apparition quand open change
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      const id = setTimeout(() => inputRef.current?.select(), 150);
      return () => clearTimeout(id);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  // nettoyage timers
  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(autoCloseTimer.current);
    };
  }, []);

  /* IMPORTANT : ne PAS return null quand open === false
     → on veut pouvoir afficher les PORTALS même si le modal est caché */
  const handleCloseAll = () => {
    clearTimeout(toastTimer.current);
    clearTimeout(autoCloseTimer.current);
    setToastOpen(false);
    setSuccessOpen(false);
    onClose?.();
  };

  const showToastThenDialogAndAutoClose = (
    toastMessage,
    dialogTitle,
    dialogText = "",
    toastDuration = 1400
  ) => {
    // Toast global
    setToastMsg(toastMessage);
    setToastOpen(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastOpen(false);
      setToastMsg("");
    }, toastDuration);

    // Dialogue (léger décalage pour que l’utilisateur voie bien le toast)
    setTimeout(() => {
      setSuccessTitle(dialogTitle);
      setSuccessText(dialogText);
      setSuccessOpen(true);
    }, 200);

    // Fermeture auto globale
    clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      handleCloseAll();
    }, toastDuration + 600);
  };

  /* ---------- Actions ---------- */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1200);
      showToastThenDialogAndAutoClose(
        "Lien copié !",
        "Lien copié",
        "Le lien a été copié dans le presse-papiers."
      );
    } catch {
      /* noop */
    }
  };

  const handleEmailAuto = async () => {
    if (!onEmailAuto) return;
    setEmailError("");
    setEmailSending(true);
    try {
      await onEmailAuto({ to: emailTo }); // appelle ton service
      showToastThenDialogAndAutoClose(
        "E-mail envoyé !",
        "E-mail envoyé",
        "Votre message a été envoyé avec succès."
      );
    } catch {
      setEmailError("Échec de l’envoi automatique. Veuillez réessayer.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleEmailMailto = () => {
    if (!onEmailMailto) return;
    onEmailMailto({ to: emailTo });
    showToastThenDialogAndAutoClose(
      "Client e-mail ouvert.",
      "Client e-mail ouvert",
      "Vous pouvez finaliser l’envoi dans votre application."
    );
  };

  const handleFacebook = () => {
    if (!onFacebook) return;
    onFacebook();
    showToastThenDialogAndAutoClose(
      "Facebook ouvert.",
      "Facebook prêt",
      "Partagez votre article dans la fenêtre ouverte."
    );
  };

  const handleWhatsGeneral = () => {
    if (!onWhatsAppGeneral) return;
    onWhatsAppGeneral();
    showToastThenDialogAndAutoClose(
      "WhatsApp ouvert.",
      "WhatsApp prêt",
      "Validez l’envoi dans l’application."
    );
  };

  const handleWhatsToNumber = () => {
    if (!onWhatsToNumber) return;
    onWhatsAppToNumber?.({ phone: whatsNumber });
    showToastThenDialogAndAutoClose(
      "Conversation WhatsApp lancée.",
      "WhatsApp prêt",
      "Le message est prêt à être envoyé."
    );
  };

  /* ---------- Renders ---------- */

  const ModalShell = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 pointer-events-auto">
      <div
        className={`absolute inset-0 bg-gradient-to-br from-blue-900/40 via-blue-800/30 to-blue-900/50 backdrop-blur-lg transition-all duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleCloseAll}
      />
      <div
        className={`relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-blue-100/50 w-full max-w-sm overflow-hidden transition-all duration-500 ${
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        }`}
      >
        {/* header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 p-5">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <FaShare className="text-white" size={18} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Partager</h3>
                <p className="text-blue-100 text-sm mt-0.5">
                  Diffusez votre contenu
                </p>
              </div>
            </div>
            <button
              onClick={handleCloseAll}
              className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all duration-300 hover:rotate-90 backdrop-blur-sm"
              aria-label="Fermer"
              title="Fermer"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="relative p-6 bg-gradient-to-b from-white to-blue-50/30">
          {title && (
            <div className="mb-5 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100/50">
              <div className="text-sm font-semibold text-blue-900 truncate flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                {title}
              </div>
              {excerpt && (
                <div className="text-xs text-blue-600 mt-1 truncate">
                  {excerpt}
                </div>
              )}
            </div>
          )}

          {/* tabs */}
          <Tabs
            tabs={tabs}
            activeIndex={activeIndex}
            tabWidthPct={tabWidthPct}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* content */}
          <div className="min-h-[120px]">
            {activeTab === "link" && (
              <LinkTab
                safeUrl={safeUrl}
                copyOk={copyOk}
                onCopy={handleCopyLink}
                onFacebook={hasSocial ? handleFacebook : null}
              />
            )}

            {activeTab === "email" && hasEmail && (
              <EmailTab
                emailTo={emailTo}
                setEmailTo={setEmailTo}
                emailSending={emailSending}
                emailError={emailError}
                onEmailAuto={
                  channels.includes("emailAuto") ? handleEmailAuto : null
                }
                onEmailMailto={
                  channels.includes("email") ? handleEmailMailto : null
                }
              />
            )}

            {activeTab === "whatsapp" && hasWhatsApp && (
              <WhatsAppTab
                whatsNumber={whatsNumber}
                setWhatsNumber={setWhatsNumber}
                onWhatsToNumber={
                  channels.includes("whatsappNumber")
                    ? handleWhatsToNumber
                    : null
                }
                onWhatsGeneral={
                  channels.includes("whatsapp") ? handleWhatsGeneral : null
                }
              />
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-blue-100/50 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-blue-500/70">
              <div className="w-1 h-1 bg-blue-400 rounded-full" />
              <span>Partagez facilement</span>
              <div className="w-1 h-1 bg-blue-400 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Le modal n’est visible que si open === true */}
      {open ? ModalShell : null}

      {/* Overlays globaux : TOUJOURS montés (même si open === false) */}
      {isMounted && (
        <>
          <GlobalToast open={toastOpen} message={toastMsg} />
          <SuccessOverlay
            open={successOpen}
            title={successTitle}
            text={successText}
            onOk={handleCloseAll}
          />
        </>
      )}
    </>
  );
}

/* ---------- Sous-composants ---------- */

function Tabs({ tabs, activeIndex, tabWidthPct, activeTab, setActiveTab }) {
  return (
    <div className="relative bg-gradient-to-r from-blue-100/50 to-cyan-100/50 rounded-2xl p-1.5 text-sm mb-5 backdrop-blur-sm overflow-hidden">
      <div
        className="absolute top-1.5 bottom-1.5 bg-white rounded-xl shadow-lg border border-blue-200/50 transition-all duration-300"
        style={{
          left: `calc(${tabWidthPct * activeIndex}% + 6px)`,
          width: `calc(${tabWidthPct}% - 12px)`,
        }}
      />
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 font-medium ${
                isActive
                  ? "text-blue-700 scale-105"
                  : "text-blue-600/70 hover:text-blue-700 hover:scale-105"
              }`}
              type="button"
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LinkTab({ safeUrl, copyOk, onCopy, onFacebook }) {
  return (
    <div className="space-y-4">
      <div className="relative group">
        <input
          value={safeUrl}
          readOnly
          className="w-full px-4 py-3.5 rounded-2xl border-2 border-blue-200/50 text-sm bg-gradient-to-r from-blue-50/50 to-white focus:outline-none focus:border-blue-400 font-mono transition-all duration-300 pr-24 group-hover:shadow-lg"
        />
        <button
          onClick={onCopy}
          className={`absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
            copyOk
              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white scale-105 shadow-lg"
              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-md hover:shadow-lg hover:scale-105"
          }`}
          type="button"
        >
          {copyOk ? (
            <>
              <FaCheck size={12} />
              Copié
            </>
          ) : (
            <>
              <FaCopy size={12} />
              Copier
            </>
          )}
        </button>
      </div>

      {onFacebook && (
        <button
          onClick={onFacebook}
          type="button"
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-[#1877F2] hover:bg-[#1463c8] text-white font-semibold shadow-lg transition-all duration-300"
          title="Partager sur Facebook"
        >
          <FaFacebook size={18} />
          Partager sur Facebook
        </button>
      )}
    </div>
  );
}

function EmailTab({
  emailTo,
  setEmailTo,
  emailSending,
  emailError,
  onEmailAuto,
  onEmailMailto,
}) {
  return (
    <div className="space-y-4">
      <div className="relative group">
        <input
          value={emailTo}
          onChange={(e) => setEmailTo(e.target.value)}
          placeholder="Destinataire(s) e-mail : ex. ami@ex.com ; collegue@ex.com"
        className="w-full px-4 py-3.5 rounded-2xl border-2 border-blue-200/50 text-sm focus:outline-none focus:border-blue-400 bg-gradient-to-r from-blue-50/30 to-white transition-all duration-300 pr-12 group-hover:shadow-lg"
        />
        <FaEnvelope className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
      </div>

      {emailError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
          {emailError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {onEmailAuto && (
          <button
            onClick={onEmailAuto}
            disabled={!emailTo.trim() || emailSending}
            type="button"
            className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-semibold shadow-lg transition-all duration-300 ${
              emailSending
                ? "bg-blue-400 cursor-wait"
                : "bg-gradient-to-r from-blue-500 to-blue-500 hover:from-blue-600 hover:to-blue-600"
            }`}
            title="Envoyer automatiquement"
          >
            {emailSending ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                  />
                </svg>
                Envoi…
              </>
            ) : (
              <>
                <FaPaperPlane size={14} />
                Envoyer
              </>
            )}
          </button>
        )}
        {onEmailMailto && (
          <button
            onClick={onEmailMailto}
            disabled={!emailTo.trim() || emailSending}
            type="button"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-blue-200 hover:border-blue-300 bg-white text-blue-700 font-semibold shadow-md transition-all duration-300 disabled:opacity-60"
            title="Ouvrir votre client mail"
          >
            <FaEnvelope size={14} />
            Mail App
          </button>
        )}
      </div>
    </div>
  );
}

function WhatsAppTab({
  whatsNumber,
  setWhatsNumber,
  onWhatsToNumber,
  onWhatsGeneral,
}) {
  return (
    <div className="space-y-4">
      {onWhatsToNumber && (
        <div className="flex gap-2">
          <div className="relative group flex-1">
            <input
              value={whatsNumber}
              onChange={(e) =>
                setWhatsNumber(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder="Numéro (ex: 33612345678)"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-emerald-200/70 text-sm focus:outline-none focus:border-emerald-400 bg-gradient-to-r from-emerald-50/40 to-white transition-all duration-300 pr-12 group-hover:shadow-lg"
            />
            <FaWhatsapp
              className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
              size={16}
            />
          </div>
          <button
            onClick={onWhatsToNumber}
            disabled={!whatsNumber}
            type="button"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-white font-semibold shadow-lg transition-all duration-300 disabled:opacity-60
                       bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1ec15a] hover:to-[#0f786e]"
            title="Partager sur WhatsApp (numéro)"
          >
            <FaWhatsapp size={16} />
            Envoyer
          </button>
        </div>
      )}

      {onWhatsGeneral && (
        <button
          onClick={onWhatsGeneral}
          type="button"
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-white font-semibold shadow-lg transition-all duration-300
                     bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#1ec15a] hover:to-[#0f786e]"
          title="Partager sur WhatsApp (général)"
        >
          <FaWhatsapp size={16} />
          Ouvrir WhatsApp
        </button>
      )}
    </div>
  );
}
