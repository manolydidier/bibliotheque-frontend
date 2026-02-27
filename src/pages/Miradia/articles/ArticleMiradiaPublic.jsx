// src/pages/ArticlesMiradiaPublic.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

/* =========================
   PALETTE MIRADIA
========================= */
const M = {
  navy:  "#124B7C",
  teal:  "#025C86",
  sky:   "#3AA6DC",
  green: "#4CC051",
  yellow:"#FCCA00",
};

/* =========================
   GLOBAL STYLES
========================= */
const GlobalStyles = () => (
  <style>{`
    /* ── keyframes ── */
    @keyframes blobDrift {
      0%,100% { transform: translate(0,0) scale(1); }
      33%      { transform: translate(18px,-14px) scale(1.04); }
      66%      { transform: translate(-12px,20px) scale(.97); }
    }
    @keyframes cardReveal {
      from { opacity:0; transform:translateY(28px) scale(.97); filter:blur(2px); }
      to   { opacity:1; transform:translateY(0)    scale(1);   filter:blur(0); }
    }
    @keyframes shimmerCard {
      0%   { transform:translateX(-100%) skewX(-12deg); opacity:0; }
      30%  { opacity:.6; }
      100% { transform:translateX(220%)  skewX(-12deg); opacity:0; }
    }
    @keyframes tagBreathe {
      0%,100% { box-shadow:0 0 0 0 rgba(58,166,220,0); }
      50%     { box-shadow:0 0 12px 3px rgba(58,166,220,.30); }
    }
    @keyframes scanLine {
      from { background-position: 0 0; }
      to   { background-position: 0 100%; }
    }
    @keyframes pulseRing {
      0%   { transform:scale(1);   opacity:.7; }
      100% { transform:scale(1.7); opacity:0; }
    }
    @keyframes countUp {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes headerSlide {
      from { opacity:0; transform:translateY(-18px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes searchExpand {
      from { opacity:0; transform:scaleX(.92) translateY(8px); }
      to   { opacity:1; transform:scaleX(1)   translateY(0); }
    }
    @keyframes progressFill {
      from { width:0%; }
      to   { width:100%; }
    }
    @keyframes floatBg {
      0%,100% { transform:translateY(0) rotate(0deg); }
      50%     { transform:translateY(-22px) rotate(3deg); }
    }

    /* ── card stagger ── */
    .art-card { animation: cardReveal .55s cubic-bezier(.22,1,.36,1) both; }
    .art-card:nth-child(1)  { animation-delay:.04s; }
    .art-card:nth-child(2)  { animation-delay:.09s; }
    .art-card:nth-child(3)  { animation-delay:.14s; }
    .art-card:nth-child(4)  { animation-delay:.19s; }
    .art-card:nth-child(5)  { animation-delay:.24s; }
    .art-card:nth-child(6)  { animation-delay:.29s; }
    .art-card:nth-child(7)  { animation-delay:.34s; }
    .art-card:nth-child(8)  { animation-delay:.39s; }
    .art-card:nth-child(9)  { animation-delay:.44s; }
    .art-card:nth-child(10) { animation-delay:.49s; }
    .art-card:nth-child(11) { animation-delay:.54s; }
    .art-card:nth-child(12) { animation-delay:.58s; }

    /* ── shimmer on hover ── */
    .art-card .card-shimmer {
      position:absolute;
      inset:0;
      background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.28) 50%,transparent 60%);
      opacity:0;
      pointer-events:none;
      animation:shimmerCard 1.5s cubic-bezier(.4,0,.6,1);
      animation-play-state:paused;
    }
    .art-card:hover .card-shimmer { animation-play-state:running; opacity:1; }

    /* ── image zoom ── */
    .art-card .card-img { transition:transform .65s cubic-bezier(.22,1,.36,1); }
    .art-card:hover .card-img { transform:scale(1.07) !important; }

    /* ── title underline expand ── */
    .art-card .card-title::after {
      content:"";
      display:block;
      height:2px;
      width:0;
      margin-top:6px;
      border-radius:999px;
      background:linear-gradient(90deg,${M.sky},${M.green});
      transition:width .4s cubic-bezier(.22,1,.36,1);
    }
    .art-card:hover .card-title::after { width:100%; }

    /* ── read btn ── */
    .read-btn {
      position:relative;
      overflow:hidden;
      background:linear-gradient(135deg,${M.sky},${M.teal});
      transition:box-shadow .25s, transform .15s;
    }
    .read-btn:hover {
      box-shadow:0 8px 28px rgba(58,166,220,.45);
      transform:translateY(-1px);
    }
    .read-btn:active { transform:translateY(0); }
    .read-btn::after {
      content:"";
      position:absolute;
      inset:0;
      background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.22) 50%,transparent 60%);
      transform:translateX(-100%) skewX(-12deg);
      transition:transform .45s;
    }
    .read-btn:hover::after { transform:translateX(220%) skewX(-12deg); }

    /* ── header animation ── */
    .header-animate { animation:headerSlide .65s cubic-bezier(.22,1,.36,1) both; }
    .header-animate-d1 { animation-delay:.08s; }
    .header-animate-d2 { animation-delay:.18s; }
    .header-animate-d3 { animation-delay:.28s; }

    /* ── search appear ── */
    .search-appear { animation:searchExpand .55s cubic-bezier(.22,1,.36,1) .32s both; }

    /* ── blob drift ── */
    .blob-drift-1 { animation:blobDrift 14s ease-in-out infinite; }
    .blob-drift-2 { animation:blobDrift 18s ease-in-out infinite reverse; animation-delay:3s; }
    .blob-drift-3 { animation:blobDrift 22s ease-in-out infinite; animation-delay:6s; }
    .blob-drift-4 { animation:blobDrift 16s ease-in-out infinite reverse; animation-delay:2s; }

    /* ── count badge ── */
    .count-badge span { display:inline-block; animation:countUp .3s cubic-bezier(.22,1,.36,1) both; }

    /* ── pagination btn ── */
    .pag-btn {
      transition:background .18s, color .18s, transform .12s, box-shadow .18s;
    }
    .pag-btn:not(:disabled):hover {
      transform:translateY(-2px);
      box-shadow:0 6px 18px rgba(0,0,0,.12);
    }
    .pag-btn:not(:disabled):active { transform:translateY(0); }

    /* ── tag pill ── */
    .miradia-tag-pill {
      display:inline-flex;
      align-items:center;
      gap:5px;
      padding:4px 13px;
      border-radius:999px;
      font-size:10px;
      font-weight:800;
      letter-spacing:.24em;
      text-transform:uppercase;
      background:rgba(58,166,220,.18);
      border:1px solid rgba(58,166,220,.32);
      color:rgba(255,255,255,.95);
      animation:tagBreathe 3s ease-in-out infinite;
    }
    .miradia-tag-pill::before {
      content:"";
      display:inline-block;
      width:6px; height:6px;
      border-radius:50%;
      background:${M.sky};
      box-shadow:0 0 6px ${M.sky};
    }

    /* ── scan lines subtle texture ── */
    .scan-overlay {
      background-image:repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,.03) 2px,
        rgba(0,0,0,.03) 4px
      );
      pointer-events:none;
    }

    /* ── category chip hover ── */
    .cat-chip {
      transition:background .2s, border-color .2s, transform .15s;
    }
    .cat-chip:hover { transform:translateY(-1px); }

    /* ── pulse ring for live badge ── */
    .pulse-ring::before {
      content:"";
      position:absolute;
      inset:-4px;
      border-radius:50%;
      background:rgba(76,192,81,.5);
      animation:pulseRing 1.6s ease-out infinite;
    }

    @media (prefers-reduced-motion:reduce) {
      .art-card,.header-animate,.search-appear {
        animation:none !important;
        opacity:1 !important;
        transform:none !important;
      }
      .blob-drift-1,.blob-drift-2,.blob-drift-3,.blob-drift-4 {
        animation:none !important;
      }
    }
  `}</style>
);

