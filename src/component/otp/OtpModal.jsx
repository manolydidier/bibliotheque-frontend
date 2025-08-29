import React, { useEffect, useMemo, useRef, useState } from 'react';
import './otp.css';
import { useDispatch } from 'react-redux';
import { preVerifyEmail, verifyEmailCode } from '../../features/auth/authActions';
import LoadingComponent from '../loading/LoadingComponent';

const pad2 = (n) => n.toString().padStart(2, '0');

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

/**
 * Props clés:
 * - variant: "modal" | "inline"  (modal par défaut)
 * - size: "compact" | "default"   (compact par défaut)
 */
const OtpModal = ({
  email,
  langue = 'fr',
  intent = 'login',
  initialTtlSec = 120,
  open = false,
  onVerified,
  onClose,
  variant = 'modal',
  size = 'compact',
}) => {
  const dispatch = useDispatch();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const inputsRef = useRef([]);
  const { left, label, reset } = useCountdown(initialTtlSec || 120);

  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '', '', '']);
      setSubmitting(false);
      setResending(false);
      setTimeout(() => inputsRef.current?.[0]?.focus(), 15);
    }
  }, [open]);

  const code = useMemo(() => digits.join(''), [digits]);

  const onChangeDigit = (i, v) => {
    const d = v.replace(/\D/g, '').slice(-1);
    setDigits((arr) => {
      const copy = [...arr];
      copy[i] = d || '';
      return copy;
    });
    if (d && i < 5) inputsRef.current?.[i + 1]?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current?.[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputsRef.current?.[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputsRef.current?.[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const txt = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (txt.length >= 2) {
      e.preventDefault();
      const arr = txt.split('').slice(0, 6);
      while (arr.length < 6) arr.push('');
      setDigits(arr);
      const last = Math.max(0, Math.min(5, txt.length - 1));
      setTimeout(() => inputsRef.current?.[last]?.focus(), 10);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    try {
      const res = await dispatch(verifyEmailCode(email, code, langue));
      if (res?.verified) onVerified?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (left > 0) return;
    setResending(true);
    try {
      const data = await dispatch(preVerifyEmail(email, langue, intent));
      reset(Math.max(30, data?.ttl || 120));
    } finally {
      setResending(false);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputsRef.current?.[0]?.focus(), 10);
    }
  };

  if (!open) return null;

  const Title = (
    <h2 id="otp-title" className={`otp-title ${size === 'compact' ? 'is-compact' : ''}`}>
      {langue === 'fr' ? 'Vérifier votre e-mail' : 'Verify your email'}
    </h2>
  );

  const Sub = (
    <p className={`otp-sub ${size === 'compact' ? 'is-compact' : ''}`}>
      {langue === 'fr'
        ? `Code envoyé à ${email}.`
        : `We sent a code to ${email}.`}
    </p>
  );

  const Content = (
    <>
      {Title}
      {Sub}

      <div className={`otp-inputs ${size === 'compact' ? 'is-compact' : ''}`} onPaste={onPaste}>
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
            className='w-14'
          />
        ))}
      </div>

      <button
        className={`otp-verify ${size === 'compact' ? 'is-compact' : ''}`}
        disabled={submitting || code.length !== 6}
        onClick={handleVerify}
      >
        {submitting ? (
          <span className="otp-progress">
            <LoadingComponent size={6} /> {langue === 'fr' ? 'Vérification…' : 'Verifying…'}
          </span>
        ) : (langue === 'fr' ? 'Vérifier' : 'Verify')}
      </button>

      <div className={`otp-footer ${size === 'compact' ? 'is-compact' : ''}`}>
        <span className="otp-timer">
          {langue === 'fr' ? 'Valable ' : 'Valid '} {label}
        </span>
        <button
          className="otp-resend"
          disabled={left > 0 || resending}
          onClick={handleResend}
          title={left > 0 ? (langue === 'fr' ? 'Veuillez patienter…' : 'Please wait…') : undefined}
        >
          {resending ? (langue === 'fr' ? 'Renvoi…' : 'Resending…') :
            (langue === 'fr' ? 'Renvoyer' : 'Resend')}
        </button>
      </div>
    </>
  );

  if (variant === 'inline') {
    return (
      <div className={`otp-inline ${size === 'compact' ? 'is-compact' : ''}`} aria-labelledby="otp-title">
        {Content}
      </div>
    );
  }

  return (
    <div
      className={`otp-backdrop ${size === 'compact' ? 'is-compact' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-title"
      onClick={(e) => {
        // fermer si on clique sur le backdrop (pas sur la carte)
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`otp-modal ${size === 'compact' ? 'is-compact' : ''}`}>
        <button className="otp-close" aria-label="Fermer" onClick={onClose}>×</button>
        {Content}
      </div>
    </div>
  );
};

export default OtpModal;
