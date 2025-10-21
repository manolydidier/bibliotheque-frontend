// src/media-library/Sidebar.jsx
import React, { useMemo, useState, useCallback } from "react";
import {
  FaFolderOpen,
  FaSearch,
  FaClock,
  FaTag,
  FaPlus,
  FaStar,
  FaFile,
  FaTimes,
  FaBackspace,
} from "react-icons/fa";
import SimilarList from "./SimilarList";

/* =========================================================
   Utils recherche (autonome)
   ========================================================= */
function normalize(str = "") {
  try {
    return String(str)
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  } catch {
    return String(str).toLowerCase();
  }
}

function parseSearchQuery(raw = "") {
  const q = (raw || "").trim();
  if (!q) return { tokens: {}, text: "" };

  const parts = q.split(/\s+/);
  const tokens = {};
  const rest = [];

  for (const p of parts) {
    const m = /^([a-z_]+):(.*)$/i.exec(p);
    if (m) {
      const k = normalize(m[1]);
      const v = m[2].trim();
      if (v !== "") tokens[k] = v;
    } else {
      rest.push(p);
    }
  }
  return { tokens, text: rest.join(" ").trim() };
}

function coerceTokenFilters(tokens = {}) {
  const t = Object.fromEntries(
    Object.entries(tokens).map(([k, v]) => [normalize(k), String(v).trim()])
  );

  const type = t.type || t.ty || t.t || ""; // image|video|document|pdf|word|excel|ppt
  const actif = t.actif ?? t.active ?? t.is_active ?? "";
  const vedette = t.vedette ?? t.featured ?? t.is_featured ?? "";

  const toBool = (x) => {
    const n = normalize(String(x));
    if (["1", "oui", "true", "vrai", "yes", "y"].includes(n)) return true;
    if (["0", "non", "false", "faux", "no", "n"].includes(n)) return false;
    return null;
  };

  return {
    type, // string
    is_active: toBool(actif), // true|false|null
    is_featured: toBool(vedette), // true|false|null
    mime: t.mime || "", // ex: application/pdf
    ext: t.ext || "", // ex: pdf, jpg
    id: t.id || "", // substring sur id
  };
}

/** Mise en évidence du match dans un texte (texte libre uniquement) */
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const { text: plain } = parseSearchQuery(query);
  if (!plain) return <>{text}</>;

  const raw = String(text);
  const nText = normalize(raw);
  const nQ = normalize(plain);
  const idx = nText.indexOf(nQ);
  if (idx === -1) return <>{raw}</>;

  const start = raw.slice(0, idx);
  const middle = raw.slice(idx, idx + plain.length);
  const end = raw.slice(idx + plain.length);
  return (
    <>
      {start}
      <mark className="bg-amber-200/70 rounded px-0.5">{middle}</mark>
      {end}
    </>
  );
}

/** Filtrage combiné (tokens + texte libre) */
function matchesQuery(media, rawQuery) {
  if (!rawQuery) return true;

  const { tokens, text } = parseSearchQuery(rawQuery);
  const tk = coerceTokenFilters(tokens);

  // --- 1) Filtres tokenisés ---
  if (tk.type) {
    const t = normalize(tk.type);
    const mtype = normalize(media?.type || "");
    // mapping simple
    const map = {
      pdf: "pdf",
      word: "word",
      excel: "excel",
      ppt: "ppt",
      image: "image",
      video: "video",
      document: "document",
    };
    const expected = map[t] || t;
    if (expected && !mtype.includes(expected)) return false;
  }

  if (tk.is_active != null && media?.is_active != null) {
    if (Boolean(media.is_active) !== tk.is_active) return false;
  }

  // supporte indifféremment is_featured/favorite
  const isFeatured = media?.is_featured ?? media?.favorite ?? false;
  if (tk.is_featured != null) {
    if (Boolean(isFeatured) !== tk.is_featured) return false;
  }

  if (tk.mime && media?.mime_type) {
    const nm = normalize(media.mime_type);
    if (!nm.includes(normalize(tk.mime))) return false;
  }

  if (tk.ext) {
    const ext = normalize(String(tk.ext).replace(/^\./, ""));
    const nameish = `${media?.filename || ""} ${media?.original_name || ""} ${
      media?.title || media?.name || ""
    }`.toLowerCase();
    const urlish = `${media?.fileUrl || media?.url || ""}`.toLowerCase();
    const ends = new RegExp(`\\.${ext}(\\s|$)`).test(nameish) || urlish.endsWith(`.${ext}`);
    if (!ends) return false;
  }

  if (tk.id) {
    const mid = String(media?.id || "");
    if (!mid.includes(String(tk.id))) return false;
  }

  // --- 2) Texte libre résiduel ---
  const nQ = normalize(text);
  if (!nQ) return true;

  const haystacks = [
    media?.title,
    media?.name,
    media?.filename,
    media?.original_name,
    media?.mime_type,
    ...(Array.isArray(media?.tags) ? media.tags : []),
  ]
    .filter(Boolean)
    .map(normalize);

  return haystacks.some((h) => h.includes(nQ));
}