/* =========================
   BACKGROUND BLOBS
========================= */
function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob-drift-1 absolute -top-28 -left-28 h-96 w-96 rounded-full blur-3xl opacity-30 dark:opacity-14"
        style={{ background:`radial-gradient(circle at 35% 35%,${M.sky}55,transparent 62%)` }} />
      <div className="blob-drift-2 absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-24 dark:opacity-12"
        style={{ background:`radial-gradient(circle at 35% 35%,${M.green}50,transparent 62%)` }} />
      <div className="blob-drift-3 absolute -bottom-32 left-1/3 h-[560px] w-[560px] rounded-full blur-3xl opacity-18 dark:opacity-10"
        style={{ background:`radial-gradient(circle at 35% 35%,${M.yellow}44,transparent 62%)` }} />
      <div className="blob-drift-4 absolute top-2/3 left-10 h-72 w-72 rounded-full blur-3xl opacity-14 dark:opacity-8"
        style={{ background:`radial-gradient(circle at 50% 50%,${M.navy}60,transparent 65%)` }} />
      {/* dark-only */}
      <div className="hidden dark:block blob-drift-1 absolute top-1/4 -left-14 h-[440px] w-[440px] rounded-full blur-3xl opacity-10"
        style={{ background:`radial-gradient(circle at 40%,#0EA5E933,transparent 65%)` }} />
      <div className="hidden dark:block blob-drift-3 absolute bottom-1/4 -right-14 h-[500px] w-[500px] rounded-full blur-3xl opacity-8"
        style={{ background:`radial-gradient(circle at 60%,#4F46E533,transparent 70%)` }} />
    </div>
  );
}

