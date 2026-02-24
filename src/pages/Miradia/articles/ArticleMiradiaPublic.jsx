// src/pages/ArticlesMiradiaPublic.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

/* =========================
   PALETTE MIRADIA
========================= */
const MIRADIA = {
  navy: "#124B7C",
  teal: "#025C86",
  sky: "#3AA6DC",
  green: "#4CC051",
  yellow: "#FCCA00",
};

/* =========================
   Background blobs (light + dark)
========================= */
function AnimatedBackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* LIGHT blobs */}
      <div
        className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-35 dark:opacity-18"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.sky}55, transparent 60%)`,
        }}
      />
      <div
        className="absolute top-1/3 -right-24 h-96 w-96 rounded-full blur-3xl opacity-28 dark:opacity-15"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.green}55, transparent 60%)`,
        }}
      />
      <div
        className="absolute -bottom-28 left-1/3 h-[520px] w-[520px] rounded-full blur-3xl opacity-20 dark:opacity-12"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${MIRADIA.yellow}44, transparent 60%)`,
        }}
      />

      {/* DARK extra blobs */}
      <div className="hidden dark:block">
        <div
          className="absolute top-1/4 -left-12 h-[420px] w-[420px] rounded-full blur-3xl opacity-10"
          style={{
            background: `radial-gradient(circle at 40% 40%, #7C3AED33, transparent 65%)`,
          }}
        />
        <div
          className="absolute bottom-1/4 -right-12 h-[480px] w-[480px] rounded-full blur-3xl opacity-8"
          style={{
            background: `radial-gradient(circle at 60% 60%, #4F46E533, transparent 70%)`,
          }}
        />
        <div
          className="absolute top-3/4 left-1/4 h-[380px] w-[380px] rounded-full blur-3xl opacity-12"
          style={{
            background: `radial-gradient(circle at 20% 80%, #0EA5E933, transparent 60%)`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================
   Image utils (comme GridCard)
========================= */
const fixFeaturedPath = (u) => {
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
  const fixed = fixFeaturedPath(u);
  if (!fixed) return null;
  if (/^https?:\/\//i.test(fixed)) return fixed;

  const base = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000")
    .replace(/\/api\/?$/i, "")
    .replace(/\/$/, "");

  return base ? `${base}/${fixed.replace(/^\/+/, "")}` : `/${fixed.replace(/^\/+/, "")}`;
};

/* =========================
   Helpers
========================= */
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleDateString("fr-FR", { year: "numeric", month: "short", day: "2-digit" });
}

function buildApiBase() {
  const raw = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
  const base = String(raw).replace(/\/$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function getPages(current, last) {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const c = clamp(current, 1, last);
  const pages = new Set([1, last, c, c - 1, c + 1]);
  const arr = Array.from(pages)
    .filter((p) => p >= 1 && p <= last)
    .sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < arr.length; i++) {
    out.push(arr[i]);
    if (i < arr.length - 1 && arr[i + 1] - arr[i] > 1) out.push("…");
  }
  return out;
}

/* =========================
   Icons (inline)
========================= */
function SearchIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* =========================
   Skeleton card
========================= */
function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="h-52 bg-slate-100 animate-pulse dark:bg-white/10" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 bg-slate-100 animate-pulse rounded dark:bg-white/10" />
        <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded dark:bg-white/10" />
        <div className="h-3 w-full bg-slate-100 animate-pulse rounded dark:bg-white/10" />
        <div className="h-3 w-5/6 bg-slate-100 animate-pulse rounded dark:bg-white/10" />
        <div className="pt-2 flex items-center justify-between">
          <div className="h-3 w-16 bg-slate-100 animate-pulse rounded dark:bg-white/10" />
          <div className="h-10 w-36 bg-slate-100 animate-pulse rounded-2xl dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

/* =========================
   Title (premium + dark/light)
   ✅ Search amélioré (glassy + halo + chip + underline)
========================= */
function TitleBlock({ search, setSearch }) {
  return (
    <div className="w-full">
      <div className="relative rounded-3xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.14)]">
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(135deg, ${MIRADIA.teal}, ${MIRADIA.navy} 55%, ${MIRADIA.sky})` }}
          />
          <div className="absolute inset-0 hidden dark:block bg-gradient-to-b from-[#0B1626] via-[#071223] to-[#050A12]" />
          <AnimatedBackgroundBlobs />
          <div className="absolute inset-0 opacity-[0.07] dark:opacity-[0.06] bg-[radial-gradient(circle_at_10%_10%,white_0%,transparent_40%)]" />
          <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.05] bg-[radial-gradient(circle_at_80%_20%,white_0%,transparent_55%)]" />
        </div>

        <div className="relative px-6 py-10 text-center text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/12 border border-white/20 text-xs font-extrabold tracking-wider backdrop-blur-md">
            Plateforme MIRADIA • Accès public
          </div>

          <h1 className="mt-4 text-3xl md:text-5xl mb-3 font-black tracking-tight">
            Actualités
          </h1>

          <div
            className="w-32 h-1 mx-auto mb-5 rounded-full"
            style={{ background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow})` }}
          />

          <p className="text-white/85 max-w-2xl mx-auto">
            Recherchez un article et ouvrez sa page de détail.
          </p>

          {/* ✅ Search glass (PLUS STYLÉ) */}
          <div className="mt-7 flex justify-center">
            <div className="relative w-full max-w-[620px]">
              {/* glow halo */}
              <div
                className="pointer-events-none absolute -inset-3 rounded-[28px] opacity-40 blur-2xl"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${MIRADIA.sky}55, transparent 55%),
                               radial-gradient(circle at 70% 70%, ${MIRADIA.green}45, transparent 55%)`,
                }}
              />

              {/* container */}
              <div
                className="
                  relative overflow-hidden rounded-[26px]
                  border border-white/20
                  bg-white/10 backdrop-blur-2xl
                  shadow-[0_20px_60px_rgba(0,0,0,0.25)]
                  transition-all duration-300
                  focus-within:shadow-[0_26px_80px_rgba(0,0,0,0.32)]
                  focus-within:border-white/30
                "
              >
                {/* subtle gradient overlay */}
                <div className="pointer-events-none absolute inset-0 opacity-80 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.22),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.12),transparent_55%)]" />

                <div className="relative flex items-center gap-2 px-3 py-2.5">
                  {/* icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 border border-white/15">
                    <SearchIcon className="w-5 h-5 text-white/90" />
                  </div>

                  {/* input */}
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un titre, un mot-clé…"
                    className="
                      flex-1 h-11 bg-transparent outline-none
                      text-sm md:text-[15px] font-semibold
                      text-white placeholder:text-white/65
                      px-1
                    "
                  />

                  {/* chip état */}
                  {search?.trim() ? (
                    <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold text-white/90">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      Filtre actif
                    </div>
                  ) : null}

                  {/* clear */}
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="
                        h-10 w-10 rounded-2xl
                        bg-white/10 hover:bg-white/15
                        border border-white/15
                        flex items-center justify-center
                        transition-transform active:scale-[0.98]
                      "
                      aria-label="Effacer"
                      title="Effacer"
                    >
                      <XIcon className="w-4 h-4 text-white/90" />
                    </button>
                  ) : null}
                </div>

                {/* focus underline */}
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] opacity-80"
                  style={{
                    background: `linear-gradient(90deg, ${MIRADIA.green}, ${MIRADIA.yellow}, ${MIRADIA.sky})`,
                  }}
                />
              </div>

              {/* helper text */}
              <div className="mt-2 text-center text-[12px] text-white/75">
                Astuce : tapez un mot-clé (ex. <span className="font-bold">climat</span>,{" "}
                <span className="font-bold">assurance</span>,{" "}
                <span className="font-bold">MIRADIA</span>)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Pagination bar
========================= */
function PaginationBar({ page, lastPage, loading, pages, onPrev, onNext, onGo, perPage, setPerPage, showPerPage }) {
  const showJump = lastPage >= 6;

  return (
    <div className="mt-10">
      <div className="rounded-3xl border border-slate-200 bg-white/80 backdrop-blur-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-center gap-2 flex-wrap w-full">
          <button
            disabled={page <= 1 || loading}
            onClick={onPrev}
            className="h-10 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-extrabold disabled:opacity-50 hover:bg-slate-50 active:scale-[0.99]
                       dark:bg-white/5 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
          >
            ←
          </button>

          {pages.map((p, idx) =>
            p === "…" ? (
              <span key={`dots-${idx}`} className="px-2 text-slate-500 font-extrabold dark:text-slate-200/60">
                …
              </span>
            ) : (
              <button
                key={p}
                disabled={loading}
                onClick={() => onGo(Number(p))}
                className={[
                  "h-10 min-w-10 px-3 rounded-2xl text-sm font-extrabold border transition-colors",
                  Number(p) === page
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-100 dark:border-white/10 dark:hover:bg-white/10",
                  loading ? "opacity-60" : "",
                ].join(" ")}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={page >= lastPage || loading}
            onClick={onNext}
            className="h-10 px-3 rounded-2xl border border-slate-200 bg-white text-sm font-extrabold disabled:opacity-50 hover:bg-slate-50 active:scale-[0.99]
                       dark:bg-white/5 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
          >
            →
          </button>
        </div>

        <div className="flex items-center justify-center lg:justify-end gap-2">
          {showJump && (
            <select
              value={page}
              onChange={(e) => onGo(Number(e.target.value))}
              disabled={loading}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none
                         dark:bg-white/5 dark:border-white/10 dark:text-slate-100"
              aria-label="Aller à la page"
            >
              {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p} className="text-slate-900">
                  Page {p}
                </option>
              ))}
            </select>
          )}

          {showPerPage && (
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              disabled={loading}
              className="h-10 sm:w-[140px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-800 outline-none
                         dark:bg-white/5 dark:border-white/10 dark:text-slate-100"
              aria-label="Articles par page"
            >
              {[12, 24, 48].map((n) => (
                <option key={n} value={n} className="text-slate-900">
                  {n}/page
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? <div className="mt-3 text-xs text-slate-500 dark:text-slate-200/60 text-center">Mise à jour…</div> : null}
    </div>
  );
}

/* =========================
   PAGE (même structure / largeur que Organigramme)
========================= */
export default function ArticlesMiradiaPublic() {
  const api = useMemo(() => {
    return axios.create({
      baseURL: buildApiBase(),
      headers: { Accept: "application/json" },
      timeout: 20000,
    });
  }, []);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);

  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    lastPage: 1,
    total: 0,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [debounced, perPage]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      setState((p) => ({ ...p, loading: true, error: "" }));
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(perPage),
          sort: "published_at,desc",
        });
        if (debounced.trim()) params.set("search", debounced.trim());

        const res = await api.get(`/articlesMiradia?${params.toString()}`, { signal: controller.signal });

        const payload = res?.data || {};
        const rows = Array.isArray(payload.data) ? payload.data : [];
        const lastPage = Number(payload.meta?.last_page ?? 1) || 1;
        const total = Number(payload.meta?.total ?? payload.total ?? 0) || 0;

        if (!cancelled) setState({ loading: false, error: "", rows, lastPage, total });
      } catch (e) {
        if (controller.signal.aborted) return;
        const msg = e?.response?.status ? `Erreur HTTP ${e.response.status}` : e?.message || "Erreur chargement articles";
        if (!cancelled) setState({ loading: false, error: msg, rows: [], lastPage: 1, total: 0 });
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api, page, perPage, debounced]);

  const pages = useMemo(() => getPages(page, state.lastPage), [page, state.lastPage]);

  const showPagination = state.total > 12 && state.lastPage > 1;
  const showPerPage = state.total > 12;

  return (
    <div className="min-h-screen flex items-center w-full bg-[#eef5fb] dark:bg-gradient-to-b dark:from-[#0B1626] dark:via-[#070F1C] dark:to-[#050A12]">
      {/* ✅ EXACTEMENT comme Organigramme */}
      <div className="relative w-full min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <AnimatedBackgroundBlobs />
        </div>

        {/* ✅ EXACTEMENT la même largeur que Organigramme */}
        <div className="relative flex-col w-full max-w-[1700px] px-2 sm:px-4 lg:px-8 py-8">
          <TitleBlock search={search} setSearch={setSearch} />

          {state.error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
              {state.error}
            </div>
          ) : null}

          {state.loading && state.rows.length === 0 ? (
            <div className="mt-8 grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
              {Array.from({ length: Math.min(perPage, 12) }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : state.rows.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-white/10 dark:bg-white/5">
              <div className="text-7xl mb-4">📰</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-50">Aucun article</div>
              <div className="text-sm text-slate-600 mt-1 dark:text-slate-200/75">Essaie un autre mot-clé.</div>
              <button
                onClick={() => setSearch("")}
                className="mt-5 px-4 py-2 rounded-2xl bg-sky-600 text-white font-extrabold hover:bg-sky-700 active:scale-[0.99]"
              >
                Réinitialiser
              </button>
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))" }}>
                {state.rows.map((a) => {
                  const img = toAbsolute(a.featured_image || a.featured_image_url || a?.featured_image?.url || a?.featured_image?.path);
                  const date = formatDate(a.published_at || a.created_at);
                  const author = a.author_name ? `✍️ ${a.author_name}` : "";
                  const title = a.title || "Sans titre";
                  const excerpt = a.excerpt || "";
                  const key = a.slug || a.id;

                  return (
                    <article
                      key={a.id}
                      className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow
                                 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-white/10 dark:bg-white/5"
                    >
                      <div className="relative h-56 bg-slate-100 overflow-hidden dark:bg-white/10">
                        {img ? (
                          <img
                            src={img}
                            alt={a.featured_image_alt || title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-sky-50 to-slate-100 dark:from-white/10 dark:to-white/0" />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/0" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="px-2 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold text-white/90">
                            {date}
                          </span>
                          <span className="text-[11px] font-extrabold text-white/85 truncate max-w-[60%] text-right">
                            {author}
                          </span>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-base md:text-lg font-extrabold text-slate-900 leading-snug line-clamp-2 dark:text-slate-50">
                          {title}
                        </h3>

                        <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3 dark:text-slate-200/75">
                          {excerpt ? excerpt : <span className="italic text-slate-500 dark:text-slate-200/60">Pas de résumé.</span>}
                        </p>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="text-xs font-bold text-slate-500 dark:text-slate-200/60">
                            {a.reading_time ? `${a.reading_time} min` : ""}
                          </div>

                          <Link
                            to={`/articles/${encodeURIComponent(String(key))}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-sky-600 text-white text-sm font-extrabold hover:bg-sky-700 active:scale-[0.99]"
                          >
                            Lire l’article →
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {showPagination ? (
                <PaginationBar
                  page={page}
                  lastPage={state.lastPage}
                  loading={state.loading}
                  pages={pages}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(state.lastPage, p + 1))}
                  onGo={(p) => setPage(p)}
                  perPage={perPage}
                  setPerPage={setPerPage}
                  showPerPage={showPerPage}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}