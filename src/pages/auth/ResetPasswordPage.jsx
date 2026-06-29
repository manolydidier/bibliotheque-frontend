// src/pages/auth/ResetPasswordPage.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { resetPassword } from '../../features/auth/passwordActions';
import LoadingComponent from '../../component/loading/LoadingComponent';
import { useTranslation } from 'react-i18next';

/* ─────────────────────────────────────────────
   Validation côté client
   Token Laravel attendu: SHA-256 = 64 chars hex
───────────────────────────────────────────── */
const isValidTokenFormat = (token) => /^[a-f0-9]{64}$/i.test(token ?? '');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '');

/* ─────────────────────────────────────────────
   Barre de force du mot de passe
───────────────────────────────────────────── */
const PasswordStrength = ({ value = '' }) => {
  const { t } = useTranslation();

  const tests = [
    (v) => v.length >= 8,
    (v) => /[A-Z]/.test(v) && /[a-z]/.test(v),
    (v) => /\d/.test(v),
    (v) => /[^A-Za-z0-9]/.test(v),
  ];

  const score = tests.reduce((acc, fn) => acc + (fn(value) ? 1 : 0), 0);

  const label = !value
    ? (t('password_strength_start') || 'Commencez à taper votre mot de passe')
    : score <= 1
      ? (t('strength_very_weak') || 'Très faible')
      : score === 2
        ? (t('strength_weak') || 'Faible')
        : score === 3
          ? (t('strength_good') || 'Bon')
          : (t('strength_strong') || 'Fort');

  const color = !value
    ? 'text-gray-400'
    : score <= 1
      ? 'text-red-500'
      : score === 2
        ? 'text-orange-500'
        : score === 3
          ? 'text-yellow-600'
          : 'text-green-600';

  const bar = !value
    ? 'bg-gray-200'
    : score <= 1
      ? 'bg-red-400'
      : score === 2
        ? 'bg-orange-400'
        : score === 3
          ? 'bg-yellow-400'
          : 'bg-green-500';

  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex gap-1.5 mb-2" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < score ? bar : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <small className={`text-xs font-medium transition-colors duration-300 ${color}`}>
        {label}
      </small>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Icône œil
───────────────────────────────────────────── */
const EyeIcon = ({ open }) => open ? (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
    />
  </svg>
) : (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

/* ─────────────────────────────────────────────
   Illustration cadenas animée
───────────────────────────────────────────── */
const ResetPasswordIllustration = () => (
  <div className="relative">
    <svg width="220" height="220" viewBox="0 0 120 120" className="drop-shadow-xl">
      <defs>
        <linearGradient id="lockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="keyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      <rect x="35" y="50" width="50" height="40" rx="8" fill="url(#lockGradient)" />
      <path
        d="M45 50 V35 A15 15 0 0 1 75 35 V45"
        stroke="url(#lockGradient)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="60" cy="65" r="4" fill="white" opacity="0.95" />
      <rect x="58" y="67" width="4" height="8" fill="white" opacity="0.95" />

      <g className="animate-pulse">
        <rect x="90" y="30" width="20" height="4" rx="2" fill="url(#keyGradient)" />
        <rect x="105" y="25" width="4" height="6" fill="url(#keyGradient)" />
        <rect x="105" y="33" width="4" height="6" fill="url(#keyGradient)" />
        <circle cx="92" cy="32" r="6" fill="url(#keyGradient)" />
        <circle cx="92" cy="32" r="3" fill="white" />
      </g>

      <g className="animate-bounce">
        <circle cx="25" cy="25" r="2" fill="#fbbf24" opacity="0.7" />
        <circle cx="95" cy="15" r="1.5" fill="#f59e0b" opacity="0.8" />
        <circle cx="15" cy="45" r="1" fill="#fbbf24" opacity="0.6" />
        <circle cx="105" cy="55" r="2" fill="#f59e0b" opacity="0.7" />
      </g>
    </svg>

    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-3xl animate-pulse" />
  </div>
);

/* ─────────────────────────────────────────────
   Icône sécurité
───────────────────────────────────────────── */
const SecurityIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
    <path
      d="M12 2L3 7V12C3 16.55 6.84 20.74 9.91 21.59C11.26 22 12.74 22 14.09 21.59C17.16 20.74 21 16.55 21 12V7L12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12L11 14L15 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ─────────────────────────────────────────────
   Countdown rate-limit
───────────────────────────────────────────── */
const RateLimitCountdown = ({ seconds, onDone }) => {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (left <= 0) {
      onDone?.();
      return;
    }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onDone]);

  return <span className="font-bold tabular-nums">{left}s</span>;
};