/* =========================
   IMAGE / DATE UTILS
========================= */
const fixPath = (u) => {
  if (!u) return u;
  let s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^\/+/, "");
  if (s.startsWith("storage/")) return s;
  if (s.startsWith("articles/featured/")) return `storage/${s}`;
  return s;
};

const toAbsolute = (u) => {
  if (!u) return null;
  const fixed = fixPath(u);
  if (!fixed) return null;
  if (/^https?:\/\//i.test(fixed)) return fixed;
  const base = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000")
    .replace(/\/api\/?$/i, "").replace(/\/$/, "");
  return base ? `${base}/${fixed.replace(/^\/+/,"")}` : `/${fixed.replace(/^\/+/,"")}`;
};

const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("fr-FR", { year:"numeric", month:"short", day:"2-digit" });
};

const buildApiBase = () => {
  const raw = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const base = String(raw).replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const getPages = (current, last) => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const c = clamp(current, 1, last);
  const pages = new Set([1, last, c, c - 1, c + 1]);
  const arr = Array.from(pages).filter(p => p >= 1 && p <= last).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i+1] - arr[i] > 1) out.push("…");
  }
  return out;
};

/* =========================
   ICONS
========================= */
const SearchIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const XIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const CalIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const ClockIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/>
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  </svg>
);
const ArrowIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" {...p}>
    <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* =========================
   SKELETON
========================= */
function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/70 overflow-hidden backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      <div className="h-56 animate-pulse" style={{ background:`linear-gradient(135deg,#e2eaf0,#cfd8e3)` }} />
      <div className="p-6 space-y-3">
        <div className="h-5 w-3/4 bg-slate-100 animate-pulse rounded-xl dark:bg-white/10" />
        <div className="h-5 w-1/2 bg-slate-100 animate-pulse rounded-xl dark:bg-white/10" />
        <div className="h-4 w-full bg-slate-100 animate-pulse rounded-xl dark:bg-white/10" />
        <div className="h-4 w-5/6 bg-slate-100 animate-pulse rounded-xl dark:bg-white/10" />
        <div className="pt-3 flex items-center justify-between">
          <div className="h-4 w-16 bg-slate-100 animate-pulse rounded-xl dark:bg-white/10" />
          <div className="h-11 w-40 bg-slate-100 animate-pulse rounded-2xl dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/* =========================
   HEADER / SEARCH BLOCK
