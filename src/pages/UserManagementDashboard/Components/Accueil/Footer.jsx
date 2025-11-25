// src/components/layout/Footer.jsx (ou ton chemin actuel)
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FaLinkedin, 
  FaTwitter, 
  FaFacebook, 
  FaInstagram,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaArrowRight,
} from 'react-icons/fa';
import axios from 'axios';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const footerLinks = {
    plateforme: [
      { label: 'Accueil', href: '/' },
      { label: 'Articles', href: '/articles' },
      { label: 'Paramètres', href: '/settings' },
      { label: 'À propos', href: '/about' }
    ],
    ressources: [
      { label: 'Documentation', href: '/about' },
      { label: 'Guide d\'utilisation', href: '/about' },
      { label: 'FAQ', href: '/about' },
      { label: 'Dashboard', href: '/dashboard' }
    ],
    legal: [
      { label: 'Mentions légales', href: '/termsofuse' },
      { label: 'Politique de confidentialité', href: '/termsofuse' },
      { label: 'Conditions d\'utilisation', href: '/termsofuse' },
      { label: 'Configuration', href: '/configuration' }
    ]
  };

  const socialLinks = [
    { icon: FaLinkedin, href: '#', label: 'LinkedIn', color: 'hover:text-blue-600' },
    { icon: FaTwitter, href: '#', label: 'Twitter', color: 'hover:text-sky-500' },
    { icon: FaFacebook, href: '#', label: 'Facebook', color: 'hover:text-blue-700' },
    { icon: FaInstagram, href: '#', label: 'Instagram', color: 'hover:text-pink-600' }
  ];

  // 🔐 si tu as déjà configuré axios.defaults.baseURL = '/api' ailleurs, tu peux supprimer ça :
  axios.defaults.baseURL = axios.defaults.baseURL || '/api';

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const trimmed = email.trim();

    if (!trimmed) {
      setErrorMsg('Veuillez saisir une adresse email.');
      return;
    }

    // petite validation rapide côté front
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

      setSuccessMsg(
        data?.message ||
        (data?.already_subscribed
          ? 'Vous êtes déjà abonné à la newsletter.'
          : 'Merci, vous êtes maintenant abonné.')
      );
      setEmail('');
    } catch (err) {
      // Gestion simple des erreurs
      if (err?.response?.status === 422) {
        const msg =
          err.response.data?.message ||
          'Adresse email invalide ou déjà utilisée.';
        setErrorMsg(msg);
      } else {
        setErrorMsg(
          'Une erreur est survenue. Merci de réessayer dans quelques instants.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white mt-20">
      {/* Newsletter Section */}
      <div className="border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-2">Restez informé</h3>
              <p className="text-slate-400">
                Recevez les dernières actualités et publications directement dans votre boîte mail
              </p>
            </div>

            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse email"
                className="flex-1 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 focus:border-[#1690FF] focus:outline-none focus:ring-2 focus:ring-[#1690FF]/20 transition-all text-sm"
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-[#1690FF] hover:bg-[#1378d6] disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {submitting ? 'Envoi…' : "S'abonner"}
                {!submitting && <FaArrowRight className="text-sm" />}
              </button>
            </form>
          </div>

          {/* Messages de feedback */}
          {(successMsg || errorMsg) && (
            <div className="mt-4">
              {successMsg && (
                <p className="text-sm text-emerald-400">
                  {successMsg}
                </p>
              )}
              {errorMsg && (
                <p className="text-sm text-red-400">
                  {errorMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-[#1690FF] to-blue-400 bg-clip-text text-transparent">
              Plateforme
            </h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Votre source d'information et de ressources pour le développement durable et l'innovation en Afrique.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className={`w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/50 border border-slate-700 transition-all ${social.color} hover:border-current hover:-translate-y-1`}
                >
                  <social.icon className="text-lg" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Sections */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Plateforme</h4>
            <ul className="space-y-3">
              {footerLinks.plateforme.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-slate-400 hover:text-[#1690FF] transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-[#1690FF] transition-all"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4">Ressources</h4>
            <ul className="space-y-3">
              {footerLinks.ressources.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-slate-400 hover:text-[#1690FF] transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-[#1690FF] transition-all"></span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-slate-400">
                <FaMapMarkerAlt className="mt-1 text-[#1690FF] flex-shrink-0" />
                <span>Antananarivo, Madagascar</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <FaPhone className="text-[#1690FF] flex-shrink-0" />
                <span>+261 XX XX XXX XX</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <FaEnvelope className="text-[#1690FF] flex-shrink-0" />
                <a href="mailto:contact@plateforme.mg" className="hover:text-[#1690FF] transition-colors">
                  contact@plateforme.mg
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-700/50">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm text-center md:text-left">
              © {currentYear} Plateforme. Tous droits réservés.
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              {footerLinks.legal.map((link, index) => (
                <Link
                  key={index}
                  to={link.href}
                  className="text-slate-400 hover:text-[#1690FF] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
