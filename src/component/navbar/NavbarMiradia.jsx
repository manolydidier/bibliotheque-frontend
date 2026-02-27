// src/components/navbar/NavBarMiradia.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { FaSun, FaMoon } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import LanguageSwitcher from "../langue/LanguageSwitcher";
import miradiaLogo from "../../assets/Paysage.png";
import AccordionItem from "./AccordionItem";

/* ========================= Constants ========================= */
const SECTION_IDS = ["hero", "contact"];
const SCROLL_THRESHOLD = 90;
const SCROLL_HIDE_DELTA = 12;
const SCROLL_HIDE_AFTER = 120;

/* ========================= Logo ========================= */
const MiradiaLogo = () => (
  <div className="flex items-center">
    <img
      src={miradiaLogo}
      alt="Miradia – Ensemble, résilients face au changement climatique"
      className="h-9 md:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
    />
  </div>
);

/* ========================= Scroll Helper ========================= */
const scrollToSection = (id) => {
  if (typeof window === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const offset = window.scrollY + el.getBoundingClientRect().top - 90;
  window.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
};

/* ========================= Theme Toggle ========================= */
const ThemeToggle = ({ isDark, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
    aria-pressed={isDark}
    className={`
      relative inline-flex items-center w-14 h-8 rounded-full
      transition-all duration-300 focus:outline-none
      focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2
      ${isDark
        ? "bg-slate-800/80 ring-offset-slate-950 shadow-[0_0_12px_rgba(14,165,233,0.3)]"
        : "bg-sky-100/90 ring-offset-white shadow-inner"}
    `}
  >
    {/* Track gradient */}
    <span
      className={`
        absolute inset-[2px] rounded-full transition-colors duration-300
        ${isDark
          ? "bg-gradient-to-r from-slate-900 via-slate-800 to-sky-600"
          : "bg-gradient-to-r from-amber-50 via-white to-sky-100"}
      `}
    />
    {/* Thumb */}
    <span
      className={`
        relative z-10 inline-flex items-center justify-center
        w-6 h-6 rounded-full shadow-md bg-white
        transform transition-transform duration-300
        ${isDark ? "translate-x-6" : "translate-x-1"}
      `}
    >
      {isDark
        ? <FaMoon className="w-3.5 h-3.5 text-sky-400" />
        : <FaSun  className="w-3.5 h-3.5 text-amber-400" />}
    </span>
  </button>
);

/* ========================= NavItem (Desktop) ========================= */
const NavItem = ({ label, sectionId, active, onClick, compact, isDark }) => (
  <li role="none">
    <button
      type="button"
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={() => onClick(sectionId)}
      className={`
        relative inline-flex items-center justify-center
        ${compact ? "py-1.5" : "py-2"} px-4
        text-[15px] font-semibold whitespace-nowrap rounded-xl
        transition-all duration-200 group
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70
        ${active
          ? isDark
            ? "text-white bg-white/10 shadow-[0_0_16px_rgba(14,165,233,0.18)] backdrop-blur-sm"
            : "text-sky-700 bg-sky-100/80 shadow-sm"
          : isDark
            ? "text-sky-100/80 hover:text-white hover:bg-white/8"
            : "text-sky-800/80 hover:text-sky-900 hover:bg-sky-50/70"}
      `}
    >
      <span className="relative z-10">{label}</span>

      {/* Animated underline */}
      <span
        className={`
          absolute bottom-1 left-4 right-4 h-[2px] rounded-full
          transition-all duration-300 origin-left
          ${active
            ? "scale-x-100 opacity-100"
            : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-60"}
          ${isDark ? "bg-sky-400" : "bg-sky-500"}
        `}
      />
    </button>
  </li>
);

/* ========================= MobileNavItem ========================= */
const MobileNavItem = ({ label, sectionId, active, onClick, isDark }) => (
  <button
    type="button"
    aria-current={active ? "page" : undefined}
    onClick={() => onClick(sectionId)}
    className={`
      w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold
      flex items-center justify-between gap-2
      transition-all duration-200 focus:outline-none
      focus-visible:ring-2 focus-visible:ring-sky-400/70
      ${active
        ? isDark
          ? "bg-white/12 text-white shadow-[0_2px_16px_rgba(14,165,233,0.15)] backdrop-blur-sm border border-white/10"
          : "bg-sky-100/90 text-sky-800 shadow-sm border border-sky-200/60"
        : isDark
          ? "text-sky-100/80 hover:bg-white/6 hover:text-white border border-transparent"
          : "text-sky-800/80 hover:bg-sky-50 border border-transparent"}
    `}
  >
    <span>{label}</span>
    {active && (
      <span
        className={`
          flex-shrink-0 w-2 h-2 rounded-full
          ${isDark
            ? "bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]"
            : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"}
        `}
      />
    )}
  </button>
);

/* ========================= NavBarMiradia ========================= */
const NavBarMiradia = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [isDark, setIsDark] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" &&
      window.matchMedia?.("(max-width: 990px)").matches
  );
  const [isCompact, setIsCompact] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState("hero");
  const [mobileOpen, setMobileOpen] = useState(false);

  const lastScrollYRef = useRef(0);
  const rafRef = useRef(null);

  /* ── Init theme ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const stored = localStorage.getItem("themeMiradia");
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const dark = stored === "dark" || (stored === null && prefersDark);
    setIsDark(dark);
    root.classList.toggle("dark", dark);
  }, []);

  /* ── Sync theme ── */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("themeMiradia", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((p) => !p), []);

  /* ── Responsive ── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 990px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── Navigation ── */
  const go = useCallback((id) => {
    setMobileOpen(false);
    if (id === "plateform") { navigate("/librairie-home"); return; }
    if (id === "beneficiaires") { navigate("/beneficiaires"); return; }
    if (id === "domaines") { navigate("/domaines"); return; }
    if (location.pathname === "/") { scrollToSection(id); return; }
    navigate("/", { state: { scrollTo: id } });
  }, [navigate, location.pathname]);

  /* ── Scroll (RAF-throttled) ── */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const y = window.scrollY;
        const diff = y - lastScrollYRef.current;
        lastScrollYRef.current = y;

        setIsCompact(y > SCROLL_THRESHOLD);
        setIsHidden((prev) => {
          if (y > SCROLL_HIDE_AFTER && diff > SCROLL_HIDE_DELTA) return true;
          if (diff < -SCROLL_HIDE_DELTA || y <= 0) return false;
          return prev;
        });

        const doc = document.documentElement;
        const max = doc.scrollHeight - doc.clientHeight;
        setScrollProgress(max > 0 ? Math.min(100, (y / max) * 100) : 0);

        if (location.pathname !== "/") return;
        let current = "hero";
        for (const sid of SECTION_IDS) {
          const el = document.getElementById(sid);
          if (!el) continue;
          if (el.getBoundingClientRect().top <= window.innerHeight * 0.35) current = sid;
          else break;
        }
        setActiveSection(current);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [location.pathname]);

  /* ── Lock scroll mobile ── */
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = { html: document.documentElement.style.overflow, body: document.body.style.overflow };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev.html;
      document.body.style.overflow = prev.body;
    };
  }, [mobileOpen]);

  /* ── Close mobile menu on route change ── */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* ── Memoised route flags ── */
  const routeFlags = useMemo(() => ({
    isHome: location.pathname === "/",
    isBeneficiaires: location.pathname === "/beneficiaires",
    isDomaines: location.pathname === "/domaines",
    isPlateform: location.pathname === "/librairie-home",
  }), [location.pathname]);

  /* ── Nav items config ── */
  const navItems = useMemo(() => [
    { key: "home",         label: t("nav.home",          "Accueil"),       id: "hero",          active: routeFlags.isHome && activeSection === "hero" },
    { key: "contact",      label: t("nav.contact",       "Contact"),       id: "contact",       active: routeFlags.isHome && activeSection === "contact" },
    { key: "beneficiaires",label: t("nav.beneficiaires", "Bénéficiaires"), id: "beneficiaires", active: routeFlags.isBeneficiaires },
    { key: "domaines",     label: t("nav.domaines",      "Domaines"),      id: "domaines",      active: routeFlags.isDomaines },
    { key: "plateform",    label: t("nav.plateform",     "Plateforme"),    id: "plateform",     active: routeFlags.isPlateform },
  ], [t, routeFlags, activeSection]);

  /* ── Glassmorphism nav styles ── */
  const navGlass = isDark
    ? "bg-slate-950/40 border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-slate-50"
    : "bg-white/30 border-white/60 shadow-[0_8px_32px_rgba(14,165,233,0.08)] text-slate-900";

  const progressColor = isDark ? "bg-sky-400" : "bg-sky-500";

  return (
    <>
      <nav
        role="navigation"
        aria-label="Navigation principale Miradia"
        className={`
          fixed top-0 left-0 w-full z-50
          border-b backdrop-blur-2xl
          px-4 md:px-6
          flex items-center
          transition-all duration-300 ease-out
          ${navGlass}
          ${isCompact ? "h-14" : "h-20"}
          ${isHidden ? "-translate-y-full" : "translate-y-0"}
        `}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-[2px] w-full overflow-hidden">
          <div
            className={`h-full ${progressColor} transition-[width] duration-150 ease-linear shadow-[0_0_8px_rgba(14,165,233,0.6)]`}
            style={{ width: `${scrollProgress}%` }}
            role="progressbar"
            aria-hidden="true"
          />
        </div>

        {/* Inner layout */}
        <div className="w-full flex items-center gap-4 max-w-screen-xl mx-auto">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Retour à l'accueil Miradia"
            className="group flex items-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 rounded-lg"
          >
            <MiradiaLogo />
          </button>

          {/* Desktop nav */}
          {!isMobile && (
            <div className="flex-1 flex justify-center">
              <ul
                className="flex gap-1 lg:gap-2 items-center"
                role="menubar"
                aria-label="Menu principal"
              >
                {navItems.map((item) => (
                  <NavItem
                    key={item.key}
                    label={item.label}
                    sectionId={item.id}
                    active={item.active}
                    onClick={go}
                    compact={isCompact}
                    isDark={isDark}
                  />
                ))}

                {/* Accordion extra */}
                <li role="none">
                  <AccordionItem />
                </li>
              </ul>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 md:gap-3 ml-auto">
            <LanguageSwitcher isDark={isDark} />
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />

            {/* Mobile burger */}
            {isMobile && (
              <button
                type="button"
                aria-label={mobileOpen ? t("nav.close_menu", "Fermer le menu") : t("nav.open_menu", "Ouvrir le menu")}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                onClick={() => setMobileOpen((p) => !p)}
                className={`
                  p-2 rounded-xl transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70
                  ${isDark ? "hover:bg-white/10 text-sky-100" : "hover:bg-sky-50 text-sky-800"}
                `}
              >
                <svg
                  className={`w-6 h-6 transition-transform duration-200 ${mobileOpen ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  {mobileOpen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
            className={`
              fixed inset-0 z-[48] transition-opacity duration-300
              backdrop-blur-sm bg-black/50
              ${mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
            `}
          />

          {/* Drawer */}
          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className={`
              fixed inset-x-0 top-20 z-[49]
              pt-4 pb-6 px-4 rounded-b-2xl
              transition-all duration-300 ease-out
              border-x border-b
              ${mobileOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}
              ${isDark
                ? "bg-slate-950/80 backdrop-blur-2xl border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.7)]"
                : "bg-white/70 backdrop-blur-2xl border-white/60 shadow-[0_16px_48px_rgba(14,165,233,0.12)]"}
            `}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-current/10">
              <MiradiaLogo />
              <div className="flex items-center gap-2">
                <LanguageSwitcher isDark={isDark} />
                <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("nav.close_menu", "Fermer le menu")}
                  className={`
                    h-9 w-9 rounded-xl inline-flex items-center justify-center
                    transition-all duration-200 focus:outline-none
                    focus-visible:ring-2 focus-visible:ring-sky-400/70
                    ${isDark ? "bg-white/10 hover:bg-white/20 text-sky-100" : "bg-sky-50 hover:bg-sky-100 text-sky-800"}
                  `}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer nav items */}
            <nav aria-label="Menu mobile" className="space-y-1.5">
              {navItems.map((item) => (
                <MobileNavItem
                  key={item.key}
                  label={item.label}
                  sectionId={item.id}
                  active={item.active}
                  onClick={go}
                  isDark={isDark}
                />
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default NavBarMiradia;