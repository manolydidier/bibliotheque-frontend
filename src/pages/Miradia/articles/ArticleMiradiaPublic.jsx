// src/pages/ArticlesMiradiaPublic.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import axios from "axios";
import { Link } from "react-router-dom";

/* ─────────────────────────────────────────
   PALETTE
───────────────────────────────────────── */
const M = {
  navy:   "#124B7C",
  teal:   "#025C86",
  sky:    "#3AA6DC",
  green:  "#4CC051",
  yellow: "#FCCA00",
};

/* ─────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────── */
const GlobalStyles = () => (
  <style>{`
    @keyframes fadeUp {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes blobDrift {
      0%,100% { transform:translate(0,0) scale(1); }
      33%     { transform:translate(16px,-12px) scale(1.04); }
      66%     { transform:translate(-10px,18px) scale(.97); }
    }
    @keyframes shimmer {
      from { transform:translateX(-110%) skewX(-14deg); }
      to   { transform:translateX(210%)  skewX(-14deg); }
    }
    @keyframes pulseDot {
      0%,100% { opacity:1; transform:scale(1); }
      50%     { opacity:.5; transform:scale(.78); }
    }
    @keyframes pulseRing {
      0%   { transform:scale(1);   opacity:.6; }
      100% { transform:scale(2);   opacity:0; }
    }
    @keyframes countPop {
      from { opacity:0; transform:scale(.82) translateY(4px); }
      to   { opacity:1; transform:scale(1)   translateY(0); }
    }
    @keyframes skPulse {
      0%,100% { opacity:1; } 50% { opacity:.4; }
    }

    /* stagger helpers */
    .anim-up  { animation:fadeUp .58s cubic-bezier(.22,1,.36,1) both; }
    .d1 { animation-delay:.07s; }
    .d2 { animation-delay:.15s; }
    .d3 { animation-delay:.25s; }
    .d4 { animation-delay:.36s; }

    /* blobs */
    .blob-1 { animation:blobDrift 15s ease-in-out infinite; }
    .blob-2 { animation:blobDrift 20s ease-in-out infinite reverse; animation-delay:4s; }
    .blob-3 { animation:blobDrift 26s ease-in-out infinite; animation-delay:9s; }

    /* cards */
    .art-card { animation:fadeUp .5s cubic-bezier(.22,1,.36,1) both; }
    .art-card:nth-child(1)  { animation-delay:.04s; }
    .art-card:nth-child(2)  { animation-delay:.08s; }
    .art-card:nth-child(3)  { animation-delay:.12s; }
    .art-card:nth-child(4)  { animation-delay:.16s; }
    .art-card:nth-child(5)  { animation-delay:.20s; }
    .art-card:nth-child(6)  { animation-delay:.24s; }
    .art-card:nth-child(7)  { animation-delay:.28s; }
    .art-card:nth-child(8)  { animation-delay:.32s; }
    .art-card:nth-child(9)  { animation-delay:.36s; }
    .art-card:nth-child(10) { animation-delay:.40s; }
    .art-card:nth-child(11) { animation-delay:.44s; }
    .art-card:nth-child(12) { animation-delay:.48s; }

    /* shimmer */
    .art-card .c-shimmer {
      position:absolute; inset:0; pointer-events:none; overflow:hidden;
      background:linear-gradient(105deg,transparent 36%,rgba(255,255,255,.22) 50%,transparent 64%);
      opacity:0;
    }
    .art-card:hover .c-shimmer { animation:shimmer .68s ease forwards; opacity:1; }

    /* image zoom */
    .art-card .c-img { transition:transform .7s cubic-bezier(.22,1,.36,1); }
    .art-card:hover .c-img { transform:scale(1.06); }

    /* title underline */
    .c-title::after {
      content:""; display:block; height:1.5px; width:0; margin-top:4px;
      border-radius:999px;
      background:linear-gradient(90deg,${M.sky},${M.green});
      transition:width .4s cubic-bezier(.22,1,.36,1);
    }
    .art-card:hover .c-title::after { width:100%; }

    /* read button */
    .read-btn {
      position:relative; overflow:hidden;
      background:linear-gradient(135deg,${M.sky},${M.teal});
      transition:box-shadow .24s, transform .14s;
    }
    .read-btn:hover { box-shadow:0 6px 22px rgba(58,166,220,.36); transform:translateY(-1px); }
    .read-btn:active { transform:translateY(0); }
    .read-btn::after {
      content:""; position:absolute; inset:0;
      background:linear-gradient(105deg,transparent 36%,rgba(255,255,255,.2) 50%,transparent 64%);
      transform:translateX(-110%) skewX(-14deg);
      transition:transform .38s;
    }
    .read-btn:hover::after { transform:translateX(210%) skewX(-14deg); }

    /* tag pill */
    .tag-pill {
      display:inline-flex; align-items:center; gap:5px;
      padding:3px 10px; border-radius:999px;
      font-size:9px; font-weight:800; letter-spacing:.2em; text-transform:uppercase;
      background:rgba(58,166,220,.15); border:1px solid rgba(58,166,220,.26);
      color:rgba(255,255,255,.9); backdrop-filter:blur(6px);
    }
    .tag-pill::before {
      content:""; display:inline-block; width:5px; height:5px; border-radius:50%;
      background:${M.sky}; animation:pulseDot 2.4s ease-in-out infinite;
    }

    /* pulse ring */
    .pulse-ring::before {
      content:""; position:absolute; inset:-3px; border-radius:50%;
      background:rgba(76,192,81,.4);
      animation:pulseRing 1.8s ease-out infinite;
    }

    /* count badge */
    .count-pop { animation:countPop .32s cubic-bezier(.22,1,.36,1) both; }

    /* ── ACCORDION ──
       Animate via real scrollHeight + CSS transition.
       Works on Chrome, Firefox, Safari without layout jank. */
    .excerpt-panel {
      overflow: hidden;
      transition: height .42s cubic-bezier(.22,1,.36,1),
                  opacity .36s cubic-bezier(.22,1,.36,1);
      opacity: 0;
    }
    .excerpt-panel[data-open="true"]  { opacity: 1; }
    .excerpt-panel[data-open="false"] { opacity: 0; }

    /* soft fade on preview bottom */
    .excerpt-preview { position:relative; }
    .excerpt-preview::after {
      content:""; position:absolute; bottom:0; left:0; right:0; height:24px;
      background:linear-gradient(to bottom, transparent, white);
      pointer-events:none;
      transition:opacity .3s ease;
    }
    .dark .excerpt-preview::after {
      background:linear-gradient(to bottom, transparent, rgb(15 23 42 / .68));
    }
    .excerpt-preview.is-open::after { opacity:0; }

    /* toggle btn */
    .excerpt-btn {
      display:inline-flex; align-items:center; gap:4px;
      font-size:11.5px; font-weight:700; letter-spacing:.01em;
      color:${M.sky}; background:none; border:none; cursor:pointer; padding:1px 0;
      transition:color .18s, gap .18s; line-height:1;
    }
    .excerpt-btn:hover { color:${M.teal}; gap:6px; }
    .excerpt-btn .chev {
      transition:transform .38s cubic-bezier(.22,1,.36,1);
      flex-shrink:0;
    }
    .excerpt-btn[aria-expanded="true"] .chev { transform:rotate(180deg); }

    /* search bar */
    .search-wrap { animation:fadeUp .55s cubic-bezier(.22,1,.36,1) .3s both; }

    /* pag btn */
    .pag-btn { transition:background .15s, color .15s, transform .12s, box-shadow .15s; }
    .pag-btn:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 4px 14px rgba(0,0,0,.09); }
    .pag-btn:not(:disabled):active { transform:translateY(0); }

    /* skeleton */
    .sk { animation:skPulse 1.6s ease-in-out infinite; }

    /* scan texture */
    .scan {
      background-image:repeating-linear-gradient(
        0deg,transparent,transparent 2px,rgba(0,0,0,.024) 2px,rgba(0,0,0,.024) 4px
      );
    }

    /* reduced motion */
    @media (prefers-reduced-motion:reduce) {
      *, *::before, *::after {
        animation-duration:.01ms !important;
        animation-iteration-count:1 !important;
        transition-duration:.01ms !important;
      }
    }
  `}</style>
);

