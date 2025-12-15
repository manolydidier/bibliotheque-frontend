// src/components/layout/Footer.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaArrowRight,
  FaCheckCircle,
  FaInfoCircle,
  FaExclamationTriangle,
  FaCircleNotch,
} from 'react-icons/fa';
import axios from 'axios';
import './Footer.css'; // 👈 nouveau

// 🔐 Helper très simple pour savoir si l'utilisateur est admin
const getIsAdmin = () => {
  try {
    const role = localStorage.getItem('user_role');
    return role === 'admin' || role === 'superadmin';
  } catch {
    return false;
  }
};

// 🔔 Petit composant pour le toast de succès newsletter
const NewsletterToast = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div
      className="
        fixed inset-0 z-[120] flex items-start justify-center
        pt-16 px-4
      "
      aria-live="polite"
    >
      {/* Backdrop cliquable pour fermer */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Fermer la notification"
      />

      {/* Carte de toast */}
      <div
        className="
          relative max-w-md w-full rounded-2xl 
          bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95
          border border-emerald-500/40
          shadow-[0_20px_60px_rgba(15,23,42,0.85)]
          px-5 py-4 text-white
          animate-[toast-in_0.18s_ease-out]
        "
      >
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <FaCheckCircle className="text-emerald-400 text-xl" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1 text-sm sm:text-base">
              Abonnement confirmé
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="
              ml-2 text-slate-400 hover:text-slate-100
              rounded-full p-1
              transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60
            "
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Barre de progression */}
        <div className="mt-3 w-full h-[2px] bg-slate-700/80 rounded overflow-hidden">
          <div className="h-full w-full bg-emerald-400 animate-[toastbar_2.2s_linear]" />
        </div>
      </div>
    </div>
  );
};

