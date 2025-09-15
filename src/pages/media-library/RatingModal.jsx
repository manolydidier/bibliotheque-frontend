// src/media-library/RatingModal.jsx
// Modal de notation (look OTP) en un seul fichier : logique + CSS injectée

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { FaStar, FaTimes, FaCheck } from "react-icons/fa";

/* =========================
   CSS inline (injectée une seule fois)
========================= */
const RATING_CSS = `
/* Backdrop & card (style similaire à otp.css) */
.rtg-backdrop{
  position: fixed; inset: 0; background: rgba(15,23,42,.55);
  display: grid; place-items: center; z-index: 999999;
  backdrop-filter: blur(2px);
}
.rtg-modal{
  width: min(92vw, 560px);
  background: rgba(255,255,255,.92);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  border-radius: 20px; padding: 0 0 14px;
  box-shadow: 0 20px 50px rgba(0,0,0,.25), 0 0 0 1px rgba(59,130,246,.10) inset;
  border: 1px solid rgba(226,232,240,.8);
  position: relative;
}
.rtg-close{
  position: absolute; right: 10px; top: 8px; border: 0; background: transparent;
  font-size: 28px; line-height: 1; color: #6b7280; cursor: pointer;
}

/* Header bleu (glass + glow) */
.rtg-headbar{
  position: relative; padding: 22px 20px 18px;
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  border-radius: 20px 20px 12px 12px;
  color: #fff;
  box-shadow: 0 8px 24px rgba(37,99,235,.35) inset;
}
.rtg-headbar-row{
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
}
.rtg-headbar-title{ display: flex; align-items: center; gap: 10px; }
.rtg-headbar-badge{
  font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 999px;
  background: rgba(255,255,255,.18); color: #fff; backdrop-filter: blur(4px);
}
.rtg-headbar-date{
  color: rgba(255,255,255,.9); font-weight: 600; font-size: 12px;
  padding: 6px 10px; border-radius: 999px; background: rgba(255,255,255,.18);
}
.rtg-headbar-sub{ margin-top: 6px; color: rgba(255,255,255,.95); }
.rtg-headbar-deco{
  position: absolute; right: -8px; top: -10px; width: 150px; height: 150px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.45) 2px, transparent 2px) 0 0/16px 16px;
  opacity: .28; pointer-events: none;
}
.rtg-title{
  margin: 0; font-size: 1.25rem; font-weight: 900;
  letter-spacing: -.02em; color: #fff;
}
.rtg-title.is-compact{ font-size: 1.1rem; }

/* Body */
.rtg-body{ padding: 16px 20px 6px; }

/* Stat actuelle */
.rtg-stat{
  display:flex; align-items:center; justify-content:space-between;
  background:#f8fafc; border:1px solid #e5e7eb; border-radius:14px; padding:10px 12px;
}
.rtg-stat-label{ color:#334155; font-weight:600; font-size:.95rem; }
.rtg-stat-right{ display:flex; align-items:center; gap:6px; }
.rtg-stat-avg{ color:#0f172a; font-weight:800; }
.rtg-stat-max{ color:#94a3b8; font-weight:700; }
.rtg-stat-sep{ color:#cbd5e1; }
.rtg-stat-count{ color:#475569; font-weight:700; }

/* Stars */
.rtg-picker{ text-align:center; margin: 14px 0 8px; }
.rtg-stars{ display:inline-flex; align-items:center; gap:10px; }
.rtg-star{
  width:44px; height:44px; display:grid; place-items:center; border-radius:12px;
  border:2px solid #e5e7eb; color:#cbd5e1; background:linear-gradient(180deg,#f8fafc,#ffffff);
  transition:.2s; cursor:pointer; font-size:20px;
}
.rtg-star.is-active{
  border-color:#fbbf24; color:#fbbf24; box-shadow:0 0 0 5px rgba(251,191,36,.18);
  transform: translateY(-1px);
}
.rtg-star:hover{ transform: translateY(-1px); }
.rtg-star.is-disabled{ opacity:.6; cursor:not-allowed; }
.rtg-picker-help{ margin-top:6px; color:#64748b; }

/* Field */
.rtg-field{ margin-top: 12px; }
.rtg-label{ display:block; font-size:.9rem; font-weight:700; color:#334155; margin-bottom:6px; }
.rtg-textarea{
  width:100%; min-height:92px; resize:vertical; border-radius:14px; padding:10px 12px;
  border:2px solid #e5e7eb; outline:none; transition:.2s;
  background:linear-gradient(180deg,#f8fafc,#ffffff); color:#0f172a; font-size:.95rem;
}
.rtg-textarea:focus{ border-color:#3b82f6; box-shadow:0 0 0 5px rgba(59,130,246,.14); }

/* Alerts */
.rtg-alert-err{
  margin-top:10px; color:#b91c1c; background:#fef2f2; border:1px solid #fecaca;
  padding:10px 12px; border-radius:12px; font-size:.9rem;
}
.rtg-alert-ok{
  margin-top:10px; color:#065f46; background:#ecfdf5; border:1px solid #a7f3d0;
  padding:10px 12px; border-radius:12px; font-size:.9rem;
}

/* Footer */
.rtg-footer{
  display:flex; align-items:center; justify-content:flex-end; gap:8px;
  padding: 12px 20px; border-top:1px solid rgba(226,232,240,.8);
}
.rtg-btn{
  height:40px; padding:0 14px; border-radius:12px; font-weight:800;
  border:0; cursor:pointer; transition:.18s;
  display:inline-flex; align-items:center; gap:8px;
}
.rtg-btn.primary{
  background: linear-gradient(135deg,#3b82f6,#2563eb); color:#fff;
  box-shadow: 0 8px 18px rgba(37,99,235,.28);
}
.rtg-btn.primary:hover{ transform: translateY(-1px); filter: brightness(1.02); }
.rtg-btn.primary.is-disabled{ opacity:.6; cursor:not-allowed; box-shadow:none; }

.rtg-btn.ghost{
  background:#fff; border:1px solid #e5e7eb; color:#334155; font-weight:700;
}
.rtg-btn.ghost:hover{ background:#f8fafc; }

.rtg-btn.rate{
  border:0; background: linear-gradient(135deg,#f59e0b,#ea580c);
  color:#fff; font-weight:900; border-radius:12px;
  box-shadow:0 10px 20px rgba(234,88,12,.25);
}

/* Spinner */
.rtg-spinner{
  width:16px; height:16px; border-radius:999px; border:2px solid #fff; border-top-color: transparent;
  animation: rtg-spin .8s linear infinite;
}
@keyframes rtg-spin{ to { transform: rotate(360deg); } }

/* Bas note */
.rtg-bottom-note{
  margin: 8px 20px 0; padding-top: 10px; border-top: 1px solid rgba(226,232,240,.8);
  display: flex; gap: 8px; align-items: center; justify-content: center;
  color: #6185be; font-weight: 600; font-size: .85rem;
}
.rtg-bottom-dot{
  width: 6px; height: 6px; border-radius: 999px; background: #60a5fa;
}

/* ---------------- Toast & Dialog (bleu) ---------------- */
.rtg-toast{
  position: fixed; top: 16px; right: 16px; z-index: 2147483647;
}
.rtg-toast-inner{
  display: inline-flex; align-items: center; gap: 8px;
  background: #1d4ed8; color: #fff; border-radius: 12px;
  padding: 10px 14px; box-shadow: 0 10px 22px rgba(29,78,216,.28);
  border: 1px solid rgba(255,255,255,.18);
}
.rtg-toast-icon{ flex-shrink: 0; }

.rtg-success-overlay{
  position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.45);
  display: grid; place-items: center; padding: 20px;
}
.rtg-success-card{
  width: min(92vw, 360px); background: #fff; border-radius: 18px; padding: 20px;
  border: 1px solid rgba(226,232,240,.9); text-align: center;
  box-shadow: 0 24px 60px rgba(15,23,42,.26);
}
.rtg-success-icon{
  width: 56px; height: 56px; border-radius: 999px; margin: 0 auto 8px;
  display: grid; place-items: center; color: #16a34a;
  background: #dcfce7;
}
.rtg-success-title{ margin: 6px 0 2px; color:#0f172a; font-weight: 800; }
.rtg-success-text{ margin: 0; color:#475569; font-size: .95rem; }
.rtg-success-btn{
  margin-top: 12px; padding: 10px 16px; border: 0; border-radius: 10px;
  background: #2563eb; color: #fff; font-weight: 800; cursor: pointer;
  box-shadow: 0 8px 18px rgba(37,99,235,.28);
}
.rtg-success-btn:hover{ filter: brightness(1.05); }
`;

