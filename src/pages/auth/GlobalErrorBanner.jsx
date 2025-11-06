// src/component/feedback/GlobalErrorBanner.jsx
import React, { useEffect, useRef } from "react";

export default function GlobalErrorBanner({
  message,
  onClose,
  duration = 5000,
  prominent = true,          // ✅ met en évidence
  focusOnShow = true,        // ✅ focus + scroll
}) {
  const ref = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    // timer de disparition
    timerRef.current = setTimeout(onClose, duration);
    return () => clearTimeout(timerRef.current);
  }, [message, duration, onClose]);

  useEffect(() => {
    if (!message || !ref.current) return;
    // focus + scroll dans le viewport
    if (focusOnShow) {
      ref.current.focus({ preventScroll: true });
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Redémarre la barre de progression CSS
    ref.current.style.setProperty("--banner-duration", `${duration}ms`);
    ref.current.classList.remove("gerr-animate");
    // Trigger reflow pour relancer l’animation
    void ref.current.offsetWidth;
    ref.current.classList.add("gerr-animate");
  }, [message, duration, focusOnShow]);

  if (!message) return null;

  return (
    <div
      ref={ref}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className={`global-error-banner ${prominent ? "prominent" : ""} gerr-animate`}
    >
      <span className="gerr-icon" aria-hidden="true">!</span>
      <span className="gerr-text">{message}</span>
      <button type="button" className="gerr-close" aria-label="Fermer" onClick={onClose}>×</button>
      <span className="gerr-progress" aria-hidden="true" />
    </div>
  );
}