/* ─────────────────────────────────────────
   BLOBS
───────────────────────────────────────── */
function Blobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="blob-1 absolute -top-24 -left-20 h-80 w-80 rounded-full blur-3xl opacity-22"
        style={{ background:`radial-gradient(circle at 35%,${M.sky}52,transparent 62%)` }} />
      <div className="blob-2 absolute top-1/3 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-18"
        style={{ background:`radial-gradient(circle at 35%,${M.green}46,transparent 62%)` }} />
      <div className="blob-3 absolute -bottom-24 left-1/3 h-[500px] w-[500px] rounded-full blur-3xl opacity-12"
        style={{ background:`radial-gradient(circle at 35%,${M.yellow}38,transparent 62%)` }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
const fixPath = (u) => {
  if (!u) return u;
  let s = String(u).trim();
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^\/+/, "");
  if (s.startsWith("storage/") || s.startsWith("articles/")) return s.startsWith("storage/") ? s : `storage/${s}`;
  return s;
};

const toAbsolute = (u) => {
  if (!u) return null;
  const fixed = fixPath(u);
  if (!fixed) return null;
  if (/^https?:\/\//i.test(fixed)) return fixed;
  const base = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000")
    .replace(/\/api\/?$/i, "").replace(/\/$/, "");
  return `${base}/${fixed.replace(/^\/+/, "")}`;
};

const formatDate = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt) ? "" : dt.toLocaleDateString("fr-FR", { year:"numeric", month:"short", day:"2-digit" });
};

