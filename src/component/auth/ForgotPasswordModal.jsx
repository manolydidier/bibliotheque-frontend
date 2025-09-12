import React, { useEffect, useState, useRef } from "react";
import ReactDOM, { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { FaCheck } from "react-icons/fa";
import LoadingComponent from "../loading/LoadingComponent";
import { requestPasswordReset } from "../../features/auth/passwordActions";
import "./forgot-password.css";

const isValidEmail = (v = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(String(v).trim());

/* ---------- Overlays globaux (toast + success) ---------- */
function FPToast({ open, message }) {
  if (!open || !message) return null;
  return createPortal(
    <div className="fp-toast" role="status" aria-live="polite">
      <div className="fp-toast-inner">
        <FaCheck className="fp-toast-icon" />
        <span>{message}</span>
      </div>
    </div>,
    document.body
  );
}

function FPSuccessDialog({ open, title, text, onOk }) {
  if (!open) return null;
  return createPortal(
    <div className="fp-success-overlay" role="dialog" aria-modal="true">
      <div className="fp-success-card">
        <div className="fp-success-icon" aria-hidden="true">
          <FaCheck size={20} />
        </div>
        <h4 className="fp-success-title">{title}</h4>
        {text ? <p className="fp-success-text">{text}</p> : null}
        <button className="fp-success-btn" onClick={onOk}>
          OK
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ---------- Modal principal ---------- */
const ForgotPasswordModal = ({
  open,
  onClose,
  defaultEmail = "",
  langue = "fr",
}) => {
  const dispatch = useDispatch();
  const [email, setEmail] = useState(defaultEmail || "");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogText, setDialogText] = useState("");
  const toastTimer = useRef(null);
  const autoCloseTimer = useRef(null);

  // reset à l’ouverture
  useEffect(() => {
    if (open) {
      setEmail(defaultEmail || "");
      setInfo("");
      setError("");
    }
  }, [open, defaultEmail]);

  // ESC pour fermer
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && open) onClose?.();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(autoCloseTimer.current);
    };
  }, []);

  const showToastThenDialog = (toastMessage, dTitle, dText = "") => {
    setToastMsg(toastMessage);
    setToastOpen(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastOpen(false);
      setToastMsg("");
      setDialogTitle(dTitle);
      setDialogText(dText);
      setDialogOpen(true);
    }, 1200);

    // fermeture auto du modal peu après l’ouverture du dialog
    clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      setDialogOpen(false);
      onClose?.();
    }, 2200);
  };

  if (!open) {
    // on laisse les overlays globaux actifs au besoin
    return (
      <>
        <FPToast open={toastOpen} message={toastMsg} />
        <FPSuccessDialog
          open={dialogOpen}
          title={dialogTitle}
          text={dialogText}
          onOk={() => {
            setDialogOpen(false);
            onClose?.();
          }}
        />
      </>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setInfo("");
    setError("");

    if (!email.trim()) {
      setError(langue === "fr" ? "Veuillez saisir votre e-mail." : "Please enter your email.");
      return;
    }
    if (!isValidEmail(email)) {
      setError(langue === "fr" ? "Adresse e-mail invalide." : "Invalid email address.");
      return;
    }

    try {
      setLoading(true);
      await dispatch(requestPasswordReset({ email, langue })).unwrap();

      const msg =
        langue === "fr"
          ? "Si un compte existe, un lien vous a été envoyé."
          : "If an account exists, a reset link has been sent.";
      setInfo(msg);
      showToastThenDialog(
        langue === "fr" ? "Lien envoyé !" : "Link sent!",
        langue === "fr" ? "Vérifiez votre boîte mail" : "Check your inbox",
        langue === "fr"
          ? "Suivez le lien pour réinitialiser votre mot de passe."
          : "Follow the link to reset your password."
      );
    } catch (err) {
      setError(err?.message || (langue === "fr" ? "Erreur inattendue." : "Unexpected error."));
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <>
      <div
        className="fp-backdrop"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
        aria-hidden="false"
      >
        <div className="fp-card" role="dialog" aria-modal="true" aria-labelledby="fp-title">
          {/* Header bleu high-contrast */}
          <div className="fp-headbar">
            <div className="fp-headbar-row">
              <div className="fp-headbar-left">
                <h3 id="fp-title" className="fp-title">
                  {langue === "fr" ? "Mot de passe oublié" : "Forgot password"}
                </h3>
                <span className="fp-badge">{langue === "fr" ? "Sécurité" : "Security"}</span>
              </div>
              <div className="fp-headbar-right">{new Date().toLocaleString()}</div>
            </div>
            <p className="fp-sub">
              {langue === "fr"
                ? "Entrez votre e-mail pour recevoir un lien."
                : "Enter your email to receive a reset link."}
            </p>
            <div className="fp-headbar-deco" />
            <button className="fp-close" onClick={onClose} aria-label="Fermer">
              ×
            </button>
          </div>

          {/* Formulaire */}
          <form onSubmit={submit} className="fp-form">
            <div className="fp-input-group has-icon">
              <input
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="email"
                aria-invalid={!!error}
              />
              <label>{langue === "fr" ? "Adresse e-mail" : "Email address"}</label>
              <span className="fp-input-icon">@</span>
            </div>

            {info && (
              <div className="fp-info success" role="status">
                {info}
              </div>
            )}
            {error && (
              <div className="fp-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="fp-submit" disabled={loading || !isValidEmail(email)}>
              {loading ? (
                <span className="fp-progress">
                  <LoadingComponent size={8} color="border-white" />
                  {langue === "fr" ? "Envoi…" : "Sending…"}
                </span>
              ) : langue === "fr" ? (
                "Envoyer le lien"
              ) : (
                "Send link"
              )}
            </button>

            {/* Bas façon “share” */}
            <div className="fp-bottom-note">
              <div className="fp-bottom-dot" />
              <span>
                {langue === "fr"
                  ? "Vous recevrez un e-mail de réinitialisation si le compte existe."
                  : "You'll receive a reset email if the account exists."}
              </span>
              <div className="fp-bottom-dot" />
            </div>
          </form>
        </div>
      </div>

      {/* Overlays globaux */}
      <FPToast open={toastOpen} message={toastMsg} />
      <FPSuccessDialog
        open={dialogOpen}
        title={dialogTitle}
        text={dialogText}
        onOk={() => {
          setDialogOpen(false);
          onClose?.();
        }}
      />
    </>,
    document.body
  );
};

export default ForgotPasswordModal;
