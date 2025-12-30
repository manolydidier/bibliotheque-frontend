// src/components/navbar/NavBarMiradia.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSun, FaMoon } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import LanguageSwitcher from '../langue/LanguageSwitcher';
import miradiaLogo from '../../assets/Paysage.png';

/* ========================= Logo ========================= */
const MiradiaLogo = () => (
  <div className="flex items-center">
    <img
      src={miradiaLogo}
      alt="Miradia - Ensemble, résilients face au changement climatique"
      className="h-9 md:h-10 w-auto object-contain"
    />
  </div>
);

/* ========================= Helpers ========================= */
// ✅ IDs HTML SANS accent/espaces (important)
const SECTION_IDS = ['hero', 'beneficiaires', 'workflow', 'pricing', 'contact'];

const scrollToSection = (id) => {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(id);
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const offset = window.scrollY + rect.top - 80;
  window.scrollTo({ top: offset < 0 ? 0 : offset, behavior: 'smooth' });
};

/* ========================= Toggle Dark / Light (Version Épurée) ========================= */
const ThemeToggle = ({ isDark, onToggle }) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`
        relative inline-flex items-center
        w-14 h-8
        rounded-full
        transition-all duration-300
        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        ${isDark
          ? 'bg-slate-900/80 ring-offset-[#075985]'
          : 'bg-sky-100/90 ring-offset-white'}
      `}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      {/* Track déco */}
      <span
        className={`
          absolute inset-[2px] rounded-full
          transition-colors duration-300
          ${isDark
            ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-sky-500'
            : 'bg-gradient-to-r from-amber-50 via-white to-sky-100'}
        `}
      />

      {/* Knob */}
      <span
        className={`
          relative z-[1]
          inline-flex items-center justify-center
          w-6 h-6
          rounded-full shadow-md
          bg-white
          transform transition-transform duration-300
          ${isDark ? 'translate-x-6' : 'translate-x-1'}
        `}
      >
        {isDark ? (
          <FaMoon className="w-3.5 h-3.5 text-sky-500" />
        ) : (
          <FaSun className="w-3.5 h-3.5 text-amber-400" />
        )}
      </span>
    </button>
  );
};