const buildApiBase = () => {
  const raw = String(import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  return raw.endsWith("/api") ? raw : `${raw}/api`;
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

const getPages = (current, last) => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const c = clamp(current, 1, last);
  const set = new Set([1, last, c, c - 1, c + 1]);
  const arr = [...set].filter(p => p >= 1 && p <= last).sort((a, b) => a - b);
  const out = [];
  arr.forEach((p, i) => {
    out.push(p);
    if (i < arr.length - 1 && arr[i + 1] - p > 1) out.push("…");
  });
  return out;
};

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */
const Ico = {
  Search: (p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.9"/><path d="M16 16 21 21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  X:      (p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Cal:    (p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><rect x="3" y="4" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M3 9h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Clock:  (p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6"/><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
  Arrow:  (p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Chevron:(p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Doc:    (p) => <svg viewBox="0 0 24 24" fill="none" aria-hidden {...p}><rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.4"/><path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>,
};

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/70 overflow-hidden dark:border-white/7 dark:bg-white/4">
      <div className="h-52 sk" style={{ background:"linear-gradient(135deg,#dde6ef,#c8d4df)" }} />
      <div className="p-5 space-y-3">
        <div className="h-4 w-2/3 sk rounded-xl bg-slate-100 dark:bg-white/8" />
        <div className="h-5 w-full sk rounded-xl bg-slate-100 dark:bg-white/8" />
        <div className="h-5 w-3/4 sk rounded-xl bg-slate-100 dark:bg-white/8" />
        <div className="space-y-2 pt-1">
          <div className="h-3.5 w-full sk rounded-lg bg-slate-100 dark:bg-white/8" />
          <div className="h-3.5 w-4/5 sk rounded-lg bg-slate-100 dark:bg-white/8" />
        </div>
        <div className="pt-4 flex justify-end">
          <div className="h-10 w-36 sk rounded-2xl bg-slate-100 dark:bg-white/8" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HEADER
───────────────────────────────────────── */
function Header({ search, setSearch, total, loading }) {
  const inputRef = useRef(null);
  const clearSearch = useCallback(() => { setSearch(""); inputRef.current?.focus(); }, [setSearch]);

  return (
    <header className="relative rounded-[2rem] overflow-hidden
                       ring-1 ring-black/6 dark:ring-white/6
                       shadow-[0_24px_70px_rgba(0,0,0,.15)]">
      {/* BG */}
      <div className="absolute inset-0">
        <div className="absolute inset-0"
          style={{ background:`linear-gradient(148deg,${M.navy} 0%,${M.teal} 50%,${M.sky} 100%)` }} />
        <div className="absolute inset-0 hidden dark:block"
          style={{ background:`linear-gradient(148deg,#06101C 0%,#091828 52%,#0C2038 100%)` }} />
        <div className="scan absolute inset-0 opacity-[.028]" />
        <Blobs />
        {/* subtle mesh */}
        <div className="absolute inset-0 opacity-[.05]"
          style={{ backgroundImage:`radial-gradient(circle at 18% 22%,#fff,transparent 48%),radial-gradient(circle at 82% 78%,#fff,transparent 48%)` }} />
      </div>

      {/* Floating decorative shapes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="blob-2 absolute top-4 right-8 w-20 h-20 rounded-2xl border border-white/10 rotate-12" />
        <div className="blob-1 absolute bottom-5 left-12 w-14 h-14 rounded-full border border-white/8" />
        <div className="blob-3 absolute top-1/2 right-1/4 w-9 h-9 rounded-full border border-white/7" />
      </div>

      <div className="relative px-6 py-10 sm:py-12 text-center text-white">
        {/* Eyebrow */}
        <div className="anim-up inline-flex items-center gap-2 px-3.5 py-1.5
                        rounded-full bg-white/10 border border-white/16 backdrop-blur-md">
          <span className="relative pulse-ring inline-block w-1.5 h-1.5 rounded-full bg-[#4CC051]" />
          <span className="text-[9.5px] font-bold tracking-[.22em] uppercase opacity-80">
            Plateforme MIRADIA · Accès public
          </span>
        </div>

        <h1 className="anim-up d1 mt-5 text-[2.5rem] sm:text-5xl font-bold tracking-wide leading-tight text-white/92">
          Actualités
        </h1>

        <div className="anim-up d2 w-10 h-[1.5px] mx-auto mt-3 mb-4 rounded-full"
          style={{ background:`linear-gradient(90deg,${M.green},${M.sky})` }} />

        <p className="anim-up d2 text-white/62 text-[14px] max-w-sm mx-auto leading-relaxed">
          Explorez les dernières publications et informations de MIRADIA.
        </p>

        {!loading && total > 0 && (
          <div key={total} className="count-pop mt-3 inline-flex items-center gap-1.5 px-3 py-1
                                      rounded-full bg-white/8 border border-white/11
                                      text-[11px] font-semibold text-white/68">
            {total} article{total > 1 ? "s" : ""}
          </div>
        )}

        {/* Search */}
        <div className="search-wrap mt-8 flex justify-center">
          <div className="relative w-full max-w-[560px]">
            {/* Glow halo */}
            <div className="pointer-events-none absolute -inset-3 rounded-[30px] blur-2xl opacity-38"
              style={{ background:`radial-gradient(circle at 28%,${M.sky}52,transparent 55%),radial-gradient(circle at 72%,${M.green}36,transparent 55%)` }} />

            <div className="relative overflow-hidden rounded-[24px]
                            border border-white/20 bg-white/10 backdrop-blur-2xl
                            shadow-[0_18px_56px_rgba(0,0,0,.22)]
                            transition-all duration-300
                            focus-within:border-white/30 focus-within:bg-white/13
                            focus-within:shadow-[0_24px_72px_rgba(0,0,0,.30)]">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="flex-shrink-0 w-10 h-10 rounded-[15px] bg-white/10 border border-white/15
                                flex items-center justify-center">
                  <Ico.Search style={{ width:17, height:17 }} className="text-white/78" />
                </div>

                <input
                  ref={inputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Titre, mot-clé, auteur…"
                  aria-label="Rechercher un article"
                  className="flex-1 h-10 bg-transparent outline-none
                             text-[15px] font-semibold text-white placeholder:text-white/46 tracking-wide"
                />

                {search.trim() && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
                                   bg-[#4CC051]/16 border border-[#4CC051]/26
                                   text-[10px] font-bold text-white/88 flex-shrink-0">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#4CC051] animate-pulse" />
                    Filtre actif
                  </span>
                )}

                {search && (
                  <button type="button" onClick={clearSearch} aria-label="Effacer la recherche"
                    className="flex-shrink-0 w-9 h-9 rounded-[13px] bg-white/9 hover:bg-white/17
                               border border-white/13 flex items-center justify-center
                               transition-colors active:scale-90 min-w-[36px]">
                    <Ico.X style={{ width:15, height:15 }} className="text-white/78" />
                  </button>
                )}
              </div>

              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background:`linear-gradient(90deg,${M.green},${M.yellow},${M.sky})` }} />
            </div>

            {/* Quick suggestions */}
            <p className="mt-2 text-[11px] text-white/50 text-center">
              Essayez&nbsp;:&nbsp;
              {["climat", "assurance", "MIRADIA"].map((w, i) => (
                <React.Fragment key={w}>
                  <button type="button" onClick={() => setSearch(w)}
                    className="font-bold text-white/72 hover:text-white transition-colors
                               underline-offset-2 hover:underline">
                    {w}
                  </button>
                  {i < 2 && <span className="text-white/30">,&nbsp;</span>}
                </React.Fragment>
              ))}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────
   EXCERPT ACCORDION
   Technique : on mesure scrollHeight via ref
   et on anime height via CSS transition.
   Pas de layout thrashing, fluide sur tous
   navigateurs y compris Safari.
───────────────────────────────────────── */
const PREVIEW_CHARS = 130;

function ExcerptAccordion({ text }) {
  const [open, setOpen] = useState(false);
  const panelRef        = useRef(null);
  const rafRef          = useRef(null);

  const isLong = useMemo(() => text && text.length > PREVIEW_CHARS, [text]);
  const preview = useMemo(
    () => isLong ? text.slice(0, PREVIEW_CHARS).trimEnd() + "…" : text,
    [isLong, text]
  );

  /* Animate height */
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;

    cancelAnimationFrame(rafRef.current);

    if (open) {
      /* Expand: measure then set */
      el.style.height = "0px";
      rafRef.current = requestAnimationFrame(() => {
        el.style.height = el.scrollHeight + "px";
      });
    } else {
      /* Collapse: lock height then animate to 0 */
      el.style.height = el.scrollHeight + "px";
      rafRef.current = requestAnimationFrame(() => {
        requestAnimationFrame(() => { el.style.height = "0px"; });
      });
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [open]);

  const toggle = useCallback(() => setOpen(v => !v), []);

  /* No text */
  if (!text) {
    return (
      <p className="mt-2.5 flex-1 italic text-[13.5px] text-slate-400 dark:text-slate-500">
        Pas de résumé disponible.
      </p>
    );
  }

  /* Short text — render directly */
  if (!isLong) {
    return (
      <p className="mt-2.5 flex-1 text-[14px] text-slate-600 leading-relaxed dark:text-slate-300/72">
        {text}
      </p>
    );
  }

  /* Long text — accordion */
  return (
    <div className="mt-2.5 flex-1 flex flex-col gap-1.5">
      {/* Preview */}
      <div className={`excerpt-preview${open ? " is-open" : ""}`}>
        <p className="text-[14px] text-slate-600 leading-relaxed dark:text-slate-300/72 pb-1">
          {open ? text : preview}
        </p>
      </div>

      {/* Hidden panel (height animated) — kept for future use with
          separate "extra" content; here we swap preview text instead */}
      <div
        ref={panelRef}
        data-open={open}
        className="excerpt-panel"
        aria-hidden="true"
        style={{ height: 0 }}
      />

      {/* Toggle */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="excerpt-btn self-start"
      >
        <Ico.Chevron className="chev" style={{ width:13, height:13 }} />
        {open ? "Voir moins" : "Voir plus"}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   ARTICLE CARD
───────────────────────────────────────── */
function ArticleCard({ article }) {
  const img    = toAbsolute(
    article.featured_image
    || article.featured_image_url
    || article?.featured_image?.url
    || article?.featured_image?.path
  );
  const date   = formatDate(article.published_at || article.created_at);
  const author = article.author_name || "";
  const title  = article.title || "Sans titre";
  const excerpt= article.excerpt || "";
  const slug   = article.slug || article.id;
  const reading= article.reading_time;

  return (
    <article className="art-card group relative flex flex-col rounded-3xl overflow-hidden
                        border border-slate-200/80 bg-white/82 backdrop-blur-sm
                        shadow-[0_2px_12px_rgba(0,0,0,.06)]
                        hover:shadow-[0_12px_40px_rgba(0,0,0,.12)]
                        hover:border-slate-300/65
                        transition-[box-shadow,border-color] duration-500
                        dark:border-white/7 dark:bg-slate-900/68
                        dark:hover:border-white/15 dark:hover:shadow-[0_12px_40px_rgba(0,0,0,.40)]">

      <div className="c-shimmer" />

      {/* ── Image ── */}
      <div className="relative h-52 overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
        {img ? (
          <img src={img} alt={article.featured_image_alt || title}
            className="c-img w-full h-full object-cover"
            loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background:`linear-gradient(135deg,${M.navy}18,${M.sky}12,${M.green}0C)` }}>
            <Ico.Doc className="w-12 h-12 text-slate-300 dark:text-slate-600" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/8 to-transparent" />

        {/* Meta bar */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 flex items-end justify-between gap-2">
          {date && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            bg-black/36 backdrop-blur-sm border border-white/11
                            text-white text-[10px] font-semibold">
              <Ico.Cal style={{ width:10, height:10, opacity:.7 }} />
              {date}
            </div>
          )}
          {reading && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full
                            bg-black/36 backdrop-blur-sm border border-white/11
                            text-white/86 text-[10px] font-semibold">
              <Ico.Clock style={{ width:10, height:10, opacity:.7 }} />
              {reading} min
            </div>
          )}
        </div>

        {/* Category */}
        {article.category?.name && (
          <div className="absolute top-3 left-3">
            <span className="tag-pill">{article.category.name}</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-5 pt-4 pb-5 sm:px-6 sm:pb-6">

        {/* Author */}
        {author && (
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center
                            text-[9px] font-black text-white flex-shrink-0"
              style={{ background:`linear-gradient(135deg,${M.sky},${M.teal})` }}
              aria-hidden>
              {author.charAt(0).toUpperCase()}
            </div>
            <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate">
              {author}
            </span>
          </div>
        )}

        {/* Title */}
        <h3 className="c-title text-[18px] sm:text-[19px] font-extrabold
                       text-slate-900 leading-snug dark:text-slate-50 line-clamp-2">
          {title}
        </h3>

        {/* Excerpt */}
        <ExcerptAccordion text={excerpt} />

        {/* CTA */}
        <div className="mt-4 flex items-center justify-end">
          <Link
            to={`/articles/${encodeURIComponent(String(slug))}`}
            className="read-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl
                       text-white text-[13px] font-bold min-h-[44px]"
          >
            Lire l'article
            <Ico.Arrow style={{ width:14, height:14 }} />
          </Link>
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px]
                      opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background:`linear-gradient(90deg,${M.sky},${M.green},${M.yellow})` }} />
    </article>
  );
}

/* ─────────────────────────────────────────
   PAGINATION
───────────────────────────────────────── */
function Pagination({ page, lastPage, loading, pages, onPrev, onNext, onGo, perPage, setPerPage, showPerPage }) {
  return (
    <div className="mt-10">
      <div className="rounded-3xl border border-slate-200/72 bg-white/76 backdrop-blur-xl
                      px-4 py-4 shadow-[0_4px_20px_rgba(0,0,0,.06)]
                      flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4
                      dark:border-white/7 dark:bg-slate-900/55">

        <nav className="flex items-center justify-center gap-1.5 flex-wrap" aria-label="Pagination">
          <button disabled={page <= 1 || loading} onClick={onPrev} aria-label="Page précédente"
            className="pag-btn h-10 px-4 rounded-2xl border border-slate-200 bg-white
                       text-[12px] font-bold text-slate-700 disabled:opacity-32 hover:bg-slate-50
                       dark:bg-white/5 dark:border-white/8 dark:text-slate-200 dark:hover:bg-white/10
                       min-w-[44px]">
            ← Préc.
          </button>

          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`sep-${i}`} className="px-1 text-slate-400 font-bold select-none dark:text-slate-500">…</span>
            ) : (
              <button key={p} disabled={loading} onClick={() => onGo(+p)}
                aria-label={`Page ${p}`} aria-current={+p === page ? "page" : undefined}
                className={[
                  "pag-btn h-10 min-w-[40px] px-3 rounded-2xl text-[12px] font-bold border",
                  +p === page
                    ? "text-white border-transparent shadow-[0_3px_12px_rgba(58,166,220,.36)]"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-200 dark:border-white/8",
                  loading ? "opacity-38" : "",
                ].filter(Boolean).join(" ")}
                style={+p === page ? { background:`linear-gradient(135deg,${M.sky},${M.teal})` } : {}}>
                {p}
              </button>
            )
          )}

          <button disabled={page >= lastPage || loading} onClick={onNext} aria-label="Page suivante"
            className="pag-btn h-10 px-4 rounded-2xl border border-slate-200 bg-white
                       text-[12px] font-bold text-slate-700 disabled:opacity-32 hover:bg-slate-50
                       dark:bg-white/5 dark:border-white/8 dark:text-slate-200 dark:hover:bg-white/10
                       min-w-[44px]">
            Suiv. →
          </button>
        </nav>

        <div className="flex items-center justify-center sm:justify-end gap-2">
          {lastPage >= 6 && (
            <select value={page} onChange={(e) => onGo(+e.target.value)} disabled={loading}
              aria-label="Aller à la page"
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3
                         text-[12px] font-bold text-slate-700 outline-none cursor-pointer
                         dark:bg-slate-900/55 dark:border-white/8 dark:text-slate-200">
              {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                <option key={p} value={p}>Page {p}</option>
              ))}
            </select>
          )}
          {showPerPage && (
            <select value={perPage} onChange={(e) => setPerPage(+e.target.value)} disabled={loading}
              aria-label="Articles par page"
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3
                         text-[12px] font-bold text-slate-700 outline-none cursor-pointer
                         dark:bg-slate-900/55 dark:border-white/8 dark:text-slate-200">
              {[12, 24, 48].map(n => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 text-center animate-pulse">
          Chargement…
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   PAGE PRINCIPALE
───────────────────────────────────────── */
export default function ArticlesMiradiaPublic() {
  const api = useMemo(() => axios.create({
    baseURL: buildApiBase(),
    headers: { Accept:"application/json" },
    timeout: 20_000,
  }), []);

  const [search,    setSearch]    = useState("");
  const [debounced, setDebounced] = useState("");
  const [page,      setPage]      = useState(1);
  const [perPage,   setPerPage]   = useState(12);
  const [state,     setState]     = useState({
    loading: true, error: "", rows: [], lastPage: 1, total: 0,
  });

  /* Debounce */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 360);
    return () => clearTimeout(t);
  }, [search]);

  /* Reset page */
  useEffect(() => setPage(1), [debounced, perPage]);

  /* Fetch */
  useEffect(() => {
    const ctrl = new AbortController();
    let cancelled = false;

    (async () => {
      setState(s => ({ ...s, loading: true, error: "" }));
      try {
        const params = new URLSearchParams({
          page: String(page), per_page: String(perPage), sort: "published_at,desc",
        });
        if (debounced.trim()) params.set("search", debounced.trim());

        const { data } = await api.get(`/articlesMiradia?${params}`, { signal: ctrl.signal });
        const rows     = Array.isArray(data.data) ? data.data : [];
        const lastPage = Number(data.meta?.last_page ?? 1) || 1;
        const total    = Number(data.meta?.total ?? data.total ?? 0) || 0;

        if (!cancelled) setState({ loading: false, error: "", rows, lastPage, total });
      } catch (e) {
        if (ctrl.signal.aborted || cancelled) return;
        const msg = e?.response?.status
          ? `Erreur HTTP ${e.response.status}`
          : e?.message || "Impossible de charger les articles.";
        setState({ loading: false, error: msg, rows: [], lastPage: 1, total: 0 });
      }
    })();

    return () => { cancelled = true; ctrl.abort(); };
  }, [api, page, perPage, debounced]);

  const pages          = useMemo(() => getPages(page, state.lastPage), [page, state.lastPage]);
  const showPagination = state.total > 12 && state.lastPage > 1;
  const showPerPage    = state.total > 12;

  const gotoPage = useCallback((p) => setPage(clamp(p, 1, state.lastPage)), [state.lastPage]);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);
  const nextPage = useCallback(() => setPage(p => Math.min(state.lastPage, p + 1)), [state.lastPage]);

  return (
    <div className="min-h-screen w-full bg-[#EAF2FA]
                    dark:bg-gradient-to-b dark:from-[#070F1A] dark:via-[#060C16] dark:to-[#040810]">
      <GlobalStyles />

      <div className="relative w-full min-h-screen flex flex-col items-center
                      py-12 sm:py-16 px-4 sm:px-6 lg:px-8">

        {/* Page blobs */}
        <Blobs />

        <div className="relative w-full max-w-[1700px]">

          <Header search={search} setSearch={setSearch} total={state.total} loading={state.loading} />

          {/* Error */}
          {state.error && (
            <div role="alert"
              className="mt-6 rounded-2xl border border-red-200/75 bg-red-50/75 backdrop-blur-sm
                         p-4 text-[13.5px] text-red-700
                         dark:border-rose-500/16 dark:bg-rose-500/7 dark:text-rose-300">
              {state.error}
            </div>
          )}

          {/* Skeletons */}
          {state.loading && state.rows.length === 0 && (
            <div className="mt-10 grid gap-5"
              style={{ gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))" }}>
              {Array.from({ length: Math.min(perPage, 12) }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}

          {/* Empty */}
          {!state.loading && state.rows.length === 0 && !state.error && (
            <div className="mt-12 rounded-3xl border border-slate-200/72 bg-white/76 backdrop-blur-sm
                            p-12 sm:p-16 text-center
                            dark:border-white/7 dark:bg-slate-900/48">
              <div className="text-6xl mb-4 select-none" aria-hidden>📰</div>
              <p className="text-[19px] font-extrabold text-slate-900 dark:text-slate-50">
                Aucun article trouvé
              </p>
              <p className="mt-1.5 text-[13.5px] text-slate-500 dark:text-slate-400">
                Essayez un autre mot-clé ou réinitialisez la recherche.
              </p>
              <button onClick={() => setSearch("")}
                className="read-btn mt-6 px-6 py-3 rounded-2xl text-white text-[13.5px] font-bold min-h-[44px]">
                Réinitialiser
              </button>
            </div>
          )}

          {/* Grid */}
          {state.rows.length > 0 && (
            <>
              <div className="mt-10 grid gap-5 sm:gap-6"
                style={{ gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))" }}>
                {state.rows.map(a => <ArticleCard key={a.id} article={a} />)}
              </div>

              {showPagination && (
                <Pagination
                  page={page} lastPage={state.lastPage}
                  loading={state.loading} pages={pages}
                  onPrev={prevPage} onNext={nextPage} onGo={gotoPage}
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