/* =========================================================
   Sidebar avec recherche enrichie
   ========================================================= */
export default function Sidebar({
  open,
  toggle,
  mediaCount,
  tags = [],
  mediaList = [],
  selectedFile,
  onSelectFile,
  similar = [],
  similarLoading = false,
  onOpenSimilar,
  onOpenTagManager,
  TagListComponent,
  iconForType,
  iconBgForType,
  toAbsolute,
}) {
  const [query, setQuery] = useState("");

  /** Liste triée + filtrée */
  const sortedFiltered = useMemo(() => {
    const list = Array.isArray(mediaList) ? mediaList.slice() : [];
    // tri sur title/name/filename
    list.sort((a, b) => {
      const aa = normalize(a?.title || a?.name || a?.filename || a?.original_name || "");
      const bb = normalize(b?.title || b?.name || b?.filename || b?.original_name || "");
      return aa.localeCompare(bb, "fr");
    });
    // filtre (tokens + texte libre)
    return list.filter((m) => matchesQuery(m, query));
  }, [mediaList, query]);

  const handleSelect = useCallback(
    (f) => {
      onSelectFile?.(f);
    },
    [onSelectFile]
  );

  const effectiveCount = useMemo(
    () => (query ? sortedFiltered.length : mediaList.length),
    [query, sortedFiltered.length, mediaList.length]
  );

  // Feedback UX : tokens détectés
  const { tokens } = useMemo(() => parseSearchQuery(query), [query]);
  const coerced = useMemo(() => coerceTokenFilters(tokens), [tokens]);
  const hasTokens = Object.keys(tokens).length > 0;

  return (
    <div
      className={`sidebar pt-4 overflow-auto w-72 lg:w-80 bg-gradient-to-br from-white/80 via-white/75 to-slate-50/80 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border-r border-white/50 flex-shrink-0 transition-all duration-500 ease-in-out ${
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      } lg:block fixed lg:relative inset-y-0 left-0 z-40`}
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-200/40 sticky top-0 bg-gradient-to-r from-white/80 to-slate-50/80 backdrop-blur-2xl z-10 shadow-sm">
        <h2 className="text-2xl font-light text-slate-800 flex items-center tracking-tight">
          <div className="mr-3 p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
            <FaFolderOpen className="text-white text-lg" />
          </div>
          <span className="flex-1">
            Bibliothèque
            {typeof mediaCount === "number" && (
              <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-100/80 px-3 py-1 rounded-full">
                {mediaCount}
              </span>
            )}
          </span>
        </h2>

        {/* Recherche */}
        <div className="mt-6 relative group">
          <input
            type="text"
            placeholder="Rechercher… (ex: type:image actif:1 vedette:0 ext:pdf mot-clef)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3.5 border border-slate-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400/60 bg-white/90 backdrop-blur-sm transition-all duration-300 text-sm placeholder:text-slate-400 shadow-sm hover:shadow-md group-hover:border-slate-300/70"
          />
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-all duration-300 group-focus-within:text-blue-500 group-focus-within:scale-110" />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Effacer"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-md hover:bg-slate-100"
            >
              <FaBackspace />
            </button>
          )}

          {(query || hasTokens) && (
            <div className="mt-2 text-xs text-slate-500 space-y-1">
              {query && (
                <div>
                  {effectiveCount} résultat{effectiveCount > 1 ? "s" : ""} · filtre : “{query}”
                </div>
              )}
              {hasTokens && (
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(coerced)
                    .filter(([_, v]) => v !== "" && v != null)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200"
                        title={`token: ${k}`}
                      >
                        {k}: {String(v)}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contenu défilant */}
      <div className="overflow-y-auto h-full pb-24 scrollbar-thin scrollbar-thumb-slate-300/50 scrollbar-track-transparent hover:scrollbar-thumb-slate-400/50">
        {/* Fichiers liés */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center text-base">
              <span className="mr-2.5 p-1.5 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-lg">
                <FaClock className="text-blue-600 text-sm" />
              </span>
              Fichiers
              {query ? " (filtrés)" : " liés"}
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100/60 px-2.5 py-1 rounded-full font-medium">
              {effectiveCount}
            </span>
          </div>

          <div className="space-y-2.5">
            {sortedFiltered.length ? (
              sortedFiltered.map((f, idx) => {
                const isActive = selectedFile?.id === f.id;
                const title = f?.title || f?.name || f?.filename || "Sans titre";
                const metaLeft = f?.size;
                const metaRight = f?.date;

                return (
                  <div
                    key={f.id ?? `media-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelect(f)}
                    onKeyDown={(e) => {
                      const k = e.key?.toLowerCase();
                      if (k === "enter" || k === " ") {
                        e.preventDefault();
                        handleSelect(f);
                      }
                    }}
                    className={`p-4 rounded-xl cursor-pointer flex items-center transition-all duration-300 border group outline-none ${
                      isActive
                        ? "bg-gradient-to-r from-blue-50/90 to-indigo-50/80 border-blue-300/60 shadow-lg shadow-blue-100/50 scale-[1.02]"
                        : "bg-white/70 border-slate-200/50 hover:border-blue-300/40 hover:shadow-md hover:shadow-slate-200/50 hover:scale-[1.01] hover:bg-white/90 focus:border-blue-300/60"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 ${iconBgForType?.(f.type)} rounded-xl flex items-center justify-center mr-3.5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm`}
                    >
                      {iconForType?.(f.type, "text-xl")}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">
                        <Highlight text={title} query={query} />
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                        {metaLeft ? `${metaLeft} • ` : ""}
                        {metaRight || ""}
                      </p>
                      {!!(Array.isArray(f?.tags) && f.tags.length) && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {f.tags.slice(0, 4).map((t, i) => (
                            <span
                              key={`${t}-${i}`}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100/70 text-slate-600 border border-slate-200/60"
                            >
                              <Highlight text={t} query={query} />
                            </span>
                          ))}
                          {f.tags.length > 4 && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200/60">
                              +{f.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {f.favorite && (
                      <FaStar className="ml-2 text-amber-400 flex-shrink-0 drop-shadow-sm" />
                    )}
                  </div>
                );
              })
            ) : query ? (
              <div className="text-sm text-slate-500 py-10 text-center bg-gradient-to-br from-slate-50/70 to-slate-100/50 rounded-2xl border border-slate-200/40 backdrop-blur-sm">
                <FaFile className="mx-auto mb-3 text-3xl text-slate-300" />
                <p className="font-medium">Aucun média trouvé</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Essayez un autre mot-clé ou effacez la recherche.
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300/70 text-slate-700 bg-white/80 hover:bg-slate-50 hover:border-slate-400 transition-all"
                >
                  <FaTimes />
                  Effacer le filtre
                </button>
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-16 text-center bg-gradient-to-br from-slate-50/70 to-slate-100/50 rounded-2xl border border-slate-200/40 backdrop-blur-sm">
                <FaFile className="mx-auto mb-3 text-3xl text-slate-300" />
                <p className="font-medium">Aucun média lié</p>
                <p className="text-xs text-slate-400 mt-1">Les fichiers apparaîtront ici</p>
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="p-6 border-t border-slate-200/40 bg-gradient-to-b from-transparent to-slate-50/30">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center text-base">
              <span className="mr-2.5 p-1.5 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 rounded-lg">
                <FaTag className="text-emerald-600 text-sm" />
              </span>
              Tags
            </h3>
            {Array.isArray(tags) && tags.length > 0 && (
              <span className="text-xs text-slate-500 bg-slate-100/60 px-2.5 py-1 rounded-full font-medium">
                {tags.length}
              </span>
            )}
          </div>

          {Array.isArray(tags) && tags.length > 0 ? (
            TagListComponent ? (
              <TagListComponent
                tags={tags}
                onAddClick={onOpenTagManager}
                onTagClick={undefined}
                max={10}
              />
            ) : (
              <div className="text-xs text-slate-500 py-4 px-4 bg-amber-50/50 rounded-xl border border-amber-200/40">
                TagListComponent non fourni
              </div>
            )
          ) : (
            <div className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-xl border border-slate-200/40">
              <span className="text-xs text-slate-500 px-3 py-2 rounded-lg bg-white/80 border border-slate-200/40 font-medium">
                Aucun tag
              </span>
              <button
                onClick={onOpenTagManager}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-emerald-300/60 text-emerald-700 bg-gradient-to-r from-emerald-50/80 to-teal-50/70 hover:from-emerald-100/90 hover:to-teal-100/80 hover:border-emerald-400/70 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-105"
                title="Gérer les tags"
                type="button"
              >
                <FaPlus className="text-emerald-600" />
                Ajouter
              </button>
            </div>
          )}
        </div>

        {/* Similaires */}
        <SimilarList
          items={similar}
          loading={similarLoading}
          onOpen={onOpenSimilar}
          toAbsolute={toAbsolute}
        />
      </div>

      {/* Bouton replier (mobile) */}
      <button
        onClick={toggle}
        className="absolute top-6 right-6 p-2 rounded-xl text-slate-600 hover:text-slate-900 lg:hidden transition-all duration-300 bg-white/80 hover:bg-white border border-slate-200/60 hover:border-slate-300 shadow-sm hover:shadow-md hover:scale-110 active:scale-95"
        title="Replier"
        aria-label="Fermer la sidebar"
      >
        <FaTimes className="text-lg" />
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm -z-10 lg:hidden transition-opacity duration-300"
          onClick={toggle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
