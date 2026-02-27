// src/pages/UserManagementDashboard/Components/Accueil/PartnersListPage.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  FiSearch,
  FiGlobe,
  FiMapPin,
  FiExternalLink,
  FiFilter,
  FiX,
} from "react-icons/fi";
import api from "../../../services/api";
import NavBarMiradia from "../../../component/navbar/NavbarMiradia";
import Footer from "../Footer"; // adapte si besoin

/* =========================
   Couleurs MIRADIA
   #025C86 | #124B7C | #3AA6DC | #4CC051 | #FCCA00 | #1690FF
========================= */
const M = {
  navy:   "#124B7C",
  teal:   "#025C86",
  sky:    "#3AA6DC",
  blue:   "#1690FF",
  green:  "#4CC051",
  yellow: "#FCCA00",
};

const hexToRgba = (hex, a = 0.18) => {
  const h    = String(hex || "").replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n    = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/* =========================
   Hook debounce
========================= */
const useDebounce = (value, delay) => {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
};

/* =========================
   Hook: révèle quand dans le viewport
========================= */
function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setInView(true); return;
    }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.1, rootMargin: "80px" }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return inView;
}

/* =========================
   Helpers
========================= */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const ACCENT_PALETTE = [M.sky, M.green, M.yellow, M.teal, M.blue];
function pickAccent(seed) { return ACCENT_PALETTE[seed % ACCENT_PALETTE.length]; }
function isHex(v) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || "").trim()); }

const COUNTRY_FLAGS = {
  madagascar: "🇲🇬", france: "🇫🇷", canada: "🇨🇦",
  usa: "🇺🇸", "united states": "🇺🇸", "états-unis": "🇺🇸",
};
const getFlag = (country) => {
  if (!country) return "🌍";
  return COUNTRY_FLAGS[String(country).toLowerCase().trim()] || "🌍";
};

const STORAGE_BASE = (
  import.meta.env.VITE_API_BASE_STORAGE ||
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/api\/?$/i, "").replace(/\/+$/, "");

const buildLogoUrl = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (s.startsWith("http") || s.startsWith("/")) return s;
  return STORAGE_BASE ? `${STORAGE_BASE}/storage/logos/${s}` : "";
};

/* =========================
   Avatar
========================= */
function Avatar({ name, logo, accent, size = 56 }) {
  const [ok, setOk] = useState(!!logo);
  const initials = (name || "?").split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div
      className="shrink-0 rounded-2xl overflow-hidden flex items-center justify-center font-black select-none"
      style={{
        width: size, height: size,
        background: ok ? "rgba(255,255,255,0.08)" : `linear-gradient(135deg, ${hexToRgba(accent, 0.22)}, ${hexToRgba(accent, 0.08)})`,
        border: `1.5px solid ${hexToRgba(accent, 0.35)}`,
        boxShadow: `0 4px 18px ${hexToRgba(accent, 0.25)}`,
        fontSize: size * 0.3,
        color: accent,
        letterSpacing: "-0.02em",
      }}
    >
      {ok
        ? <img src={logo} alt={name} className="w-full h-full object-contain p-1.5" onError={() => setOk(false)} />
        : initials
      }
    </div>
  );
}

