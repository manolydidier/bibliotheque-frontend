// src/component/otp/OtpModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./otp.css";
import { useDispatch } from "react-redux";
import { preVerifyEmail, verifyEmailCode } from "../../features/auth/authActions";
import LoadingComponent from "../loading/LoadingComponent";
import { FaCheck } from "react-icons/fa";

const pad2 = (n) => n.toString().padStart(2, "0");

const useCountdown = (initial = 120) => {
  const [left, setLeft] = useState(Math.max(0, initial));
  useEffect(() => {
    if (left <= 0) return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [left]);
  const mm = Math.floor(left / 60);
  const ss = left % 60;
  return { left, label: `${pad2(mm)}:${pad2(ss)}`, reset: setLeft };
};

/* ---------------- Overlays globaux via Portal ---------------- */
function OtpToast({ open, message }) {
  if (!open || !message) return null;
  return createPortal(
    <div className="otp-toast">
      <div className="otp-toast-inner">
        <FaCheck className="otp-toast-icon" />
        <span>{message}</span>
      </div>
    </div>,
    document.body
  );
}

function OtpSuccessDialog({ open, title, text, onOk }) {
  if (!open) return null;
  return createPortal(
    <div className="otp-success-overlay" role="dialog" aria-modal="true">
      <div className="otp-success-card">
        <div className="otp-success-icon">
          <FaCheck size={22} />
        </div>
        <h4 className="otp-success-title">{title}</h4>
        {text ? <p className="otp-success-text">{text}</p> : null}
        <button className="otp-success-btn" onClick={onOk}>
          OK
        </button>
      </div>
    </div>,
    document.body
  );
}

/**
 * Props clés:
 * - variant: "modal" | "inline"  (modal par défaut)
 * - size: "compact" | "default"   (compact par défaut)
 */
const OtpModal = ({
  email,
  langue = "fr",
  intent = "login",
  initialTtlSec = 120,
  open = false,
  onVerified,
  onClose,
  variant = "modal",
  size = "compact",
}) => {
  const dispatch = useDispatch();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);
  const { left, label, reset } = useCountdown(initialTtlSec || 120);

  // overlays
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogText, setDialogText] = useState("");
  const toastTimer = useRef(null);
  const autoCloseTimer = useRef(null);

  useEffect(() => {
    if (open) {
      setDigits(["", "", "", "", "", ""]);
      setSubmitting(false);
      setResending(false);
      setTimeout(() => inputsRef.current?.[0]?.focus(), 15);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(autoCloseTimer.current);
    };
  }, []);

  const code = useMemo(() => digits.join(""), [digits]);

  const onChangeDigit = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((arr) => {
      const copy = [...arr];
      copy[i] = d || "";
      return copy;
    });
    if (d && i < 5) inputsRef.current?.[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current?.[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputsRef.current?.[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputsRef.current?.[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const txt = (e.clipboardData.getData("text") || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (txt.length >= 2) {
      e.preventDefault();
      const arr = txt.split("").slice(0, 6);
      while (arr.length < 6) arr.push("");
      setDigits(arr);
      const last = Math.max(0, Math.min(5, txt.length - 1));
      setTimeout(() => inputsRef.current?.[last]?.focus(), 10);
    }
  };

  /** Utilisé UNIQUEMENT pour le succès de vérification (où on veut fermer la modale). */
  const showToastThenDialog = (toastMessage, dialogT, dialogTxt = "", onDone) => {
    setToastMsg(toastMessage);
    setToastOpen(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastOpen(false);
      setToastMsg("");
      setDialogTitle(dialogT);
      setDialogText(dialogTxt);
      setDialogOpen(true);
    }, 1200);

    // auto-close modal après ~2.2s (succès de vérification uniquement)
    clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      setDialogOpen(false);
      onDone?.();
      onClose?.();
    }, 2200);
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      // ✅ markOnRegister si intent === 'register'
      const res = await dispatch(verifyEmailCode(email, code, langue, intent === "register"));
      if (res?.verified) {
        showToastThenDialog(
          langue === "fr" ? "Vérification réussie" : "Verification success",
          langue === "fr" ? "E-mail vérifié" : "Email verified",
          langue === "fr"
            ? "Votre adresse e-mail est confirmée."
            : "Your email address has been confirmed.",
          () => onVerified?.()
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  /** 
   * ✅ Correctif principal : RESEND = toast non bloquant + reset TTL, 
   *   **sans** success dialog et **sans** fermeture auto de la modale.
   */
  const handleResend = async () => {
    if (left > 0 || resending) return;
    setResending(true);
    try {
      const data = await dispatch(preVerifyEmail(email, langue, intent));
      reset(Math.max(30, data?.ttl || 120));

      // Affichage discret (toast) et on garde la modale ouverte
      setToastMsg(langue === "fr" ? "Nouveau code envoyé. Vérifie ta boîte mail." : "New code sent. Please check your inbox.");
      setToastOpen(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        setToastOpen(false);
        setToastMsg("");
      }, 1800);
    } catch (e) {
      const msg = e?.response?.data?.message;
      const retry = e?.response?.data?.retry_in;
      setToastMsg(retry ? `${msg} (${retry}s)` : (msg || (langue === "fr" ? "Échec de renvoi." : "Resend failed.")));
      setToastOpen(true);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => {
        setToastOpen(false);
        setToastMsg("");
      }, 2200);
    } finally {
      setResending(false);
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputsRef.current?.[0]?.focus(), 10);
    }
  };

  if (!open && variant !== "inline") {
    // On garde les overlays en dehors (via Portal), mais on cache la carte
    return (
      <>
        <OtpToast open={toastOpen} message={toastMsg} />
        <OtpSuccessDialog
          open={dialogOpen}
          title={dialogTitle}
          text={dialogText}
          onOk={() => {
            setDialogOpen(false);
            onVerified?.();
            onClose?.();
          }}
        />
      </>
    );
  }

  const Title = (
    <h2
      id="otp-title"
      className={`otp-title ${size === "compact" ? "is-compact" : ""}`}
    >
      {langue === "fr" ? "Vérifier votre e-mail" : "Verify your email"}
    </h2>
  );

  const Sub = (
    <p className={`otp-sub ${size === "compact" ? "is-compact" : ""}`}>
      {langue === "fr" ? `Code envoyé à ${email}.` : `We sent a code to ${email}.`}
    </p>
  );

  const Content = (
    <>
      {/* HEADER BLEU (glass + glow) */}
      <div className="otp-headbar">
        <div className="otp-headbar-row">
          <div className="otp-headbar-title">
            {Title}
            <div className="otp-headbar-badge">
              {langue === "fr" ? "Sécurité" : "Security"}
            </div>
          </div>
          <div className="otp-headbar-date">{new Date().toLocaleString()}</div>
        </div>
        <div className="otp-headbar-sub">{Sub}</div>
        <div className="otp-headbar-deco" />
      </div>

      {/* FORM */}
      <div
        className={`otp-inputs ${size === "compact" ? "is-compact" : ""}`}
        onPaste={onPaste}
      >
        {digits.map((d, i) => (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={d}
            ref={(el) => (inputsRef.current[i] = el)}
            onChange={(e) => onChangeDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            aria-label={`Digit ${i + 1}`}
            className="w-14"
          />
        ))}
      </div>

      <button
        className={`otp-verify ${size === "compact" ? "is-compact" : ""}`}
        disabled={submitting || code.length !== 6}
        onClick={handleVerify}
      >
        {submitting ? (
          <span className="otp-progress">
            <LoadingComponent size={6} />{" "}
            {langue === "fr" ? "Vérification…" : "Verifying…"}
          </span>
        ) : langue === "fr" ? (
          "Vérifier"
        ) : (
          "Verify"
        )}
      </button>

      <div className={`otp-footer ${size === "compact" ? "is-compact" : ""}`}>
        <span className="otp-timer">
          {langue === "fr" ? "Valable " : "Valid "} {label}
        </span>
        <button
          className="otp-resend"
          disabled={left > 0 || resending}
          onClick={handleResend}
          title={
            left > 0
              ? langue === "fr"
                ? "Veuillez patienter…"
                : "Please wait…"
              : undefined
          }
        >
          {resending
            ? langue === "fr"
              ? "Renvoi…"
              : "Resending…"
            : langue === "fr"
            ? "Renvoyer"
            : "Resend"}
        </button>
      </div>

      {/* Bas “style share” */}
      <div className="otp-bottom-note">
        <div className="otp-bottom-dot" />
        <span>
          {langue === "fr"
            ? "Entrez le code à 6 chiffres reçu par e-mail."
            : "Enter the 6-digit code sent to your email."}
        </span>
        <div className="otp-bottom-dot" />
      </div>
    </>
  );

  if (variant === "inline") {
    return (
      <>
        <div
          className={`otp-inline ${size === "compact" ? "is-compact" : ""}`}
          aria-labelledby="otp-title"
        >
          {Content}
        </div>
        <OtpToast open={toastOpen} message={toastMsg} />
        <OtpSuccessDialog
          open={dialogOpen}
          title={dialogTitle}
          text={dialogText}
          onOk={() => {
            setDialogOpen(false);
            onVerified?.();
            onClose?.();
          }}
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`otp-backdrop ${size === "compact" ? "is-compact" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="otp-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div className={`otp-modal ${size === "compact" ? "is-compact" : ""}`}>
          <button className="otp-close" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
          {Content}
        </div>
      </div>

      <OtpToast open={toastOpen} message={toastMsg} />
      <OtpSuccessDialog
        open={dialogOpen}
        title={dialogTitle}
        text={dialogText}
        onOk={() => {
          setDialogOpen(false);
          onVerified?.();
          onClose?.();
        }}
      />
    </>
  );
};

export default OtpModal;