// Petit sous-composant pour le statut de plateforme
const StatusBadge = ({ status, detail, updatedAt }) => {
  let icon = FaInfoCircle;
  let text = 'Statut inconnu';
  let color = 'text-slate-300';
  let dot = 'bg-slate-400';

  if (status === 'online') {
    icon = FaCheckCircle;
    text = 'En ligne';
    color = 'text-emerald-300';
    dot = 'bg-emerald-400 animate-[pulse-soft_1.8s_ease-out_infinite]';
  } else if (status === 'degraded') {
    icon = FaExclamationTriangle;
    text = 'Service dégradé';
    color = 'text-amber-300';
    dot = 'bg-amber-400';
  } else if (status === 'offline') {
    icon = FaExclamationTriangle;
    text = 'Hors ligne';
    color = 'text-red-300';
    dot = 'bg-red-500';
  }

  return (
    <div className="flex items-start gap-2 text-xs text-slate-400">
      <span className={`mt-[3px] h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <div>
        <div className="flex items-center gap-1.5">
          {React.createElement(icon, { className: `${color} text-xs`, 'aria-hidden': true })}
          <span className={`font-medium ${color}`}>{text}</span>
        </div>
        {detail && (
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400 line-clamp-2">
            {detail}
          </p>
        )}
        {updatedAt && (
          <p className="mt-0.5 text-[10px] text-slate-500">
            Maj&nbsp;: {new Date(updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [showToast, setShowToast] = useState(false);

  // 🔁 Infos dynamiques de plateforme
  const [platformStatus, setPlatformStatus] = useState({
    status: 'online',
    detail: 'Plateforme opérationnelle.',
    updated_at: null,
  });
  const [statusLoading, setStatusLoading] = useState(false);

  // 🔁 Dernières mises à jour (commits GitHub, via backend Laravel)
  const [recentUpdates, setRecentUpdates] = useState([
    {
      id: 'fallback-1',
      title: 'Initialisation de la plateforme',
      date: '2025-06-06',
      repo: 'bibliotheque',
      type: 'init',
    },
  ]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  const footerLinks = {
    plateforme: [
      { label: 'Accueil', href: '/' },
      { label: 'Articles', href: '/articles' },
      { label: 'Paramètres', href: '/settings' },
      { label: 'À propos', href: '/about' },
    ],
    ressources: [
      { label: 'Documentation', href: '/documentation' },
      { label: "Guide d'utilisation", href: '/guide' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Dashboard', href: '/dashboard' }, // filtré pour non-admin plus bas
    ],
    legal: [
      { label: 'Mentions légales', href: '/termsofuse', tab: 'terms' },
      { label: 'Politique de confidentialité', href: '/termsofuse', tab: 'privacy' },
      { label: "Conditions d'utilisation", href: '/termsofuse', tab: 'terms' },
      { label: 'Configuration', href: '/configuration' },
    ],
  };

  const socialLinks = [
    { icon: FaLinkedin, href: '#', label: 'LinkedIn' },
    { icon: FaTwitter, href: '#', label: 'Twitter' },
    { icon: FaFacebook, href: '#', label: 'Facebook' },
    { icon: FaInstagram, href: '#', label: 'Instagram' },
  ];

  // ⚙️ baseURL fallback
  axios.defaults.baseURL = axios.defaults.baseURL || '/api';

  // ✅ Calcul du droit admin (une seule fois au montage)
  const [isAdmin] = useState(getIsAdmin);

  // Liens RESSOURCES filtrés (Dashboard caché si non-admin)
  const ressourcesLinks = isAdmin
    ? footerLinks.ressources
    : footerLinks.ressources.filter((link) => link.href !== '/dashboard');

  // 🔁 Chargement du statut + des mises à jour
  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        setStatusLoading(true);
        const { data } = await axios.get('/platform/status');
        if (cancelled) return;

        setPlatformStatus({
          status: data?.status || 'online',
          detail: data?.detail || data?.message || 'Plateforme opérationnelle.',
          updated_at: data?.updated_at || data?.updatedAt || null,
        });
      } catch (err) {
        // silencieux
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    };

    const fetchUpdates = async () => {
      try {
        setUpdatesLoading(true);
        const { data } = await axios.get('/platform/updates', {
          params: { limit: 3 },
        });

        if (cancelled) return;

        const raw = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : [];

        const normalized = raw.slice(0, 3).map((item, index) => ({
          id: item.id || item.sha || index,
          title: item.message || item.title || 'Mise à jour',
          date: item.date || item.created_at || item.createdAt || null,
          repo: item.repo || item.repository || 'bibliotheque-frontend',
          type: 'commit',
        }));

        if (normalized.length) {
          setRecentUpdates(normalized);
        }
      } catch (err) {
        // silencieux : on garde le fallback
      } finally {
        if (!cancelled) setUpdatesLoading(false);
      }
    };

    fetchStatus();
    fetchUpdates();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setShowToast(false);

    const trimmed = email.trim();

    if (!trimmed) {
      setErrorMsg('Veuillez saisir une adresse email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg('Adresse email invalide.');
      return;
    }

    try {
      setSubmitting(true);

      const { data } = await axios.post('/newsletter/subscribe', {
        email: trimmed,
      });

      const msg =
        data?.message ||
        (data?.already_subscribed
          ? 'Vous êtes déjà abonné à la newsletter.'
          : 'Merci, vous êtes maintenant abonné.');

      setSuccessMsg(msg);
      setErrorMsg('');
      setEmail('');
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
      }, 2300);
    } catch (err) {
      let msg =
        'Une erreur est survenue. Merci de réessayer dans quelques instants.';

      if (err?.response?.status === 422) {
        msg =
          err.response.data?.message ||
          'Adresse email invalide ou déjà utilisée.';
      }

      setErrorMsg(msg);
      setSuccessMsg('');
      setShowToast(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper pour construire le path + query des liens légaux
  const buildLegalTo = (link) => {
    if (!link.tab) {
      return link.href;
    }
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', link.tab);
    return `${link.href}?${searchParams.toString()}`;
  };

  return (
    <>
      {/* Toast newsletter */}
      <NewsletterToast
        message={showToast ? successMsg : ''}
        onClose={() => setShowToast(false)}
      />

      <footer className="footer-root mt-20">
        {/* Newsletter Section */}
        <div className="footer-section-border">
          <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">
            <div className="grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)] gap-8 sm:gap-10 items-center">
              <div>
                <p className="uppercase tracking-[0.2em] text-[11px] text-slate-400 mb-2">
                  newsletter
                </p>
                <h3 className="text-2xl sm:text-3xl font-semibold mb-3 footer-title-gradient">
                  Restez informé
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                  Recevez les dernières actualités, analyses et contenus
                  publiés sur la plateforme, directement dans votre boîte
                  mail.
                </p>

                {/* Statut + dernières mises à jour */}
                <div className="mt-5 space-y-3 text-xs text-slate-400">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {statusLoading ? (
                      <div className="flex items-center gap-2 text-slate-400 text-xs">
                        <FaCircleNotch className="animate-spin text-slate-300" />
                        <span>Chargement du statut de la plateforme…</span>
                      </div>
                    ) : (
                      <StatusBadge
                        status={platformStatus.status}
                        detail={platformStatus.detail}
                        updatedAt={platformStatus.updated_at}
                      />
                    )}
                  </div>

                  {/* Dernières mises à jour */}
                  <div className="mt-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-1.5">
                      dernières mises à jour
                    </p>
                    {updatesLoading ? (
                      <div className="space-y-1.5 text-[11px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-16 rounded-full bg-slate-700/60 animate-pulse" />
                          <span className="h-1.5 w-10 rounded-full bg-slate-800/60 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-20 rounded-full bg-slate-700/60 animate-pulse" />
                          <span className="h-1.5 w-8 rounded-full bg-slate-800/60 animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <ul className="space-y-1.5 text-[11px] text-slate-400">
                        {recentUpdates.map((u) => (
                          <li key={u.id} className="flex items-start gap-2">
                            <span className="mt-[6px] h-1 w-1 rounded-full bg-slate-500" />
                            <span className="truncate">
                              <span className="text-slate-200 font-medium">
                                [{u.repo}] {u.title}
                              </span>
                              {u.date && (
                                <span className="text-slate-500">
                                  {' '}
                                  •{' '}
                                  {new Date(u.date).toLocaleDateString()}
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Formulaire Newsletter */}
              <form
                onSubmit={handleSubscribe}
                className="footer-card flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5"
              >
                <label className="text-xs font-medium text-slate-200 mb-1">
                  Votre adresse email
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@domaine.com"
                    className="
                      flex-1 px-4 py-3 rounded-xl
                      bg-slate-950/40
                      border border-slate-700/60
                      focus:border-sky-400/70
                      focus:outline-none focus:ring-2 focus:ring-sky-500/30
                      transition-all text-sm text-slate-50
                      placeholder:text-slate-500
                    "
                    disabled={submitting}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="
                      px-6 py-3
                      rounded-xl
                      bg-sky-500/90 hover:bg-sky-400
                      disabled:opacity-70 disabled:cursor-not-allowed
                      text-white font-medium
                      transition-all flex items-center justify-center gap-2 whitespace-nowrap
                      shadow-[0_14px_40px_rgba(56,189,248,0.55)]
                      hover:-translate-y-[1px]
                      active:translate-y-[0px] active:shadow-[0_8px_24px_rgba(56,189,248,0.45)]
                    "
                  >
                    {submitting ? 'Envoi…' : "S'abonner"}
                    {!submitting && (
                      <FaArrowRight className="text-sm" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-300 mt-1 flex items-center gap-1.5">
                    <FaExclamationTriangle className="text-[13px]" />
                    <span>{errorMsg}</span>
                  </p>
                )}

                {!errorMsg && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nous n&apos;envoyons que des contenus pertinents. Vous
                    pouvez vous désabonner à tout moment.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {/* Brand Section */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-2xl font-bold footer-title-gradient">
                Plateforme
              </h3>
              <p className="text-slate-400 mb-3 leading-relaxed text-sm">
                Votre source d&apos;information et de ressources pour le
                développement durable, l&apos;innovation et les politiques
                publiques en Afrique.
              </p>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.href}
                    aria-label={social.label}
                    className="footer-social-btn"
                  >
                    <social.icon className="text-lg" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Sections */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-slate-100">
                Plateforme
              </h4>
              <ul className="space-y-3 text-sm">
                {footerLinks.plateforme.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="footer-link inline-flex items-center gap-2 group"
                    >
                      <span className="footer-link-bullet" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4 text-slate-100">
                Ressources
              </h4>
              <ul className="space-y-3 text-sm">
                {ressourcesLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.href}
                      className="footer-link inline-flex items-center gap-2 group"
                    >
                      <span className="footer-link-bullet" />
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-slate-100">
                Contact
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3 text-slate-300">
                  <FaMapMarkerAlt className="mt-1 text-sky-400 flex-shrink-0" />
                  <span>Antananarivo, Madagascar</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <FaPhone className="text-sky-400 flex-shrink-0" />
                  <span>+261 38 32 006 19</span>
                </li>
                <li className="flex items-center gap-3 text-slate-300">
                  <FaEnvelope className="text-sky-400 flex-shrink-0" />
                  <a
                    href="mailto:johary@saf-fjkm.org"
                    className="hover:text-sky-300 transition-colors"
                  >
                    johary@saf-fjkm.org
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom-bar pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left space-y-1">
                <p className="text-slate-400 text-xs sm:text-sm">
                  © {currentYear} Plateforme. Tous droits réservés.
                </p>
                <p className="text-[11px] text-slate-500">
                  Plateforme développée par{' '}
                  <a
                    href="https://md2i.eu"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-300 hover:text-sky-200 underline underline-offset-2"
                  >
                    md2i.eu
                  </a>
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-xs sm:text-sm">
                {footerLinks.legal.map((link, index) => (
                  <Link
                    key={index}
                    to={buildLegalTo(link)}
                    className="footer-link text-xs sm:text-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