/* =========================
   PartnerCard (glass style aligné Contact.jsx)
========================= */
function PartnerCard({ partner, index }) {
  const ref    = useRef(null);
  const inView = useInView(ref);
  const accent = partner.accent;
  const delay  = Math.min(index * 50, 400);

  return (
    <div
      ref={ref}
      className="group relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300"
      style={{
        /* glass card identique au style Contact */
        background:  "rgba(255,255,255,0.70)",
        border:      `1px solid ${hexToRgba(accent, 0.18)}`,
        boxShadow:   `0 4px 24px ${hexToRgba(accent, 0.09)}, 0 1px 4px rgba(15,23,42,0.06)`,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        opacity:   inView ? 1 : 0,
        transform: inView ? "translateY(0) scale(1)" : "translateY(24px) scale(0.97)",
        transition: `opacity 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms,
                     transform 0.55s cubic-bezier(0.22,1,0.36,1) ${delay}ms,
                     box-shadow 0.3s ease, border-color 0.3s ease`,
      }}
      /* Dark override via CSS */
      data-card="partner"
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 18px 50px ${hexToRgba(accent, 0.24)}, 0 2px 8px ${hexToRgba(accent, 0.10)}`;
        e.currentTarget.style.borderColor = hexToRgba(accent, 0.45);
        e.currentTarget.style.transform = "translateY(-5px) scale(1.013)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 24px ${hexToRgba(accent, 0.09)}, 0 1px 4px rgba(15,23,42,0.06)`;
        e.currentTarget.style.borderColor = hexToRgba(accent, 0.18);
        e.currentTarget.style.transform = "translateY(0) scale(1)";
      }}
    >
      {/* Accent bar top */}
      <div className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accent}ee, ${accent}33)` }} />

      {/* Hover radial glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(circle at 15% 15%, ${hexToRgba(accent, 0.07)}, transparent 60%)` }} />

      <div className="relative flex flex-col h-full p-5 gap-3.5">
        {/* ── Header ── */}
        <div className="flex items-start gap-3.5">
          <Avatar name={partner.name} logo={partner.logo} accent={accent} size={54} />

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase"
                style={{ color: accent }}>
                {partner.countryFlag} {partner.pays || "Madagascar"}
              </span>
            </div>
            <h3 className="text-[14px] font-bold leading-snug text-slate-900 dark:text-slate-50 truncate">
              {partner.name}
            </h3>
            {partner.acronym && partner.acronym !== partner.name && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 tracking-wide font-medium">
                {partner.acronym}
              </p>
            )}
          </div>

          {/* Index */}
          <span className="shrink-0 text-[11px] font-black tabular-nums"
            style={{ color: hexToRgba(accent, 0.45) }}>
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        {/* ── Divider ── */}
        <div className="h-px" style={{ background: hexToRgba(accent, 0.14) }} />

        {/* ── Description ── */}
        <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 flex-1">
          {partner.role || "Organisation membre de la plateforme MIRADIA."}
        </p>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {partner.location && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 truncate min-w-0">
              <FiMapPin className="shrink-0 h-3 w-3" />
              <span className="truncate">{partner.location}</span>
            </div>
          )}
          {partner.href && partner.href !== "#" && (
            <a
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-3 py-1 transition-all"
              style={{
                background: hexToRgba(accent, 0.12),
                color:      accent,
                border:     `1px solid ${hexToRgba(accent, 0.28)}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = hexToRgba(accent, 0.22); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = hexToRgba(accent, 0.12); }}
            >
              <FiExternalLink className="h-2.5 w-2.5" />
              Site
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   MiniStat (identique à Contact.jsx)
========================= */
function MiniStat({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-all duration-300">
      <div className="text-xl font-extrabold text-white">{value}</div>
      <div className="text-xs font-semibold text-white/85">{label}</div>
    </div>
  );
}

/* =========================
   FilterChip
========================= */
function FilterChip({ label, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-wide transition-all duration-200 select-none"
      style={{
        background: active
          ? "linear-gradient(135deg, #025C86, #3AA6DC)"
          : "rgba(255,255,255,0.70)",
        color:  active ? "#fff" : "#475569",
        border: `1.5px solid ${active ? "transparent" : "rgba(148,163,184,0.3)"}`,
        boxShadow: active ? `0 4px 16px ${hexToRgba(M.sky, 0.35)}` : "0 1px 4px rgba(15,23,42,0.05)",
        backdropFilter: "blur(8px)",
        transform: active ? "scale(1.04)" : "scale(1)",
      }}
    >
      {label}
      {count != null && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          style={{
            background: active ? "rgba(255,255,255,0.22)" : "rgba(148,163,184,0.18)",
            color:      active ? "#fff" : "#64748b",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* =========================
   PAGE PRINCIPALE
========================= */
export default function PartnersListPage() {
  const [societes,       setSocietes]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState("");
  const [filterCountry,  setFilterCountry]  = useState("all");
  const [sortBy,         setSortBy]         = useState("name");
  const [showFilters,    setShowFilters]    = useState(false);

  const debouncedSearch = useDebounce(search, 280);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/societes", { params: { per_page: 200 } });
        const raw = res?.data?.data || res?.data || [];
        if (mounted) setSocietes(Array.isArray(raw) ? raw : []);
      } catch (e) {
        console.error("Erreur chargement sociétés", e);
        if (mounted) setSocietes([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ── Données normalisées ── */
  const partners = useMemo(() => societes.map((s) => {
    const id     = String(s.id ?? "");
    const accent = (s.brand_color || s.color) && isHex(s.brand_color || s.color)
      ? String(s.brand_color || s.color).trim()
      : pickAccent(hashString(id + "|" + (s.name || "")));
    const acronym  = s.slug || (s.name ? s.name.split(" ").map((p) => p[0]).join("") : "") || "—";
    const location = s.ville && s.pays ? `${s.ville} · ${s.pays}` : s.ville || s.pays || "Madagascar";
    return {
      id, name: s.name || acronym, acronym,
      logo:     buildLogoUrl(s.logo_url),
      href:     s.website_url || "#",
      role:     s.description || "",
      pays:     s.pays || "Madagascar",
      location, countryFlag: getFlag(s.pays),
      accent,
      createdAt: s.created_at || "",
    };
  }), [societes]);

  /* ── Pays pour les filtres ── */
  const countries = useMemo(() => {
    const m = {};
    partners.forEach((p) => { const c = p.pays; m[c] = (m[c] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [partners]);

  /* ── Liste filtrée + triée ── */
  const filtered = useMemo(() => {
    let list = [...partners];
    if (filterCountry !== "all") list = list.filter((p) => p.pays === filterCountry);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((p) =>
        [p.name, p.role, p.location, p.acronym].some((f) => f?.toLowerCase().includes(q))
      );
    }
    if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [partners, filterCountry, debouncedSearch, sortBy]);

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total:     partners.length,
    countries: new Set(partners.map((p) => p.pays)).size,
    withSite:  partners.filter((p) => p.href && p.href !== "#").length,
    filtered:  filtered.length,
  }), [partners, filtered]);

  const handleClearFilters = useCallback(() => {
    setSearch(""); setFilterCountry("all");
  }, []);

  return (
    <>
    <NavBarMiradia/>
 
    <div className="min-h-screen flex items-center w-full bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#0B1626] dark:via-[#070F1C] dark:to-[#050A12]">
      <div className="relative w-full min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">

        {/* ══════════════════════════════════════
            STYLES GLOBAUX (identiques Contact.jsx)
        ══════════════════════════════════════ */}
        <style>{`
          @keyframes miradiaIn {
            0%   { opacity:0; transform: translate3d(0,15px,0); filter: blur(2px); }
            100% { opacity:1; transform: translate3d(0,0,0);    filter: blur(0);   }
          }
          .miradia-enter { animation: miradiaIn 700ms ease-out both; }

          @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,16px)} }
          @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-16px,22px)} }
          @keyframes float3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(14px,-18px)} }

          @keyframes shimmer {
            0%   { background-position: -500px 0; }
            100% { background-position:  500px 0; }
          }
          .skeleton-card {
            background: linear-gradient(90deg,#e2e8f0 25%,#f1f5f9 50%,#e2e8f0 75%);
            background-size: 1000px 100%;
            animation: shimmer 1.6s infinite;
            border-radius: 1.5rem;
          }
          .dark .skeleton-card {
            background: linear-gradient(90deg,#1a2840 25%,#1e3050 50%,#1a2840 75%);
            background-size: 1000px 100%;
          }

          /* dark card override */
          .dark [data-card="partner"] {
            background: rgba(13,28,46,0.60) !important;
            border-color: rgba(255,255,255,0.07) !important;
          }

          /* search input */
          .pl-search::placeholder { color:#94a3b8; }
          .pl-search:focus        { outline:none; }

          @media (prefers-reduced-motion: reduce) {
            .miradia-enter { animation: none !important; }
            * { transition:none !important; animation:none !important; }
          }
        `}</style>

        {/* ══════════════════════════════════════
            BACKGROUND ANIMÉ (copié de Contact.jsx)
        ══════════════════════════════════════ */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/40 dark:opacity-0" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900/35 to-slate-950 opacity-0 dark:opacity-100" />

          <div className="absolute -top-28 -left-28 h-[420px] w-[420px] rounded-full blur-3xl opacity-60 dark:opacity-35"
            style={{ background:"radial-gradient(circle at 35% 35%, rgba(58,166,220,0.45), transparent 62%)", animation:"float1 14s ease-in-out infinite" }} />
          <div className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-55 dark:opacity-30"
            style={{ background:"radial-gradient(circle at 35% 35%, rgba(76,192,81,0.40), transparent 64%)", animation:"float2 16s ease-in-out infinite" }} />
          <div className="absolute -bottom-40 left-1/3 h-[620px] w-[620px] rounded-full blur-3xl opacity-45 dark:opacity-25"
            style={{ background:"radial-gradient(circle at 35% 35%, rgba(252,202,0,0.34), transparent 64%)", animation:"float3 18s ease-in-out infinite" }} />

          {/* Noise texture */}
          <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06]"
            style={{ backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")" }} />
        </div>

        {/* ══════════════════════════════════════
            CONTAINER PRINCIPAL (max-w-[1700px])
        ══════════════════════════════════════ */}
        <main className="relative w-full max-w-[1700px] px-2 sm:px-4 lg:px-8 py-8 flex flex-col gap-8">

          {/* ── HERO HEADER (identique Contact.jsx) ─── */}
          <section className="miradia-enter">
            <div className="relative overflow-hidden rounded-3xl ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.16)]">
              {/* Gradient background */}
              <div className="absolute inset-0"
                style={{ background:"linear-gradient(135deg, #025C86 0%, #124B7C 55%, #3AA6DC 100%)" }} />
              <div className="absolute inset-0 bg-black/15" />

              {/* Noise overlay */}
              <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{ backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")" }} />

              {/* Decorative halos */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-15"
                style={{ background:`radial-gradient(circle, ${M.sky}, transparent 70%)` }} />
              <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full opacity-12"
                style={{ background:`radial-gradient(circle, ${M.green}, transparent 70%)` }} />
              <div className="pointer-events-none absolute top-1/2 right-1/3 h-32 w-32 rounded-full opacity-20"
                style={{ background:`radial-gradient(circle, ${M.yellow}, transparent 70%)` }} />

              <div className="relative px-6 py-14 md:py-20 text-center text-white">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 mb-6">
                  <FiGlobe className="h-4 w-4" />
                  <span className="text-xs font-semibold tracking-wider uppercase">Plateforme MIRADIA</span>
                </div>

                <h1 className="text-3xl md:text-5xl font-black tracking-tight">
                  Membres &amp; Partenaires
                </h1>

                {/* Gradient underline */}
                <div className="mx-auto mt-6 h-1.5 w-32 rounded-full"
                  style={{ background:"linear-gradient(90deg, #4CC051, #FCCA00)" }} />

                <p className="mt-6 max-w-3xl mx-auto text-white/90 text-base md:text-lg leading-relaxed">
                  Découvrez les organisations qui font confiance à MIRADIA pour partager
                  leurs documents, rapports et ressources en toute sécurité.
                </p>

                {/* Mini stats (style Contact.jsx) */}
                {!loading && (
                  <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                    <MiniStat label="Partenaires"    value={`${stats.total}+`} />
                    <MiniStat label="Pays"            value={`${stats.countries}+`} />
                    <MiniStat label="Sites web"       value={`${stats.withSite}`} />
                    <MiniStat label="Réseau actif"    value="MIRADIA" />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── CONTROLS PANEL (glass card) ───────── */}
          <section className="miradia-enter" style={{ animationDelay:"80ms" }}>
            <div className="rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between
              bg-white/70 dark:bg-slate-950/55 backdrop-blur-2xl
              border border-slate-200/80 dark:border-white/10
              shadow-[0_8px_32px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
            >
              {/* Halo interne */}
              <div className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{ background:"radial-gradient(circle at 10% 0%, rgba(58,166,220,0.06), transparent 55%)" }} />

              {/* Search */}
              <div className="relative w-full sm:w-80">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none" />
                {search && (
                  <button className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    onClick={() => setSearch("")}>
                    <FiX className="h-3.5 w-3.5" />
                  </button>
                )}
                <input
                  className="pl-search w-full pl-10 pr-9 py-2.5 rounded-full text-[13px]
                    bg-white/80 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200
                    border border-slate-200/80 dark:border-white/10
                    focus:border-[#1690FF] focus:ring-2 focus:ring-[#1690FF]/20
                    transition-all"
                  placeholder="Rechercher un partenaire…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Sort */}
                <div className="flex items-center gap-1.5 text-[12px]">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Trier :</span>
                  {[["name","A → Z"],["recent","Récent"]].map(([v,l]) => (
                    <button key={v} onClick={() => setSortBy(v)}
                      className="px-3 py-1.5 rounded-full font-semibold transition-all text-[11px]"
                      style={{
                        background: sortBy===v ? `linear-gradient(135deg, ${M.teal}, ${M.sky})` : "rgba(148,163,184,0.12)",
                        color:      sortBy===v ? "#fff" : "#64748b",
                        border:     `1px solid ${sortBy===v ? "transparent" : "rgba(148,163,184,0.25)"}`,
                        boxShadow:  sortBy===v ? `0 3px 12px ${hexToRgba(M.sky,0.3)}` : "none",
                      }}>
                      {l}
                    </button>
                  ))}
                </div>

                {/* Filter toggle */}
                <button
                  onClick={() => setShowFilters((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold transition-all"
                  style={{
                    background: showFilters ? hexToRgba(M.sky, 0.15) : "rgba(148,163,184,0.10)",
                    color:      showFilters ? M.sky : "#64748b",
                    border:     `1px solid ${showFilters ? hexToRgba(M.sky,0.4) : "rgba(148,163,184,0.2)"}`,
                  }}
                >
                  <FiFilter className="h-3 w-3" />
                  Filtres
                </button>

                {/* Active filter count badge */}
                {(filterCountry !== "all" || search) && (
                  <button onClick={handleClearFilters}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white transition-all"
                    style={{ background:`linear-gradient(135deg, ${M.teal}, ${M.sky})`, boxShadow:`0 3px 12px ${hexToRgba(M.sky,0.35)}` }}>
                    <FiX className="h-3 w-3" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>

            {/* Country filter chips (collapse) */}
            {showFilters && (
              <div className="mt-3 rounded-2xl p-4
                bg-white/70 dark:bg-slate-950/55 backdrop-blur-2xl
                border border-slate-200/80 dark:border-white/10
                shadow-[0_4px_18px_rgba(15,23,42,0.06)]"
                style={{ animation:"miradiaIn 250ms ease-out both" }}
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-3">
                  Filtrer par pays
                </p>
                <div className="flex flex-wrap gap-2">
                  <FilterChip label="Tous" active={filterCountry==="all"} count={partners.length}
                    onClick={() => setFilterCountry("all")} />
                  {countries.map(([c,n]) => (
                    <FilterChip key={c}
                      label={`${getFlag(c)} ${c}`}
                      active={filterCountry===c}
                      count={n}
                      onClick={() => setFilterCountry(filterCountry===c ? "all" : c)} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── RÉSULTATS COUNT ───────────────────── */}
          {!loading && (
            <div className="flex items-center gap-3 -mt-2 miradia-enter" style={{ animationDelay:"140ms" }}>
              <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500">
                {stats.filtered} partenaire{stats.filtered > 1 ? "s" : ""}
                {filterCountry !== "all" && ` · ${filterCountry}`}
                {search && ` · "${debouncedSearch}"`}
              </span>
              <div className="h-px flex-1 bg-slate-200/60 dark:bg-slate-800/60" />
            </div>
          )}

          {/* ── SKELETONS ─────────────────────────── */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skeleton-card" style={{ height:220, animationDelay:`${i*70}ms` }} />
              ))}
            </div>
          )}

          {/* ── EMPTY STATE ───────────────────────── */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-5 text-center miradia-enter">
              <div className="text-5xl">🔍</div>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300">Aucun résultat trouvé</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Essayez un autre terme ou réinitialisez les filtres.</p>
              <button onClick={handleClearFilters}
                className="mt-1 px-6 py-2.5 rounded-full text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background:`linear-gradient(135deg, ${M.teal}, ${M.sky})`, boxShadow:`0 6px 22px ${hexToRgba(M.sky,0.35)}` }}>
                Réinitialiser les filtres
              </button>
            </div>
          )}

          {/* ── GRILLE PARTENAIRES ────────────────── */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((partner, i) => (
                <PartnerCard key={partner.id} partner={partner} index={i} />
              ))}
            </div>
          )}

          {/* ── FOOTER STATS GLASS ────────────────── */}
          {!loading && partners.length > 0 && (
            <section className="miradia-enter" style={{ animationDelay:"200ms" }}>
              <div className="rounded-3xl p-6 sm:p-8
                bg-white/70 dark:bg-slate-950/55 backdrop-blur-2xl
                border border-slate-200/80 dark:border-white/10
                shadow-[0_8px_32px_rgba(15,23,42,0.08)]"
              >
                <div className="pointer-events-none absolute inset-0 rounded-3xl"
                  style={{ background:"radial-gradient(circle at 90% 100%, rgba(76,192,81,0.07), transparent 55%)" }} />
                <div className="relative grid grid-cols-3 divide-x divide-slate-200/60 dark:divide-white/8">
                  {[
                    { v: stats.total,     l: "Membres actifs",    accent: M.sky    },
                    { v: stats.countries, l: "Pays représentés",  accent: M.green  },
                    { v: stats.withSite,  l: "Présences web",     accent: M.yellow },
                  ].map(({ v, l, accent }) => (
                    <div key={l} className="flex flex-col items-center gap-1 px-4 py-2 text-center">
                      <span className="text-3xl font-black tracking-tight" style={{ color: accent }}>{v}</span>
                      <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── FOOTER ────────────────────────────── */}
          <footer className="flex items-center justify-center gap-3 text-[11px] text-slate-400 dark:text-slate-600 pb-4">
            <div className="h-px w-16 bg-slate-200 dark:bg-slate-800" />
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
              bg-white/70 dark:bg-white/5
              border border-black/5 dark:border-white/10 backdrop-blur">
              <FiGlobe className="h-4 w-4" style={{ color: M.teal }} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Ensemble pour un Madagascar résilient et durable
              </span>
            </div>
            <div className="h-px w-16 bg-slate-200 dark:bg-slate-800" />
          </footer>
        </main>
      </div>
    </div>
<Footer/>
       </>
  );
}