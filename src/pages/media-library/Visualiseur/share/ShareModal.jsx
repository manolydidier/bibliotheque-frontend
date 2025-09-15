// src/components/share/ShareModal.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
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

/* ---------- helpers locaux ---------- */
function openNewWindow(href) {
  try {
    const w = window.open(href || "about:blank", "_blank", "noopener,noreferrer");
    return w || null;
  } catch {
    return null;
  }
}

function buildFacebookUrl(url, quote = "") {
  const u = url || (typeof window !== "undefined" ? window.location.href : "");
  const q = quote ? `&quote=${encodeURIComponent(quote)}` : "";
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}${q}`;
}

function buildWhatsAppText({ title, excerpt, url }) {
  const parts = [title || excerpt || "", url || (typeof window !== "undefined" ? window.location.href : "")]
    .map((s) => (s || "").trim())
    .filter(Boolean);
  return parts.join("\n\n");
}

/* ---------- Composant principal ---------- */
export default function ShareModal({
  open,
  onClose,
  title,
  excerpt,
  url,
  channels = ["email", "emailAuto", "facebook", "whatsapp", "whatsappNumber"],
  onEmailMailto,        // (opts) => void              (peut déclencher mailto + tracking côté parent)
  onEmailAuto,          // async (opts) => void        (appel API d'envoi)
  onFacebook,           // (opts) => void              (idéalement tracking ONLY)
  onWhatsAppGeneral,    // (opts) => void              (idéalement tracking ONLY)
  onWhatsAppToNumber,   // (opts) => void              (idéalement tracking ONLY)
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
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState("");
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

  // monté (pour focus)
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

  const handleCloseAll = () => {
    onClose?.();
  };

  /* ---------- Actions ---------- */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(safeUrl);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 1200);
    } catch {
      /* noop */
    }
  };

  const handleEmailAuto = async () => {
    if (!onEmailAuto) return;
    setEmailError("");
    setEmailSending(true);
    try {
      await onEmailAuto({ to: emailTo, title, excerpt, url: safeUrl });
      // pas d’overlay → on ferme simplement
      handleCloseAll();
    } catch {
      setEmailError("Échec de l’envoi automatique. Veuillez réessayer.");
    } finally {
      setEmailSending(false);
    }
  };

  const handleEmailMailto = () => {
    if (!onEmailMailto) return;
    onEmailMailto({ to: emailTo, title, excerpt, url: safeUrl });
    handleCloseAll();
  };

  const handleFacebook = () => {
    // 1) ouvrir immédiatement une nouvelle fenêtre (non bloqué)
    const href = buildFacebookUrl(safeUrl);
    openNewWindow(href);

    // 2) laisser le parent faire du tracking (mais SANS navigation)
    try {
      onFacebook?.({ href, trackOnly: true, title, excerpt, url: safeUrl });
    } catch {}
    handleCloseAll();
  };

  const handleWhatsGeneral = () => {
    const text = buildWhatsAppText({ title, excerpt, url: safeUrl });
    const href = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    openNewWindow(href);

    try {
      onWhatsAppGeneral?.({ href, trackOnly: true, text });
    } catch {}
    handleCloseAll();
  };

  const handleWhatsToNumber = () => {
    const clean = String(whatsNumber || "").replace(/[^\d]/g, "");
    if (!clean) return;
    const text = buildWhatsAppText({ title, excerpt, url: safeUrl });
    const href = `https://wa.me/${encodeURIComponent(clean)}?text=${encodeURIComponent(text)}`;
    openNewWindow(href);

    try {
      onWhatsAppToNumber?.({ href, trackOnly: true, phone: clean, text });
    } catch {}
    handleCloseAll();
  };

  /* ---------- Renders ---------- */

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[99] p-4 pointer-events-auto">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-all duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleCloseAll}
      />
      <div
        className={`relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden transition-all duration-300 ${
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
                <p className="text-blue-100 text-sm mt-0.5">Diffusez votre contenu</p>
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
                <div className="text-xs text-blue-600 mt-1 truncate">{excerpt}</div>
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
                onEmailAuto={channels.includes("emailAuto") ? handleEmailAuto : null}
                onEmailMailto={channels.includes("email") ? handleEmailMailto : null}
              />
            )}

            {activeTab === "whatsapp" && hasWhatsApp && (
              <WhatsAppTab
                whatsNumber={whatsNumber}
                setWhatsNumber={setWhatsNumber}
                onWhatsToNumber={channels.includes("whatsappNumber") ? handleWhatsToNumber : null}
                onWhatsGeneral={channels.includes("whatsapp") ? handleWhatsGeneral : null}
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
