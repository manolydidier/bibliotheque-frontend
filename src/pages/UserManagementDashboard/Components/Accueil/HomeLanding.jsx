// src/pages/UserManagementDashboard/Components/Accueil/HomeHero.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  FaBookOpen,
  FaUsers,
  FaShieldAlt,
  FaPlay,
  FaArrowRight,
  FaImages,
  FaFileAlt,
  FaSearch,
  FaChartLine,
  FaEye,
  FaCommentDots,
  FaHeart,
  FaLock,
  FaEllipsisH,
  FaUserCircle,
  FaStar,
} from "react-icons/fa";
import { useSelector } from "react-redux";
import axios from "axios";

import useLibraryStats from "../../../../hooks/useLibraryStats";

/* =========================
   Slider de fonctionnalités
========================= */

const SLIDES = [
  {
    id: 1,
    title: "Tous vos rapports centralisés",
    description:
      "Rapports annuels, évaluations de projets, bilans d'activités : retrouvez et partagez facilement les documents SAF FJKM, CARE, ETC & partenaires.",
    stat: "Rapports & documents",
    tag: "Équipes & partenaires",
    icon: FaFileAlt,
    color: "#2563eb",
  },
  {
    id: 2,
    title: "Mémoire visuelle des actions",
    description:
      "Albums photos par région, projet et thème pour vos présentations, ateliers et communications institutionnelles.",
    stat: "Photos & médias",
    tag: "Communication",
    icon: FaImages,
    color: "#0ea5e9",
  },
  {
    id: 3,
    title: "Ressources & guides pratiques",
    description:
      "Articles, fiches techniques et guides méthodologiques accessibles aux invités, membres et équipes terrain selon leurs droits.",
    stat: "Ressources pédagogiques",
    tag: "Tous publics",
    icon: FaBookOpen,
    color: "#8b5cf6",
  },
];

/* =========================
   Données mock colonne droite
========================= */

const DOCS = [
  {
    id: 1,
    title: "Rapport annuel 2024 SAF FJKM",
    category: "Rapports",
    type: "Rapport annuel",
    color: "#2563eb",
    description:
      "Bilan des activités, résultats et perspectives pour l'année 2024.",
    author: "Secrétariat SAF FJKM",
    email: "contact@saf-fjkm.mg",
    date: "5 oct. 2025",
    badge: "Interne",
    privacy: "Visibilité limitée",
    views: 120,
    comments: 6,
    likes: 18,
    rating: "4.3/5",
    favorite: true,
  },
  {
    id: 2,
    title: "Synthèse des projets CARE 2025",
    category: "Rapports",
    type: "Rapport spécial",
    color: "#0ea5e9",
    description:
      "Résumé des interventions CARE par thématique, région et indicateurs clés.",
    author: "CARE Madagascar",
    email: "info@care.org",
    date: "5 nov. 2025",
    badge: "Partenariat",
    privacy: "Partagé",
    views: 3520,
    comments: 35,
    likes: 42,
    rating: "4.9/5",
    favorite: false,
  },
  {
    id: 3,
    title: "Note de cadrage plateforme documentaire",
    category: "Documents",
    type: "Document",
    color: "#8b5cf6",
    description:
      "Document de référence expliquant les objectifs et la gouvernance de la plateforme.",
    author: "Équipe projet",
    email: "plateforme@saf.mg",
    date: "13 nov. 2025",
    badge: "Public",
    privacy: "Visibilité publique",
    views: 210,
    comments: 4,
    likes: 15,
    rating: "4.2/5",
    favorite: true,
  },
  {
    id: 4,
    title: "Album photos mission Mananara",
    category: "Albums",
    type: "Album",
    color: "#0ea5e9",
    description:
      "Sélection de photos terrain pour les présentations et rapports.",
    author: "Équipe terrain",
    email: "mission@saf.mg",
    date: "20 nov. 2025",
    badge: "Album terrain",
    privacy: "Partagé",
    views: 420,
    comments: 8,
    likes: 23,
    rating: "4.6/5",
    favorite: false,
  },
];

const FILTERS = ["Tous", "Rapports", "Albums", "Guides", "Documents"];

/* =========================
   Helpers
========================= */

// Format type 1.2k / 3.4M
function kfmt(n) {
  const num = Number(n || 0);
  if (num >= 1_000_000)
    return `${(num / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(".0", "")}k`;
  return String(num);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canHover = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(hover: hover)").matches;

/** Hook compteur animé (auto-incrément) */
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const previousRef = useRef(0);

  useEffect(() => {
    const t = Number(target || 0);
    if (!Number.isFinite(t)) return;

    const startVal = previousRef.current;
    const diff = t - startVal;

    if (diff === 0) {
      setValue(t);
      return;
    }

    let startTime = null;
    let frameId;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // easing : easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + diff * eased);
      setValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      }
    };

    frameId = requestAnimationFrame(step);
    previousRef.current = t;

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [target, duration]);

  return value;
}