let RATING_CSS_INJECTED = false;
function injectRatingCss() {
  if (RATING_CSS_INJECTED) return;
  if (typeof document === "undefined") return;
  const el = document.createElement("style");
  el.id = "rating-modal-inline-css";
  el.textContent = RATING_CSS;
  document.head.appendChild(el);
  RATING_CSS_INJECTED = true;
}

/* =========================
   Utils
========================= */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const getToken = (override) => {
  if (override) return override;
  try { return sessionStorage.getItem("tokenGuard") || null; } catch { return null; }
};

function useFocusTrap(active) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    const focusable = root.querySelectorAll(
      'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const onKey = (e) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
      if (e.key === "Escape") {
        root.dispatchEvent(new CustomEvent("ratingmodal:request-close", { bubbles: true }));
      }
    };

    document.addEventListener("keydown", onKey);
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);
  return ref;
}

/* ---------------- Overlays globaux via Portal (bleus) ---------------- */
function RatingToast({ open, message }) {
  if (!open || !message) return null;
  return createPortal(
    <div className="rtg-toast">
      <div className="rtg-toast-inner">
        <FaCheck className="rtg-toast-icon" />
        <span>{message}</span>
      </div>
    </div>,
    document.body
  );
}

function RatingSuccessDialog({ open, title, text, onOk }) {
  if (!open) return null;
  return createPortal(
    <div className="rtg-success-overlay" role="dialog" aria-modal="true">
      <div className="rtg-success-card">
        <div className="rtg-success-icon">
          <FaCheck size={22} />
        </div>
        <h4 className="rtg-success-title">{title}</h4>
        {text ? <p className="rtg-success-text">{text}</p> : null}
        <button className="rtg-success-btn" onClick={onOk}>
          OK
        </button>
      </div>
    </div>,
    document.body
  );
}