/* ========================= NavBarMiradia ========================= */
const NavBarMiradia = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  // 🌗 Thème
  const [isDark, setIsDark] = useState(false);

  // Mobile & scroll
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(max-width: 990px)').matches
  );
  const [isCompact, setIsCompact] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // ✅ Active section (scroll) seulement pour la home "/"
  const [activeSection, setActiveSection] = useState('hero');

  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  /* Initialisation du thème (localStorage + prefers-color-scheme) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const stored = localStorage.getItem('themeMiradia');
    if (stored === 'dark') {
      setIsDark(true);
      root.classList.add('dark');
    } else if (stored === 'light') {
      setIsDark(false);
      root.classList.remove('dark');
    } else {
      const prefersDark =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  }, []);

  /* Sync du thème avec <html class="dark"> */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('themeMiradia', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('themeMiradia', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  /* Responsive media query */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 990px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler);
    };
  }, []);

  /* ✅ Navigation intelligente:
     - "beneficiaires" => navigate("/beneficiaires")
     - autres sections => scroll sur "/" (ou retour "/" + scroll)
  */
  const go = (id) => {
    setMobileOpen(false);

    // ✅ Page dédiée
    if (id === 'beneficiaires') {
      navigate('/beneficiaires');
      return;
    }

    // ✅ Si on est déjà sur la home, scroll
    if (location.pathname === '/') {
      scrollToSection(id);
      return;
    }

    // ✅ Sinon, on retourne sur la home puis on demandera un scroll (via state)
    navigate('/', { state: { scrollTo: id } });
  };

  /* Scroll effects: compact + hide on scroll down + progress + active section */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onScroll = () => {
      const y = window.scrollY || 0;
      const diff = y - (lastScrollYRef.current || 0);
      lastScrollYRef.current = y;

      // Compact
      if (y > 90 && !isCompact) setIsCompact(true);
      else if (y <= 90 && isCompact) setIsCompact(false);

      // Hide on scroll down, show on scroll up
      const DELTA = 12;
      if (y > 120 && diff > DELTA && !isHidden) {
        setIsHidden(true);
      } else if ((diff < -DELTA || y <= 0) && isHidden) {
        setIsHidden(false);
      }

      // Scroll progress
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? (y / max) * 100 : 0;
      setScrollProgress(Math.max(0, Math.min(100, p)));

      // ✅ Active section uniquement sur la home "/"
      if (location.pathname !== '/') return;

      let current = 'hero';
      for (const sid of SECTION_IDS) {
        const el = document.getElementById(sid);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const top = rect.top;
        if (top <= window.innerHeight * 0.35) {
          current = sid;
        } else {
          break;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isCompact, isHidden, location.pathname]);

  /* Lock scroll when mobile menu open */
  useEffect(() => {
    if (!mobileOpen) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [mobileOpen]);

  const heightClass = isCompact ? 'h-14' : 'h-20';
  const translateClass = isHidden ? '-translate-y-full' : 'translate-y-0';

  // 🎨 Styles selon thème (style plus Office 2024 : propre, plat, sans grosse ombre)
  const navBaseClasses = isDark
    ? `
      bg-gradient-to-r from-slate-950/45 via-slate-900/75 to-slate-900/35
      text-slate-50
      border-slate-800/80
      shadow-none
    `
    : `
      bg-gradient-to-r from-slate-50/15 via-white/25 to-slate-50/45
      text-slate-900
      border-slate-200/90
      shadow-none
    `;

  const linkBaseClasses = isDark
    ? 'text-blue-50/90 hover:text-white'
    : 'text-[#0b5a82] hover:text-[#082f49]';

  const activeLinkClasses = isDark
    ? 'bg-white/10 text-white'
    : 'bg-sky-100 text-[#0b5a82]';

  const progressBarColor = isDark ? 'bg-[#22c55e]' : 'bg-[#0ea5e9]';

  // ✅ "actif" page beneficiaires
  const isBeneficiairesRoute = location.pathname === '/beneficiaires';

  return (
    <>
      <nav
        className={`
          fixed top-0 left-0 w-full z-50
          border-b
          backdrop-blur-xl px-12 md:px-auto
          ${navBaseClasses}
          ${heightClass}
          flex items-center
          transition-all duration-300 ease-out
          ${translateClass}
        `}
        role="navigation"
        aria-label="Miradia main navigation"
      >
        {/* Scroll progress bar */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-transparent">
          <div
            className={`h-full ${progressBarColor} transition-[width] duration-150 ease-linear`}
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="w-full px-4 md:px-6 flex items-center gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => go('hero')}
            className="flex items-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80 rounded-lg transition-transform duration-200 hover:scale-105"
          >
            <MiradiaLogo />
          </button>

          {/* Links (desktop) */}
          {!isMobile && (
            <div className="flex-1 flex justify-center">
              <ul
                className="flex gap-3 md:gap-4 lg:gap-5 text-[15px] md:text-[16px] font-semibold"
                role="menubar"
              >
                <NavItem
                  label={t('nav.home', 'Accueil')}
                  sectionId="hero"
                  active={!isBeneficiairesRoute && activeSection === 'hero'}
                  onClick={go}
                  compact={isCompact}
                  base={linkBaseClasses}
                  activeClass={activeLinkClasses}
                />

                {/* ✅ Lien vers /beneficiaires */}
                <NavItem
                  label={t('nav.beneficiaires', 'Bénéficiaires')}
                  sectionId="beneficiaires"
                  active={isBeneficiairesRoute}
                  onClick={go}
                  compact={isCompact}
                  base={linkBaseClasses}
                  activeClass={activeLinkClasses}
                />

                <NavItem
                  label={t('nav.workflow', 'Workflow')}
                  sectionId="workflow"
                  active={!isBeneficiairesRoute && activeSection === 'workflow'}
                  onClick={go}
                  compact={isCompact}
                  base={linkBaseClasses}
                  activeClass={activeLinkClasses}
                />
                <NavItem
                  label={t('nav.pricing', 'Tarifs')}
                  sectionId="pricing"
                  active={!isBeneficiairesRoute && activeSection === 'pricing'}
                  onClick={go}
                  compact={isCompact}
                  base={linkBaseClasses}
                  activeClass={activeLinkClasses}
                />
                <NavItem
                  label={t('nav.contact', 'Contact')}
                  sectionId="contact"
                  active={!isBeneficiairesRoute && activeSection === 'contact'}
                  onClick={go}
                  compact={isCompact}
                  base={linkBaseClasses}
                  activeClass={activeLinkClasses}
                />
              </ul>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <LanguageSwitcher isDark={isDark} />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

            {/* Burger (mobile) */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80
                  ${isDark ? 'hover:bg-white/10' : 'hover:bg-sky-50'}
                `}
                aria-label={
                  mobileOpen
                    ? t('nav.close_menu', 'Fermer le menu')
                    : t('nav.open_menu', 'Ouvrir le menu')
                }
              >
                <svg
                  className={`w-6 h-6 transition-transform duration-200 ${
                    isDark ? 'text-blue-50' : 'text-[#0b5a82]'
                  } ${mobileOpen ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            className={`
              fixed inset-0 z-[48] backdrop-blur-sm
              transition-opacity duration-300
              ${mobileOpen ? 'opacity-100 bg-black/40' : 'opacity-0 pointer-events-none'}
            `}
            onClick={() => setMobileOpen(false)}
          />

          {/* Sheet */}
          <div
            className={`
              fixed inset-x-0 top-20 z-[49]
              pt-4 pb-6 px-4
              rounded-b-2xl
              shadow-2xl
              transition-all duration-300 ease-out
              ${mobileOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
              ${
                isDark
                  ? 'bg-gradient-to-b from-[#075985] via-[#0369a1] to-[#041f2f] text-blue-50'
                  : 'bg-white text-[#0b5a82]'
              }
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <MiradiaLogo />
              <div className="flex items-center gap-2">
                <LanguageSwitcher isDark={isDark} />
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className={`
                    h-10 w-10 rounded-lg inline-flex items-center justify-center
                    transition-all duration-200
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/80
                    ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-sky-50 hover:bg-sky-100'}
                  `}
                  aria-label={t('nav.close_menu', 'Fermer le menu')}
                >
                  <svg
                    className={`w-5 h-5 ${isDark ? 'text-blue-50' : 'text-[#0b5a82]'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className={`text-xs leading-relaxed ${isDark ? 'text-blue-100/90' : 'text-slate-600'}`}>
                Ensemble, résilients face au changement climatique.
              </p>
            </div>

            <div className="space-y-2">
              <MobileNavItem
                label={t('nav.home', 'Accueil')}
                sectionId="hero"
                active={!isBeneficiairesRoute && activeSection === 'hero'}
                onClick={go}
                isDark={isDark}
              />

              {/* ✅ Lien vers /beneficiaires */}
              <MobileNavItem
                label={t('nav.beneficiaires', 'Bénéficiaires')}
                sectionId="beneficiaires"
                active={isBeneficiairesRoute}
                onClick={go}
                isDark={isDark}
              />

              <MobileNavItem
                label={t('nav.workflow', 'Workflow')}
                sectionId="workflow"
                active={!isBeneficiairesRoute && activeSection === 'workflow'}
                onClick={go}
                isDark={isDark}
              />
              <MobileNavItem
                label={t('nav.pricing', 'Tarifs')}
                sectionId="pricing"
                active={!isBeneficiairesRoute && activeSection === 'pricing'}
                onClick={go}
                isDark={isDark}
              />
              <MobileNavItem
                label={t('nav.contact', 'Contact')}
                sectionId="contact"
                active={!isBeneficiairesRoute && activeSection === 'contact'}
                onClick={go}
                isDark={isDark}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

/* ========================= Sub components ========================= */
const NavItem = ({ label, sectionId, active, onClick, compact, base, activeClass }) => (
  <li role="none">
    <button
      type="button"
      role="menuitem"
      onClick={() => onClick(sectionId)}
      className={`
        relative inline-flex items-center justify-center
        ${compact ? 'py-2' : 'py-2.5'} px-4
        text-[15px] md:text-[16px] font-semibold
        whitespace-nowrap
        rounded-lg
        transition-all duration-200
        ${base}
        ${active ? activeClass : ''}
      `}
    >
      <span className="relative z-[1]">{label}</span>
    </button>
  </li>
);

const MobileNavItem = ({ label, sectionId, active, onClick, isDark }) => (
  <button
    type="button"
    onClick={() => onClick(sectionId)}
    className={`
      w-full text-left px-4 py-3 rounded-xl
      text-[15px] font-semibold
      flex items-center justify-between
      transition-all duration-200
      ${active
        ? (isDark
          ? 'bg-white/10 text-white shadow-lg'
          : 'bg-sky-50 text-[#0b5a82] shadow-sm')
        : (isDark
          ? 'bg-white/0 text-blue-50 hover:bg-white/5'
          : 'bg-sky-50/60 text-[#0b5a82] hover:bg-sky-100')}
    `}
  >
    <span>{label}</span>
    {active && (
      <span
        className={`
          w-1.5 h-1.5 rounded-full
          ${isDark ? 'bg-[#0ea5e9]' : 'bg-[#22c55e]'}
        `}
      />
    )}
  </button>
);

export default NavBarMiradia;