========================= */
function TitleBlock({ search, setSearch, total, loading }) {
  const inputRef = useRef(null);

  return (
    <div className="w-full">
      <div className="relative rounded-[2rem] overflow-hidden ring-1 ring-black/8 dark:ring-white/8 shadow-[0_32px_100px_rgba(0,0,0,.18)]">

        {/* backgrounds */}
        <div className="absolute inset-0">
          <div className="absolute inset-0"
            style={{ background:`linear-gradient(135deg,${M.navy} 0%,${M.teal} 45%,${M.sky} 100%)` }} />
          <div className="absolute inset-0 hidden dark:block"
            style={{ background:`linear-gradient(135deg,#07111F 0%,#0B1A2E 50%,#0D2240 100%)` }} />
          {/* mesh */}
          <div className="absolute inset-0 opacity-[.06]"
            style={{ backgroundImage:`radial-gradient(circle at 20% 20%,#fff 0%,transparent 50%),
                                      radial-gradient(circle at 80% 80%,#fff 0%,transparent 50%)` }} />
          {/* scan lines */}
          <div className="scan-overlay absolute inset-0 opacity-[.035]" />
          <Blobs />
        </div>

        {/* floating geometric shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="blob-drift-2 absolute top-6 right-12 w-24 h-24 rounded-2xl border border-white/12 rotate-12" />
          <div className="blob-drift-1 absolute bottom-8 left-16 w-16 h-16 rounded-full border border-white/10" />
          <div className="blob-drift-3 absolute top-1/2 right-1/4 w-10 h-10 rounded-full border border-white/8" />
        </div>

        <div className="relative px-6 py-9 text-center text-white">

          {/* eyebrow */}
          <div className="header-animate inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/18 backdrop-blur-md">
            <span className="relative pulse-ring inline-block w-1.5 h-1.5 rounded-full bg-[#4CC051]" />
            <span className="text-[10px] font-bold tracking-[.22em] uppercase opacity-85">Plateforme MIRADIA · Accès public</span>
          </div>

          {/* title — taille réduite, poids allégé */}
          <h1 className="header-animate header-animate-d1 mt-4 text-5xl md:text-5xl font-bold tracking-wide leading-snug text-white/90">
            Actualités
          </h1>

          {/* accent bar — plus fine et plus courte */}
          <div className="header-animate header-animate-d2 w-16 h-[2px] mx-auto mt-3 mb-4 rounded-full"
            style={{ background:`linear-gradient(90deg,${M.green},${M.sky})` }} />

          {/* subtitle */}
          <p className="header-animate header-animate-d2 text-white/70 text-[15px] max-w-lg mx-auto leading-relaxed">
            Explorez les dernières publications et informations de MIRADIA.
          </p>

          {/* count badge */}
          {!loading && total > 0 && (
            <div className="count-badge header-animate header-animate-d3 mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/8 border border-white/14 text-[12px] font-semibold text-white/75">
              <span key={total}>{total}</span> article{total > 1 ? "s" : ""}
            </div>
          )}

          {/* search */}
          <div className="search-appear mt-8 flex justify-center">
            <div className="relative w-full max-w-[640px]">

              {/* glow halo */}
              <div className="pointer-events-none absolute -inset-4 rounded-[32px] opacity-50 blur-2xl"
                style={{ background:`radial-gradient(circle at 30%,${M.sky}50,transparent 55%),
                                     radial-gradient(circle at 70%,${M.green}40,transparent 55%)` }} />

              {/* input container */}
              <div className="relative overflow-hidden rounded-[28px] border border-white/22
                              bg-white/12 backdrop-blur-2xl
                              shadow-[0_24px_70px_rgba(0,0,0,.28)]
                              transition-all duration-300
                              focus-within:shadow-[0_30px_90px_rgba(0,0,0,.36)]
                              focus-within:border-white/34 focus-within:bg-white/16">

                {/* gradient overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-70
                  bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,.20),transparent_50%),
                       radial-gradient(circle_at_100%_100%,rgba(255,255,255,.12),transparent_55%)]" />

                <div className="relative flex items-center gap-3 px-3 py-2.5">
                  {/* icon btn */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-[18px] bg-white/12 border border-white/18 flex items-center justify-center">
                    <SearchIcon className="w-5 h-5 text-white/90" />
                  </div>

                  <input
                    ref={inputRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Titre, mot-clé, auteur…"
                    className="flex-1 h-11 bg-transparent outline-none text-[16px] font-semibold
                               text-white placeholder:text-white/55 tracking-wide"
                  />

                  {search?.trim() && (
                    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full
                                    bg-[#4CC051]/20 border border-[#4CC051]/30 text-[11px] font-black text-white/95">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#4CC051] animate-pulse" />
                      Filtre actif
                    </div>
                  )}

                  {search && (
                    <button type="button" onClick={() => { setSearch(""); inputRef.current?.focus(); }}
                      className="w-10 h-10 flex-shrink-0 rounded-[16px] bg-white/10 hover:bg-white/18
                                 border border-white/15 flex items-center justify-center
                                 transition-all active:scale-90" aria-label="Effacer">
                      <XIcon className="w-4 h-4 text-white/90" />
                    </button>
                  )}
                </div>

                {/* bottom accent */}
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px]"
                  style={{ background:`linear-gradient(90deg,${M.green},${M.yellow},${M.sky})` }} />
              </div>

              <p className="mt-2.5 text-[12px] text-white/65 text-center">
                Essayez : <span className="font-bold text-white/85">climat</span>,&nbsp;
                <span className="font-bold text-white/85">assurance</span>,&nbsp;
                <span className="font-bold text-white/85">MIRADIA</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   ARTICLE CARD
========================= */
function ArticleCard({ article }) {
  const img    = toAbsolute(article.featured_image || article.featured_image_url || article?.featured_image?.url || article?.featured_image?.path);
  const date   = formatDate(article.published_at || article.created_at);
  const author = article.author_name || "";
  const title  = article.title || "Sans titre";
  const excerpt= article.excerpt || "";
  const key    = article.slug || article.id;
  const reading= article.reading_time;

  return (
    <article className="art-card group relative flex flex-col rounded-3xl overflow-hidden
                        border border-slate-200/90 bg-white/80 backdrop-blur-sm
                        shadow-[0_4px_20px_rgba(0,0,0,.07)]
                        hover:shadow-[0_16px_50px_rgba(0,0,0,.15)]
                        hover:border-slate-300/80
                        transition-all duration-500
                        dark:border-white/10 dark:bg-slate-900/70
                        dark:hover:border-white/18 dark:hover:shadow-[0_16px_50px_rgba(0,0,0,.45)]">

      {/* shimmer overlay */}
      <div className="card-shimmer" />

      {/* image area */}
      <div className="relative h-56 overflow-hidden bg-slate-100 dark:bg-slate-800">
        {img ? (
          <img src={img} alt={article.featured_image_alt || title}
            className="card-img w-full h-full object-cover"
            loading="lazy" />
        ) : (
          <div className="w-full h-full"
            style={{ background:`linear-gradient(135deg,${M.navy}22,${M.sky}18,${M.green}14)` }}>
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        )}

        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/12 to-transparent" />

        {/* meta overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex items-end justify-between gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/42 backdrop-blur-sm
                          border border-white/14 text-white/90 text-[11px] font-bold">
            <CalIcon className="w-3 h-3 opacity-75" />
            {date}
          </div>
          {reading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/42 backdrop-blur-sm
                            border border-white/14 text-white/90 text-[11px] font-bold">
              <ClockIcon className="w-3 h-3 opacity-75" />
              {reading} min
            </div>
          )}
        </div>

        {/* category chip */}
        {article.category?.name && (
          <div className="absolute top-3 left-3">
            <span className="miradia-tag-pill">{article.category.name}</span>
          </div>
        )}
      </div>

      {/* body */}
      <div className="flex flex-col flex-1 p-6">

        {/* author */}
        {author && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
              style={{ background:`linear-gradient(135deg,${M.sky},${M.teal})` }}>
              {author.charAt(0).toUpperCase()}
            </div>
            <span className="text-[13px] font-semibold text-slate-500 dark:text-slate-400">{author}</span>
          </div>
        )}

        {/* title */}
        <h3 className="card-title text-[22px] md:text-[22px] font-extrabold text-slate-900 leading-snug dark:text-slate-50 line-clamp-2">
          {title}
        </h3>

        {/* excerpt */}
        <p className="mt-3 flex-1 text-[17px] text-slate-600 leading-relaxed line-clamp-3 dark:text-slate-300/80">
          {excerpt
            ? excerpt
            : <span className="italic text-slate-400 dark:text-slate-500">Pas de résumé disponible.</span>
          }
        </p>

        {/* footer */}
        <div className="mt-5 flex items-center justify-end">
          <Link
            to={`/articles/${encodeURIComponent(String(key))}`}
            className="read-btn inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-white text-[15px] font-extrabold"
          >
            Lire l'article
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-3xl"
        style={{ background:`linear-gradient(90deg,${M.sky},${M.green},${M.yellow})` }} />
    </article>
  );
}

/* =========================
   PAGINATION
========================= */
function PaginationBar({ page, lastPage, loading, pages, onPrev, onNext, onGo, perPage, setPerPage, showPerPage }) {
  return (
    <div className="mt-10">
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-xl
                      px-4 py-4 shadow-[0_8px_30px_rgba(0,0,0,.08)]
                      flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4
                      dark:border-white/10 dark:bg-slate-900/60">

        {/* pages */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button disabled={page <= 1 || loading} onClick={onPrev}
            className="pag-btn h-10 px-4 rounded-2xl border border-slate-200 bg-white text-[13px] font-extrabold
                       disabled:opacity-40 hover:bg-slate-50
                       dark:bg-white/5 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/12">
            ← Préc.
          </button>

          {pages.map((p, idx) =>
            p === "…" ? (
              <span key={`d-${idx}`} className="px-2 text-slate-400 font-bold dark:text-slate-500">…</span>
            ) : (
              <button key={p} disabled={loading} onClick={() => onGo(Number(p))}
                className={[
                  "pag-btn h-10 min-w-[40px] px-3 rounded-2xl text-[13px] font-extrabold border transition-colors",
                  Number(p) === page
                    ? "text-white border-transparent shadow-[0_4px_14px_rgba(58,166,220,.45)]"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-100 dark:border-white/10",
                  loading ? "opacity-50" : "",
                ].join(" ")}
                style={Number(p) === page ? { background:`linear-gradient(135deg,${M.sky},${M.teal})` } : {}}>
                {p}
              </button>
            )
          )}

          <button disabled={page >= lastPage || loading} onClick={onNext}
            className="pag-btn h-10 px-4 rounded-2xl border border-slate-200 bg-white text-[13px] font-extrabold
                       disabled:opacity-40 hover:bg-slate-50
                       dark:bg-white/5 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/12">
            Suiv. →
          </button>
        </div>

        {/* controls */}
        <div className="flex items-center justify-center lg:justify-end gap-2">
          {lastPage >= 6 && (
            <select value={page} onChange={(e) => onGo(Number(e.target.value))} disabled={loading}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-extrabold
                         text-slate-800 outline-none cursor-pointer
                         dark:bg-slate-900/60 dark:border-white/10 dark:text-slate-100"
              aria-label="Aller à la page">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                <option key={p} value={p} className="text-slate-900">Page {p}</option>
              ))}
            </select>
          )}
          {showPerPage && (
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))} disabled={loading}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-[13px] font-extrabold
                         text-slate-800 outline-none cursor-pointer
                         dark:bg-slate-900/60 dark:border-white/10 dark:text-slate-100"
              aria-label="Articles par page">
              {[12, 24, 48].map(n => (
                <option key={n} value={n} className="text-slate-900">{n} / page</option>
              ))}
            </select>
          )}
        </div>
      </div>
      {loading && (
        <div className="mt-3 text-[12px] text-slate-400 dark:text-slate-500 text-center animate-pulse">
          Chargement…
        </div>
      )}
    </div>
  );
}

