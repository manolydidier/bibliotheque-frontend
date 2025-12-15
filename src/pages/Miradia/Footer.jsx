// src/components/layout/Footer.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaLinkedin,
  FaTwitter,
  FaFacebook,
  FaInstagram,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
} from 'react-icons/fa';

import miradiaLogo from '../../assets/Miradia_Portrait.png';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();

  const footerLinks = {
    plateforme: [
      { label: 'Accueil', href: '/' },
      { label: 'À propos de MIRADIA', href: '/about' },
      { label: 'Actualités', href: '/articles' },
      { label: 'Ressources', href: '/ressources' },
    ],
    actions: [
      { label: 'Projets & initiatives', href: '/projets' },
      { label: 'Partenaires', href: '/partenaires' },
      { label: 'Communautés locales', href: '/communautes' },
      { label: 'Contact', href: '/contact' },
    ],
    legal: [
      { label: 'Mentions légales', href: '/termsofuse', tab: 'terms' },
      { label: 'Politique de confidentialité', href: '/termsofuse', tab: 'privacy' },
      { label: "Conditions d'utilisation", href: '/termsofuse', tab: 'terms' },
    ],
  };

  const socialLinks = [
    { icon: FaLinkedin, href: '#', label: 'LinkedIn' },
    { icon: FaTwitter, href: '#', label: 'Twitter' },
    { icon: FaFacebook, href: '#', label: 'Facebook' },
    { icon: FaInstagram, href: '#', label: 'Instagram' },
  ];

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
    <footer className="footer-root mt-16 footer-fade-in">
      <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">
        {/* Partie haute : logo + colonnes */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Bloc marque MIRADIA */}
          <div className="lg:col-span-1 space-y-4 footer-col footer-col-delay-0">
            <div className="flex items-center gap-4 footer-logo-wrapper">
              <img
                src={miradiaLogo}
                alt="Logo MIRADIA"
                className="footer-logo h-20 md:h-24 w-auto drop-shadow-md"
              />
              <div>
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight footer-title-gradient">
                  MIRADIA
                </h3>
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300 footer-tagline">
                  Ensemble, résilients face au changement climatique
                </p>
              </div>
            </div>

            <p className="text-slate-300 mb-3 leading-relaxed text-sm mt-3">
              Plateforme collaborative dédiée à l&apos;adaptation, à la
              résilience communautaire et au partage de connaissances pour
              faire face au changement climatique à Madagascar.
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

          {/* Liens Plateforme */}
          <div className="footer-col footer-col-delay-1">
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

          {/* Liens Actions */}
          <div className="footer-col footer-col-delay-2">
            <h4 className="text-lg font-semibold mb-4 text-slate-100">
              Actions &amp; communautés
            </h4>
            <ul className="space-y-3 text-sm">
              {footerLinks.actions.map((link, index) => (
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

          {/* Contact */}
          <div className="footer-col footer-col-delay-3">
            <h4 className="text-lg font-semibold mb-4 text-slate-100">
              Contact
            </h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-slate-300">
                <FaMapMarkerAlt className="mt-1 text-miradia-blue flex-shrink-0" />
                <span>Antananarivo, Madagascar</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <FaPhone className="text-miradia-blue flex-shrink-0" />
                <span>+261 38 32 006 19</span>
              </li>
              <li className="flex items-center gap-3 text-slate-300">
                <FaEnvelope className="text-miradia-blue flex-shrink-0" />
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

        {/* Barre du bas */}
        <div className="footer-bottom-bar pt-6 footer-col footer-col-delay-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left space-y-1">
              <p className="text-slate-400 text-xs sm:text-sm">
                © {currentYear} MIRADIA. Tous droits réservés.
              </p>
              <p className="text-[11px] text-slate-500">
                MIRADIA – Plateforme d&apos;information, de dialogue et
                d&apos;action pour la résilience climatique à Madagascar.
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
  );
};

export default Footer;