/* =========================
   Stars (sélecteur)
========================= */
function StarsPicker({ value, onChange, max = 5, disabled = false }) {
  const [hover, setHover] = useState(0);
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const cur = hover || value;

  return (
    <div className="rtg-stars" role="radiogroup" aria-label="Note">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !disabled && onChange?.(n)}
          className={`rtg-star ${disabled ? "is-disabled" : ""} ${n <= cur ? "is-active" : ""}`}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} étoile${n>1?'s':''}`}
        >
          <FaStar />
        </button>
      ))}
    </div>
  );
}

/* =========================
   Modal principal
========================= */
export default function RatingModal({
  open,
  onClose,
  articleId,
  articleTitle,
  initialAverage = 0,
  initialCount = 0,
  endpoint,               // string | (id)=>string
  tokenOverride,
  allowComment = true,
  maxStars = 5,
  onSubmitSuccess,        // (payload) => void
  mode = "create",        // "create" | "edit"
  initialMyRating = 0,
  initialMyReview = "",
  size = "compact",       // "compact" | "default"
}) {
  // Injecte la CSS une fois au montage
  useEffect(() => { injectRatingCss(); }, []);

  const token = getToken(tokenOverride);
  const [avg, setAvg] = useState(Number(initialAverage || 0));
  const [count, setCount] = useState(Number(initialCount || 0));
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // overlays
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogText, setDialogText] = useState("");
  const toastTimer = useRef(null);
  const autoCloseTimer = useRef(null);

  useEffect(() => { setAvg(Number(initialAverage || 0)); }, [initialAverage]);
  useEffect(() => { setCount(Number(initialCount || 0)); }, [initialCount]);

  useEffect(() => {
    if (!open) return;
    setError(""); setDone(false);
    if (mode === "edit") {
      setRating(Number(initialMyRating || 0));
      setComment(String(initialMyReview || ""));
    } else {
      setRating(0);
      setComment("");
    }
  }, [open, mode, initialMyRating, initialMyReview]);

  useEffect(() => {
    return () => {
      clearTimeout(toastTimer.current);
      clearTimeout(autoCloseTimer.current);
    };
  }, []);

  const modalRef = useFocusTrap(open);

  const optimistic = useMemo(() => {
    if (!rating) return { nextAvg: avg, nextCount: count };
    const nextCount = count + 1;
    const nextAvg = ((avg * count) + rating) / nextCount;
    return { nextAvg, nextCount };
  }, [avg, count, rating]);

  const resolvedEndpoint = useMemo(() => {
    if (typeof endpoint === 'function') return endpoint(articleId);
    if (typeof endpoint === 'string' && endpoint) return endpoint.replace(":id", String(articleId));
    return `/articles/${articleId}/ratings`;
  }, [endpoint, articleId]);

  const canSubmit = !!articleId && rating >= 1 && rating <= maxStars && !loading;

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

    clearTimeout(autoCloseTimer.current);
    autoCloseTimer.current = setTimeout(() => {
      setDialogOpen(false);
      onDone?.();
      onClose?.();
    }, 2200);
  };

  async function submit() {
    if (!canSubmit) return;
    setLoading(true); setError("");
    try {
      const headers = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const payload = { rating, ...(allowComment && comment.trim() ? { review: comment.trim() } : {}) };
      const { data } = await axios.post(resolvedEndpoint, payload, { headers, withCredentials: false });

      const body   = data?.data ?? data ?? {};
      const srvAvg = Number(body?.rating_average ?? body?.average ?? body?.avg ?? NaN);
      const srvCnt = Number(body?.rating_count   ?? body?.count   ?? body?.total ?? NaN);

      if (Number.isFinite(srvAvg) && Number.isFinite(srvCnt)) {
        setAvg(srvAvg); setCount(srvCnt);
      } else {
        setAvg(optimistic.nextAvg); setCount(optimistic.nextCount);
      }
      setDone(true);

      onSubmitSuccess?.({
        articleId,
        rating,
        rating_average: Number.isFinite(srvAvg) ? srvAvg : optimistic.nextAvg,
        rating_count:   Number.isFinite(srvCnt) ? srvCnt : optimistic.nextCount,
        my_rating:      typeof body?.my_rating === "number" ? body.my_rating : rating,
        my_review:      typeof body?.my_review === "string" ? body.my_review : (comment || ""),
        status:         body?.status || null,
      });

      showToastThenDialog(
        "Note enregistrée",
        "Merci pour votre avis !",
        "Votre note a bien été prise en compte."
      );
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Erreur réseau";
      setError(msg);
    } finally { setLoading(false); }
  }

  if (!open) {
    // Overlays restent montés (comme OTP)
    return (
      <>
        <RatingToast open={toastOpen} message={toastMsg} />
        <RatingSuccessDialog
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

  return (
    <>
      <div
        className={`rtg-backdrop ${size === "compact" ? "is-compact" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rtg-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          ref={modalRef}
          className={`rtg-modal ${size === "compact" ? "is-compact" : ""}`}
          onKeyDown={(e) => { if (e.key === 'Escape') onClose?.(); }}
          onRatingmodalRequestClose={onClose}
        >
          <button className="rtg-close" aria-label="Fermer" onClick={onClose}>
            ×
          </button>

          {/* HEADER BLEU (glass + glow) */}
          <div className="rtg-headbar">
            <div className="rtg-headbar-row">
              <div className="rtg-headbar-title">
                <h2 id="rtg-title" className={`rtg-title ${size === "compact" ? "is-compact" : ""}`}>
                  {mode === "edit" ? "Modifier ma note" : "Donner une note"}
                </h2>
                <div className="rtg-headbar-badge">Qualité</div>
              </div>
              <div className="rtg-headbar-date">{new Date().toLocaleString()}</div>
            </div>
            <div className="rtg-headbar-sub">
              {articleTitle ? (
                <span title={articleTitle}>Article&nbsp;: <strong>{articleTitle}</strong></span>
              ) : (
                <span>Attribuez une note et, si vous le souhaitez, un avis.</span>
              )}
            </div>
            <div className="rtg-headbar-deco" />
          </div>

          {/* CONTENU */}
          <div className="rtg-body">
            {/* Stat actuelle */}
            <div className="rtg-stat">
              <div className="rtg-stat-label">Note actuelle</div>
              <div className="rtg-stat-right">
                <span className="rtg-stat-avg">{avg.toFixed(2)}</span>
                <span className="rtg-stat-max">/ {maxStars}</span>
                <span className="rtg-stat-sep">•</span>
                <span className="rtg-stat-count">{count} avis</span>
              </div>
            </div>

            {/* Picker */}
            <div className="rtg-picker">
              <StarsPicker value={rating} onChange={setRating} max={maxStars} />
              <div className="rtg-picker-help">
                {rating ? `Votre note : ${rating}/${maxStars}` : "Cliquez sur une étoile pour noter"}
              </div>
            </div>

            {/* Avis (optionnel) */}
            {allowComment && (
              <div className="rtg-field">
                <label className="rtg-label">Avis (facultatif)</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="rtg-textarea"
                  placeholder="Partagez brièvement votre ressenti…"
                />
              </div>
            )}

            {error && (
              <div className="rtg-alert-err" role="alert">
                {error}
              </div>
            )}

            {done && !error && (
              <div className="rtg-alert-ok" role="status">
                Merci pour votre note !
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="rtg-footer">
            <button type="button" onClick={onClose} className="rtg-btn ghost">
              Annuler
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className={`rtg-btn primary ${!canSubmit ? "is-disabled" : ""}`}
            >
              {loading && <span className="rtg-spinner" aria-hidden />}
              <span>{mode === "edit" ? "Mettre à jour" : "Envoyer ma note"}</span>
            </button>
          </div>

          {/* Bas “style share” */}
          <div className="rtg-bottom-note">
            <div className="rtg-bottom-dot" />
            <span>Vos retours aident à améliorer la qualité du contenu.</span>
            <div className="rtg-bottom-dot" />
          </div>
        </div>
      </div>

      {/* Overlays globaux (toujours montés) */}
      <RatingToast open={toastOpen} message={toastMsg} />
      <RatingSuccessDialog
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

/* =========================
   Bouton helper (optionnel)
========================= */
export function RateButton({ onClick, className = "", label = "Noter", size = "md" }) {
  const sz = size === 'sm' ? 'h-9 px-3 text-sm' : size === 'lg' ? 'h-11 px-5 text-base' : 'h-10 px-4 text-sm';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rtg-btn rate ${sz} ${className}`}
      title="Donner une note"
    >
      ★ {label}
    </button>
  );
}
