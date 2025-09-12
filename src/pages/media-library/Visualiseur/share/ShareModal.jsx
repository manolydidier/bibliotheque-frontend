// src/components/share/ShareModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { FaTimes, FaFacebook, FaEnvelope, FaWhatsapp, FaCopy } from "react-icons/fa";

/**
 * Modal générique de partage.
 *
 * Props:
 * - open, onClose
 * - title, excerpt, url
 * - channels: ["email","emailAuto","facebook","whatsapp","whatsappNumber"]
 * - onEmailMailto({ to })?
 * - onEmailAuto({ to })?
 * - onFacebook()?
 * - onWhatsAppGeneral()?
 * - onWhatsAppToNumber({ phone })?
 */
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
  const [emailTo, setEmailTo] = useState("");
  const [whatsNumber, setWhatsNumber] = useState(defaultWhatsNumber);
  const [copyOk, setCopyOk] = useState(false);
  const safeUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.select(), 80);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      setEmailTo("");
      setWhatsNumber(defaultWhatsNumber || "");
      setCopyOk(false);
    }
  }, [open, defaultWhatsNumber]);

  if (!open) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-[9999] ">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Partager</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Fermer">
            <FaTimes />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4 truncate">{title || "Sans titre"}</p>

        {/* Lien */}
        <div className="mb-5">
          <label className="block text-xs text-gray-500 mb-1">Lien</label>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={safeUrl}
              readOnly
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm bg-gray-50 focus:outline-none"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(safeUrl);
                  setCopyOk(true);
                  setTimeout(() => setCopyOk(false), 1200);
                } catch {}
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg.white hover:bg-gray-50 inline-flex items-center gap-2"
            >
              <FaCopy />
              {copyOk ? "Copié" : "Copier"}
            </button>
          </div>
        </div>

        {/* E-mail */}
        {(channels.includes("email") || channels.includes("emailAuto")) && (
          <div className="space-y-2 mb-5">
            <label className="block text-xs text-gray-500">
              Destinataires (e-mails ; séparés par des ; ou ,)
            </label>
            <input
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="ex: ami@ex.com;collegue@ex.com"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              {channels.includes("emailAuto") && (
                <button
                  onClick={() => onEmailAuto?.({ to: emailTo })}
                  disabled={!emailTo.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
                >
                  <FaEnvelope />
                  Envoyer (auto)
                </button>
              )}
              {channels.includes("email") && (
                <button
                  onClick={() => onEmailMailto?.({ to: emailTo })}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium"
                >
                  <FaEnvelope />
                  Ouvrir Mail
                </button>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp */}
        {(channels.includes("whatsapp") || channels.includes("whatsappNumber")) && (
          <div className="space-y-2 mb-5">
            {channels.includes("whatsappNumber") && (
              <>
                <label className="block text-xs text-gray-500">
                  Numéro WhatsApp (format international, ex: 33612345678)
                </label>
                <input
                  value={whatsNumber}
                  onChange={(e) => setWhatsNumber(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Ex: 33612345678"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </>
            )}

            <div className="flex gap-2">
              {channels.includes("whatsappNumber") && (
                <button
                  onClick={() => onWhatsAppToNumber?.({ phone: whatsNumber })}
                  disabled={!whatsNumber}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50"
                >
                  <FaWhatsapp />
                  WhatsApp (numéro)
                </button>
              )}
              {channels.includes("whatsapp") && (
                <button
                  onClick={() => onWhatsAppGeneral?.()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 font-medium border border-green-200"
                >
                  <FaWhatsapp />
                  WhatsApp (général)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Facebook */}
        {channels.includes("facebook") && (
          <div className="space-y-3">
            <button
              onClick={onFacebook}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#1877F2] hover:bg-[#1463c8] text-white font-medium"
            >
              <FaFacebook />
              Partager sur Facebook
            </button>
          </div>
        )}

        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