/** Hook de reveal au scroll (inspiré de GridCard) */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      {
        threshold,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/** Hook visibilité complète (100% dans le viewport) pour les stats */
function useFullVisibility() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(prefersReducedMotion());

  useEffect(() => {
    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio >= 1) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 1,
        rootMargin: "0px",
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, visible];
}

/** Wrapper de reveal */
function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();

  return (
    <div
      ref={ref}
      className={`will-change-transform will-change-opacity transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* =========================
   Composant principal
========================= */

export default function HomeHero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeFilter, setActiveFilter] = useState("Tous");

  // 🔐 Auth Redux : pour cacher le bouton "Se connecter" si déjà connecté
  const { isAuthenticated } = useSelector((s) => s.library?.auth || {});

  // Stats globales depuis ton hook
  const {
    loading: statsLoading,
    error: statsError,
    articlesTotal,
    filesTotal,
    downloadsTotal,
  } = useLibraryStats();

  // ✅ Nouveau : stats utilisateurs depuis l'API (comme dans le Dashboard)
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setUsersLoading(true);

    axios
      .get("/stats/users-count")
      .then((r) => {
        if (!mounted) return;
        const total = Number(r?.data?.count || 0);
        setUsersTotal(total);
      })
      .catch(() => {
        if (!mounted) return;
        setUsersTotal(0);
      })
      .finally(() => {
        if (mounted) setUsersLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Auto-rotation des slides
  useEffect(() => {
    const timer = setInterval(
      () => setActiveSlide((prev) => (prev + 1) % SLIDES.length),
      6000
    );
    return () => clearInterval(timer);
  }, []);

  const filteredDocs =
    activeFilter === "Tous"
      ? DOCS
      : DOCS.filter((doc) => doc.category === activeFilter);

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)]" />
      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 md:px-8 py-10 ">
        {/* Header */}
        <header className="mb-12 md:mb-16">
          <Reveal delay={0}>
            <div className="flex flex-col items-center text-center gap-3 md:gap-4">
              <div className="w-11 h-11 md:w-12 md:h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center border border-blue-100">
                <FaBookOpen className="text-blue-600 text-lg md:text-xl" />
              </div>
              <p className="text-[11px] md:text-xs text-slate-500 font-medium uppercase tracking-widest">
                Plateforme documentaire en ligne
              </p>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900">
                Bibliothèque numérique
              </h1>
              <div className="w-36 h-1 bg-slate-900 mx-auto" />
              <p className="text-xs md:text-sm text-slate-600 max-w-xl">
                Un espace partagé pour consulter, déposer et valoriser les
                documents des programmes et des partenaires.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-5 flex flex-wrap justify-center gap-2 hidden">
              <Badge label="SAF FJKM" color="#0ea5e9" />
              <Badge label="CARE" color="#8b5cf6" />
              <Badge label="ETC" color="#10b981" />
            </div>
          </Reveal>
        </header>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr,1.35fr] gap-12 md:gap-16 items-start">
          {/* Colonne gauche */}
          <div className="space-y-8">
            <Reveal delay={40} className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[11px] md:text-xs font-medium text-slate-600">
                  Plateforme web sécurisée · Accès par compte utilisateur
                </span>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-dashed border-slate-200">
                <span className="text-[11px] text-slate-500">
                  Espace partagé pour les équipes & partenaires
                </span>
              </div>
            </Reveal>

            <Reveal delay={100} className="space-y-5 md:space-y-6">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
                Une plateforme{" "}
                <span className="block text-slate-900">
                  de gestion de documents en ligne
                </span>
              </h2>

              <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-xl">
                Plateforme web permettant de consulter, déposer et partager les
                documents institutionnels : rapports, photos, guides, documents
                de référence et supports de formation. Accessible aux invités,
                aux membres et aux équipes terrain selon leurs droits d&apos;accès.
              </p>
            </Reveal>

            {/* Boutons CTA */}
            <Reveal delay={160}>
              <div className="flex flex-wrap gap-3 md:gap-4">
                <Link
                  to="/articles"
                  className="group inline-flex items-center gap-3 px-5 md:px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all durée-300"
                >
                  <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FaPlay className="text-[11px] ml-0.5" />
                  </span>
                  Accéder à la plateforme
                  <FaArrowRight className="text-xs md:text-sm group-hover:translate-x-1 transition-transform" />
                </Link>

                {/* ❌ Masqué quand l'utilisateur est déjà connecté */}
                {!isAuthenticated && (
                  <Link
                    to="/auth?view=login"
                    className="inline-flex items-center gap-2 px-5 md:px-6 py-3.5 bg-white/90 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm border border-slate-200 shadow-sm hover:shadow-md transition-all durée-300"
                  >
                    <FaShieldAlt className="text-blue-600 text-sm" />
                    Se connecter
                  </Link>
                )}
              </div>
            </Reveal>

            {/* Stats rapides – dynamiques + animées */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 pt-2 md:pt-4">
              <StatCard
                value={articlesTotal || 0}
                label="Articles / rapports"
                isLoading={statsLoading}
                delay={0}
              />
              <StatCard
                value={filesTotal || 0}
                label="Fichiers en ligne"
                isLoading={statsLoading}
                delay={80}
              />
              <StatCard
                value={downloadsTotal || 0}
                label="Téléchargements"
                isLoading={statsLoading}
                delay={160}
              />
            </div>

            {statsError && (
              <p className="text-xs text-red-500">
                {statsError} — les statistiques affichées peuvent être
                incomplètes.
              </p>
            )}

            {/* Slider de fonctionnalités */}
            <Reveal delay={220}>
              <div className="mt-6 md:mt-8 p-5 md:p-6 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm md:shadow-md relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)]" />
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <span className="text-[11px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fonctionnalité {activeSlide + 1}/3
                  </span>
                  <Dots active={activeSlide} onChange={setActiveSlide} />
                </div>

                <div className="relative h-40">
                  {SLIDES.map((s, idx) => (
                    <SlideItem
                      key={s.id}
                      slide={s}
                      isActive={idx === activeSlide}
                      usersTotal={usersTotal}
                      usersLoading={usersLoading}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>

          {/* Colonne droite - Cards inspirées de GridCard */}
          <Reveal delay={140} className="relative">
            <div className="relative bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
              {/* Barre du haut / domaine */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/80 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <FaBookOpen className="text-blue-600 text-sm" />
                      <span className="text-xs text-slate-500 font-mono">
                        biblio.saf-care.org
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Plateforme documentaire en ligne
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  En ligne
                </span>
              </div>

              {/* Barre de recherche */}
              <div className="p-5 pb-3">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                  <FaSearch className="text-slate-400" />
                  <span className="text-sm text-slate-400 flex-1">
                    Rechercher un document...
                  </span>
                  <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-500">
                    ⌘K
                  </kbd>
                </div>
              </div>

              {/* Filtres */}
              <div className="px-5 pb-3 flex items-center justify-between gap-3">
                <Filters active={activeFilter} onChange={setActiveFilter} />
              </div>

              {/* Grille de cartes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-5 pb-5">
                {filteredDocs.map((doc) => (
                  <MockCard key={doc.id} {...doc} />
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaUsers className="text-blue-600 text-sm" />
                </div>
                <p className="text-xs text-slate-600">
                  Accessible à tous les utilisateurs autorisés — invités,
                  membres & équipes terrain.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Composants réutilisables
========================= */

function Badge({ label, color }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 shadow-sm text-xs font-medium text-slate-700 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function StatCard({ value, label, isLoading, delay = 0 }) {
  // Visibilité complète de la carte dans le viewport
  const [ref, visible] = useFullVisibility();

  // Le compteur ne s'anime que si :
  // - on n'est pas en loading
  // - la carte est 100% visible
  const animated = useCountUp(
    isLoading || !visible ? 0 : Number(value || 0),
    900
  );
  const display = isLoading ? "…" : kfmt(animated);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`group relative overflow-hidden p-4 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 text-center shadow-sm
        will-change-transform will-change-opacity transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)]
        ${
          visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }
        hover:-translate-y-1 hover:shadow-xl hover:border-slate-300`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity durée-500 bg-gradient-to-br from-blue-50/80 via-transparent to-purple-50/80" />
      <div className="relative">
        <p className="text-2xl font-bold text-slate-900 mb-1 tabular-nums">
          {display}
        </p>
        <p className="text-xs text-slate-600 font-medium">{label}</p>
      </div>
    </div>
  );
}

function Dots({ active, onChange }) {
  return (
    <div className="flex gap-2">
      {SLIDES.map((_, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === active ? "w-8 bg-blue-600" : "w-2 bg-slate-300 hover:bg-slate-400"
          }`}
          aria-label={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

function SlideItem({ slide, isActive, usersTotal, usersLoading }) {
  const SlideIcon = slide.icon;

  // On n'affiche le badge que si on a un nombre significatif
  const hasUsersStat = !usersLoading && Number(usersTotal || 0) > 0;

  return (
    <div
      className={`absolute inset-0 transition-all duration-700 ${
        isActive
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md"
          style={{ backgroundColor: slide.color }}
        >
          <SlideIcon className="text-xl" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {slide.title}
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {slide.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Stat principale déjà présente */}
        <span
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: slide.color }}
        >
          <FaChartLine className="text-xs" />
          {slide.stat}
        </span>

        {/* ✅ Nouveau badge : nombre d’utilisateurs inscrits */}
        {hasUsersStat && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-50">
            <FaUsers className="text-xs" />
            {kfmt(usersTotal)}{" "}
            <span className="opacity-80">utilisateurs inscrits</span>
          </span>
        )}

        <span className="px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
          {slide.tag}
        </span>
      </div>
    </div>
  );
}

function Filters({ active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1.5 rounded-full text-xs border transition ${
            active === f
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function formatNumber(n) {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1).replace(".0", "")}k`;
  }
  return n;
}

/** Petite helper couleur pour le fond des cartes (inspirée GridCard) */
function rgba(hex, alpha) {
  if (!hex) return `rgba(148,163,184,${alpha})`;
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((x) => x + x)
          .join("")
      : h.padEnd(6, "0").slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Carte doc inspirée de GridCard.jsx (mais simplifiée) */
function MockCard({
  title,
  type,
  category,
  color,
  description,
  author,
  email,
  date,
  badge,
  privacy,
  views,
  comments,
  likes,
  rating,
  favorite,
}) {
  const [ref, visible] = useScrollReveal();
  const motionless = prefersReducedMotion();

  const base = rgba(color, 0.1);
  const topBar = rgba(color, 0.35);

  const hoverClasses = motionless
    ? ""
    : "hover:-translate-y-1 hover:shadow-xl";

  return (
    <article
      ref={ref}
      className={`group relative rounded-2xl border border-slate-200 shadow-sm overflow-hidden cursor-pointer will-change-transform will-change-opacity transition-all duration-500 ease-[cubic-bezier(0.18,0.89,0.32,1.28)]
        ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        } ${hoverClasses}`}
      style={{
        background: `linear-gradient(180deg, ${base} 0%, rgba(255,255,255,0.96) 65%)`,
      }}
    >
      {/* Bandeau haut coloré (façon GridCard) */}
      <div className="relative h-24 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(135deg, ${color}, #e5e7eb)`,
          }}
        />
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ backgroundColor: topBar }}
        />

        <div className="relative z-10 flex items-start justify-between px-3 pt-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 text-[10px] text-slate-50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            {badge}
          </span>

          <div className="flex items-center gap-1.5">
            <button className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-amber-300 text-xs">
              <FaStar className={favorite ? "opacity-100" : "opacity-40"} />
            </button>
            <button className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center text-slate-100 text-xs">
              <FaEllipsisH />
            </button>
          </div>
        </div>

        <div className="absolute bottom-2 left-3 flex items-center gap-2 text-[10px] text-slate-100">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20">
            <FaLock className="text-[9px]" />
            {privacy}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-black/15">
            {category}
          </span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="p-3 space-y-3">
        <div>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white mb-1"
            style={{ backgroundColor: color }}
          >
            <span className="w-1 h-1 bg-white/60 rounded-full" />
            {type}
          </span>
          <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">
            {title}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">
            {description}
          </p>
        </div>

        {/* Auteur */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
              <FaUserCircle className="text-slate-400 text-lg" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-700">
                {author}
              </p>
              <p className="text-[10px] text-slate-400">{email}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{date}</p>
        </div>

        {/* Bouton principal */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-[11px] text-blue-700 font-semibold group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FaBookOpen className="text-[10px]" />
            Ouvrir
          </button>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <FaEye className="text-[10px]" />
              {formatNumber(views)}
            </span>
            <span className="inline-flex items-center gap-1">
              <FaCommentDots className="text-[10px]" />
              {comments}
            </span>
            <span className="inline-flex items-center gap-1">
              <FaHeart className="text-[10px]" />
              {likes}
            </span>
            <span className="inline-flex items-center gap-1 text-amber-500">
              <FaStar className="text-[10px]" />
              {rating}
            </span>
          </div>
        </div>
      </div>

      {/* Overlay “glass” très léger au hover (façon GridCard) */}
      {canHover() && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle at 10% 0%, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.4) 55%)`,
          }}
        />
      )}
    </article>
  );
}