/* =========================
   PAGE PRINCIPALE
========================= */
export default function ArticlesMiradiaPublic() {
  const api = useMemo(() => axios.create({
    baseURL: buildApiBase(),
    headers: { Accept:"application/json" },
    timeout: 20000,
  }), []);

  const [search,   setSearch]   = useState("");
  const [debounced,setDebounced]= useState("");
  const [page,     setPage]     = useState(1);
  const [perPage,  setPerPage]  = useState(12);

  const [state, setState] = useState({
    loading: true, error: "", rows: [], lastPage: 1, total: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, perPage]);

  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    async function load() {
      setState(p => ({ ...p, loading: true, error: "" }));
      try {
        const params = new URLSearchParams({
          page: String(page), per_page: String(perPage), sort: "published_at,desc",
        });
        if (debounced.trim()) params.set("search", debounced.trim());

        const res  = await api.get(`/articlesMiradia?${params}`, { signal: ctrl.signal });
        const data = res?.data || {};
        const rows     = Array.isArray(data.data) ? data.data : [];
        const lastPage = Number(data.meta?.last_page ?? 1) || 1;
        const total    = Number(data.meta?.total ?? data.total ?? 0) || 0;

        if (!cancelled) setState({ loading:false, error:"", rows, lastPage, total });
      } catch(e) {
        if (ctrl.signal.aborted) return;
        const msg = e?.response?.status ? `Erreur HTTP ${e.response.status}` : e?.message || "Erreur chargement";
        if (!cancelled) setState({ loading:false, error:msg, rows:[], lastPage:1, total:0 });
      }
    }

    load();
    return () => { cancelled = true; ctrl.abort(); };
  }, [api, page, perPage, debounced]);

  const pages        = useMemo(() => getPages(page, state.lastPage), [page, state.lastPage]);
  const showPagination = state.total > 12 && state.lastPage > 1;
  const showPerPage    = state.total > 12;

  return (
    <div className="min-h-screen w-full bg-[#EBF3FA] dark:bg-gradient-to-b dark:from-[#071019] dark:via-[#060D18] dark:to-[#040810]">
      <GlobalStyles />

      <div className="relative w-full min-h-screen flex flex-col items-center py-14 px-4 sm:px-6 lg:px-8">

        {/* page-level blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Blobs />
        </div>

        <div className="relative w-full max-w-[1700px] px-2 sm:px-4 lg:px-8">

          {/* header */}
          <TitleBlock search={search} setSearch={setSearch} total={state.total} loading={state.loading} />

          {/* error */}
          {state.error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50/80 backdrop-blur-sm
                            p-4 text-[15px] text-red-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {state.error}
            </div>
          )}

          {/* loading skeletons */}
          {state.loading && state.rows.length === 0 ? (
            <div className="mt-10 grid gap-6" style={{ gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))" }}>
              {Array.from({ length: Math.min(perPage, 12) }).map((_, i) => <SkeletonCard key={i} />)}
            </div>

          /* empty state */
          ) : state.rows.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-sm
                            p-14 text-center dark:border-white/10 dark:bg-slate-900/50">
              <div className="text-7xl mb-5 select-none">📰</div>
              <div className="text-[22px] font-extrabold text-slate-900 dark:text-slate-50">Aucun article trouvé</div>
              <p className="text-[16px] text-slate-500 dark:text-slate-400 mt-2">Essaie un autre mot-clé.</p>
              <button onClick={() => setSearch("")}
                className="read-btn mt-6 px-6 py-3 rounded-2xl text-white text-[15px] font-extrabold">
                Réinitialiser la recherche
              </button>
            </div>

          /* grid */
          ) : (
            <>
              <div className="mt-10 grid gap-7 "
                style={{ gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))" }}>
                {state.rows.map(a => <ArticleCard key={a.id} article={a} />)}
              </div>

              {showPagination && (
                <PaginationBar
                  page={page} lastPage={state.lastPage} loading={state.loading}
                  pages={pages}
                  onPrev={() => setPage(p => Math.max(1, p - 1))}
                  onNext={() => setPage(p => Math.min(state.lastPage, p + 1))}
                  onGo={(p) => setPage(p)}
                  perPage={perPage} setPerPage={setPerPage} showPerPage={showPerPage}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}