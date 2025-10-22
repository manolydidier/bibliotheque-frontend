// src/media-library/components/PasswordModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FaKey, FaTimes, FaExclamationTriangle } from "react-icons/fa";

export default function PasswordModal({
  open,
  title,
  onClose,
  onSubmit,
  defaultValue = "",
  // ↓ Optionnel : si ton parent les fournit, on les affiche/utilise
  error: externalError = "",
  busy: externalBusy = false,
}) {
  const { t } = useTranslation();
  const [pwd, setPwd] = useState(defaultValue || "");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  // Utiliser le titre par défaut traduit si non fourni
  const modalTitle = title || t('passwordModal.defaultTitle', 'Password required');

  // Sync avec les props (si le parent fournit error/busy)
  useEffect(() => { setError(externalError || ""); }, [externalError]);
  useEffect(() => { setBusy(!!externalBusy); }, [externalBusy]);

  useEffect(() => {
    if (open) {
      setError("");
      setPwd(defaultValue || "");
      setBusy(!!externalBusy);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, defaultValue, externalBusy]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();

    const trimmed = pwd.trim();
    if (!trimmed) {
      setError(t('passwordModal.validation.required', 'Please enter a password.'));
      return;
    }

    // Si le parent gère busy (externalBusy), on ne touche pas à busy local
    if (!externalBusy) setBusy(true);
    setError("");

    try {
      // onSubmit peut :
      //  - réussir (rien à faire)
      //  - throw une erreur (catch ci-dessous)
      //  - retourner une string d'erreur (ex: "Mot de passe invalide")
      const maybe = await onSubmit?.(trimmed, remember);
      if (typeof maybe === "string" && maybe.trim()) {
        // Le parent a renvoyé un message d'erreur (ex: mauvais mot de passe)
        setError(maybe.trim());
      }
    } catch (err) {
      // Capture d'erreurs API
      const apiMsg =
        err?.response?.data?.message ||
        err?.message ||
        t('passwordModal.errors.generic', 'An error occurred during verification.');
      setError(apiMsg);
    } finally {
      if (!externalBusy) setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => !busy && onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
        aria-describedby="password-modal-description"
        className="relative w-[92vw] max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6"
      >
        <button
          className="absolute top-3 right-3 p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 transition disabled:opacity-50"
          onClick={onClose}
          aria-label={t('passwordModal.close', 'Close')}
          disabled={busy}
        >
          <FaTimes />
        </button>

        <div className="mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <FaKey />
            </div>
            <div>
              <h3 id="password-modal-title" className="text-lg font-semibold text-slate-900">
                {modalTitle}
              </h3>
              <p id="password-modal-description" className="text-sm text-slate-500">
                {t('passwordModal.description', 'This content is protected. Enter the password to continue.')}
              </p>
            </div>
          </div>
        </div>

        {/* Bloc d'erreur global (API / validation) */}
        {error ? (
          <div 
            className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
            aria-live="polite"
          >
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="pwd-input" className="text-sm font-medium text-slate-700">
              {t('passwordModal.passwordLabel', 'Password')}
            </label>
            <input
              ref={inputRef}
              id="pwd-input"
              type="password"
              className="mt-1 w-full px-4 py-3 rounded-xl border border-slate-300/70 bg-white/90 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 disabled:opacity-60"
              placeholder={t('passwordModal.passwordPlaceholder', '••••••••')}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoComplete="current-password"
              disabled={busy}
              aria-required="true"
              aria-invalid={!!error}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-600 select-none cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={busy}
            />
            {t('passwordModal.rememberSession', 'Remember during session')}
          </label>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300/70 text-slate-700 bg-white hover:bg-slate-50 transition disabled:opacity-60"
              disabled={busy}
            >
              {t('passwordModal.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg transition disabled:opacity-60"
              disabled={busy}
            >
              {busy 
                ? t('passwordModal.verifying', 'Verifying...') 
                : t('passwordModal.continue', 'Continue')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}