/* ─────────────────────────────────────────────
   Page principale
───────────────────────────────────────────── */
const ResetPasswordPage = () => {
  const { t, i18n } = useTranslation();
  const [sp] = useSearchParams();
  const dispatch = useDispatch();

  /* URL params */
  const token = sp.get('token') ?? '';
  const emailFromLink = sp.get('email') ?? '';

  /* Validation lien */
  const tokenOk = useMemo(() => isValidTokenFormat(token), [token]);
  const emailOk = useMemo(() => isValidEmail(emailFromLink), [emailFromLink]);
  const linkOk = tokenOk && emailOk;

  /* State */
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [caps, setCaps] = useState({ p: false, c: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);
  const [rateSecs, setRateSecs] = useState(null);
  const [copied, setCopied] = useState(false);

  /* Validation soumission */
  const valid = useMemo(
    () => linkOk && password.length >= 8 && password === confirm,
    [linkOk, password, confirm]
  );

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailFromLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!linkOk || !valid) return;

    setErr(null);
    setRateSecs(null);

    try {
      setBusy(true);

      await dispatch(
        resetPassword({
          email: emailFromLink,
          token,
          password,
          password_confirmation: confirm,
          langue: i18n.language,
        })
      ).unwrap();

      setDone(true);
    } catch (ex) {
      if (ex?.status === 429 || ex?.statusCode === 429) {
        const retry = parseInt(ex?.retryAfter ?? ex?.seconds ?? 60, 10);
        setRateSecs(Number.isNaN(retry) ? 60 : retry);
        return;
      }

      const msg =
        ex?.message ||
        ex?.errors?.email?.[0] ||
        ex?.errors?.token?.[0] ||
        ex?.errors?.password?.[0] ||
        t('unexpected_error') ||
        'Erreur inattendue';

      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  /* ── Lien invalide ── */
  if (!linkOk) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-50 via-red-50 to-rose-100 p-6">
        <div className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-100 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-200/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-rose-200/30 rounded-full blur-2xl" />
          </div>

          <div className="relative inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-5">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>

          <h2 className="relative text-xl font-bold text-gray-800 mb-2">
            {t('invalid_link_title') || 'Lien invalide ou expiré'}
          </h2>

          <p className="relative text-gray-500 text-sm mb-2">
            {!tokenOk && !emailOk
              ? (t('invalid_link_both') || "Le lien ne contient pas de token ni d'email valide.")
              : !tokenOk
                ? (t('invalid_link_token') || 'Le token est manquant, malformé ou expiré.')
                : (t('invalid_link_email') || "L'adresse e-mail du lien est invalide.")}
          </p>

          <p className="relative text-gray-400 text-xs mb-6">
            {t('invalid_link_hint') || 'Utilisez le lien reçu par e-mail sans le modifier.'}
          </p>

          <Link
            to="/forgot-password"
            className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('request_new_link') || 'Demander un nouveau lien'}
          </Link>
        </div>
      </div>
    );
  }

  /* ── UI principale ── */
  return (
    <div className="fixed inset-0 z-5 min-h-screen w-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-100">
      {/* Ornements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-[32rem] h-[32rem] bg-gradient-to-r from-blue-400/10 to-sky-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-gradient-to-r from-indigo-400/5 to-blue-400/5 rounded-full blur-2xl" />
      </div>

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Panneau gauche */}
        <aside className="hidden lg:flex items-center justify-center p-12">
          <div className="text-center max-w-md">
            <div className="mb-10 flex justify-center">
              <ResetPasswordIllustration />
            </div>

            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-3">
              {t('reset_password') || 'Réinitialiser le mot de passe'}
            </h2>

            <p className="text-gray-600 text-sm leading-relaxed">
              {t('reset_password_sub') || 'Définissez un nouveau mot de passe sécurisé pour votre compte.'}
            </p>

            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full text-blue-700 text-xs font-semibold">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 2L3 7V12C3 16.55 6.84 20.74 9.91 21.59C11.26 22 12.74 22 14.09 21.59C17.16 20.74 21 16.55 21 12V7L12 2Z"
                />
              </svg>
              {t('secure_connection') || 'Connexion sécurisée'}
            </div>
          </div>
        </aside>

        {/* Panneau droit */}
        <main className="flex items-center justify-center p-6 lg:p-12">
          <div
            className="w-full max-w-lg backdrop-blur-xl bg-white/80 border border-white/20 rounded-3xl shadow-2xl p-8 relative overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rp-title"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />

            {/* header mobile */}
            <div className="lg:hidden text-center mb-6">
              <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                <SecurityIcon />
              </div>
              <h1
                id="rp-title"
                className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent"
              >
                {t('reset_password') || 'Réinitialiser le mot de passe'}
              </h1>
            </div>

            {done ? (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {t('success') || 'Succès !'}
                  </h3>

                  <p className="text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-200 text-sm">
                    {t('password_updated') || 'Votre mot de passe a été réinitialisé avec succès.'}
                  </p>
                </div>

                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  {t('back_to_login') || 'Retour à la connexion'}
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5" noValidate aria-busy={busy}>
                {/* rate limit */}
                {rateSecs !== null && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl" role="alert">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h3.25a.75.75 0 000-1.5H10.75V5z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-amber-700 text-sm">
                        {t('rate_limit') || 'Trop de tentatives. Réessayez dans'}{' '}
                        <RateLimitCountdown seconds={rateSecs} onDone={() => setRateSecs(null)} />
                      </p>
                    </div>
                  </div>
                )}

                {/* erreur */}
                {err && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <p className="text-red-700 text-sm font-medium">{err}</p>
                    </div>
                  </div>
                )}

                {/* email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('email') || 'Email'}
                  </label>

                  <div className="relative">
                    <input
                      type="email"
                      value={emailFromLink}
                      readOnly
                      tabIndex={-1}
                      aria-readonly="true"
                      aria-label={t('email_locked_label') || 'Email verrouillé par le lien de réinitialisation'}
                      className="w-full pr-24 pl-10 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 cursor-not-allowed select-all text-sm"
                    />

                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                        />
                      </svg>
                    </div>

                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-2">
                      <span className="text-xs text-gray-600 bg-gray-100 border border-gray-200 px-2 py-1 rounded-lg hidden sm:inline">
                        🔒 {t('locked') || 'Verrouillé'}
                      </span>
                      <button
                        type="button"
                        onClick={copyEmail}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
                        title={t('copy_email') || "Copier l'email"}
                      >
                        {copied ? (t('copied') || '✓ Copié') : (t('copy') || 'Copier')}
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500" role="note">
                    {t('email_locked_note') || "L’adresse e-mail est définie par le lien de réinitialisation et ne peut pas être modifiée."}
                  </p>
                </div>

                {/* password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('new_password') || 'Nouveau mot de passe'}
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>

                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setCaps((p) => ({ ...p, p: e.getModifierState('CapsLock') }))}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/60 backdrop-blur-sm hover:bg-white/80 placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label={showPwd ? (t('hide_password') || 'Masquer') : (t('show_password') || 'Afficher')}
                    >
                      <EyeIcon open={showPwd} />
                    </button>
                  </div>

                  {caps.p && (
                    <div className="flex items-center gap-2 text-amber-600 text-xs">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t('capslock_on') || 'Verr. Maj activée'}
                    </div>
                  )}

                  <PasswordStrength value={password} />
                </div>

                {/* confirm */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('confirm_password') || 'Confirmer le mot de passe'}
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>

                    <input
                      type={showPwd2 ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onKeyUp={(e) => setCaps((p) => ({ ...p, c: e.getModifierState('CapsLock') }))}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 bg-white/60 backdrop-blur-sm hover:bg-white/80 placeholder-gray-400 text-sm"
                      placeholder="••••••••"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPwd2((v) => !v)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-blue-600 transition-colors"
                      aria-label={showPwd2 ? (t('hide_password') || 'Masquer') : (t('show_password') || 'Afficher')}
                    >
                      <EyeIcon open={showPwd2} />
                    </button>
                  </div>

                  {caps.c && (
                    <div className="flex items-center gap-2 text-amber-600 text-xs">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {t('capslock_on') || 'Verr. Maj activée'}
                    </div>
                  )}

                  {confirm && (
                    <div className={`flex items-center gap-2 text-xs transition-all duration-300 ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                      {password === confirm ? (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {t('passwords_match') || 'Les mots de passe correspondent'}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {t('passwords_not_match') || 'Les mots de passe ne correspondent pas'}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* submit */}
                <button
                  type="submit"
                  disabled={busy || !valid || rateSecs !== null}
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 shadow-lg transform text-sm ${
                    valid && !busy && rateSecs === null
                      ? 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {busy ? (
                    <span className="flex items-center justify-center gap-3">
                      <LoadingComponent size={6} color="border-white" />
                      {t('loading') || 'Chargement…'}
                    </span>
                  ) : rateSecs !== null ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('retry_in') || 'Réessayer dans'}{' '}
                      <RateLimitCountdown seconds={rateSecs} onDone={() => setRateSecs(null)} />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {t('save') || 'Enregistrer le nouveau mot de passe'}
                    </span>
                  )}
                </button>

                {/* retour */}
                <div className="text-center pt-1">
                  <Link
                    to="/auth"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors duration-300 text-sm font-medium group"
                  >
                    <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                    </svg>
                    {t('back_to_login') || 'Retour à la connexion'}
                  </Link>
                </div>

                {/* conseils */}
                <div className="mt-2 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">
                        {t('security_tips_title') || 'Conseils de sécurité'}
                      </h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        {t('security_tips_body') || 'Utilisez au moins 8 caractères avec majuscules, chiffres et symboles. Ne réutilisez pas un ancien mot de passe.'}
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>

      {/* Bulles décoratives */}
      <div className="pointer-events-none">
        <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-20 animate-pulse" />
        <div
          className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-sky-500 rounded-full opacity-30 animate-bounce"
          style={{ animationDelay: '1s' }}
        />
        <div
          className="absolute top-1/4 -left-6 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-25 animate-ping"
          style={{ animationDelay: '2s' }}
        />
      </div>
    </div>
  );
};

export default ResetPasswordPage;