import React, { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FaFolderOpen,
  FaSearch,
  FaClock,
  FaTag,
  FaPlus,
  FaStar,
  FaTimes,
  FaBars,
  FaBackspace,
} from "react-icons/fa";
import SimilarList from "./SimilarList";

/* =========================================================
   Utils simples
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
    } else rest.push(p);
  }
  return { tokens, text: rest.join(" ").trim() };
}

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

/* =========================================================
   Section (accordéon)
   ========================================================= */
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200/60 rounded-xl bg-white/70 mb-3 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 transition-all"
      >
        <span className="flex items-center gap-2">
          <Icon className="text-blue-600" /> {title}
        </span>
        <span
          className={`text-slate-400 text-xs transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          ▼
        </span>
      </button>
      <div
        className={`transition-all duration-500 ease-in-out ${
          open
            ? "max-h-[800px] opacity-100 translate-y-0"
            : "max-h-0 opacity-0 -translate-y-2"
        }`}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* =========================================================
   Sidebar principale avec i18n
   ========================================================= */
export default function Sidebar({
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
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);

  const sortedFiltered = useMemo(() => {
    const list = Array.isArray(mediaList) ? mediaList.slice() : [];
    list.sort((a, b) => {
      const aa = normalize(a?.title || a?.name || "");
      const bb = normalize(b?.title || b?.name || "");
      return aa.localeCompare(bb, "fr");
    });
    return list.filter((m) =>
      query
        ? normalize(
            m?.title || m?.name || m?.filename || m?.original_name || ""
          ).includes(normalize(query))
        : true
    );
  }, [mediaList, query]);

  const handleSelect = useCallback((f) => onSelectFile?.(f), [onSelectFile]);

  return (
    <>
      {/* === Open Button (always visible) === */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-96 z-50 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-transform duration-300 hover:scale-110"
          title={t("Open library")}
        >
          <FaBars className="text-lg" />
        </button>
      )}

      {/* === Sidebar === */}
      <aside
        className={`fixed top-0 left-0 flex flex-col w-96 min-h-screen
          bg-gradient-to-br from-white via-slate-50 to-slate-100
          backdrop-blur-xl border-r border-slate-200 shadow-xl z-40
          transform transition-transform duration-500 ease-in-out
          ${
            open
              ? "translate-x-0 opacity-100"
              : "-translate-x-[calc(100%-3rem)] opacity-90"
          }`}
      >
        {/* HEADER */}
        <header className="p-5 border-b border-slate-200 bg-white/70 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-blue-600 rounded-xl shadow">
              <FaFolderOpen className="text-white text-lg" />
            </div>
            <h2 className="text-xl font-medium text-slate-800">
              {t("Library")}
            </h2>
          </div>
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title={t("Close")}
          >
            <FaTimes />
          </button>
        </header>

        {/* SEARCH BAR */}
        <div className="p-4 relative">
          <FaSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("Search...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-sm placeholder:text-slate-400 shadow-sm bg-white/90 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              title={t("Clear")}
            >
              <FaBackspace />
            </button>
          )}
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-300/50 hover:scrollbar-thumb-slate-400/50">
          <Section title={t("Files")} icon={FaClock}>
            {sortedFiltered.length ? (
              sortedFiltered.map((f, idx) => {
                const isActive = selectedFile?.id === f.id;
                const title = f?.title || f?.name || t("Untitled");
                return (
                  <div
                    key={f.id ?? idx}
                    style={{ animationDelay: `${idx * 70}ms` }}
                    onClick={() => handleSelect(f)}
                    className={`p-3 mb-2 rounded-lg cursor-pointer flex items-center border animate-fadeSlide
                      transition-all duration-300 ${
                        isActive
                          ? "bg-blue-50 border-blue-400 scale-[1.02]"
                          : "bg-white border-slate-200 hover:bg-blue-50/40 hover:border-blue-300"
                      }`}
                  >
                    <div
                      className={`w-10 h-10 ${iconBgForType?.(
                        f.type
                      )} rounded-lg flex items-center justify-center mr-3`}
                    >
                      {iconForType?.(f.type, "text-lg")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        <Highlight text={title} query={query} />
                      </p>
                    </div>
                    {f.favorite && (
                      <FaStar className="ml-2 text-amber-400 flex-shrink-0" />
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-3">
                {t("No media found.")}
              </p>
            )}
          </Section>

          <Section title={t("Tags")} icon={FaTag}>
            {Array.isArray(tags) && tags.length > 0 ? (
              TagListComponent ? (
                <TagListComponent
                  tags={tags}
                  onAddClick={onOpenTagManager}
                  max={10}
                />
              ) : (
                <p className="text-xs text-slate-500">{t("Tags not provided")}</p>
              )
            ) : (
              <button
                onClick={onOpenTagManager}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
              >
                <FaPlus /> {t("Add tag")}
              </button>
            )}
          </Section>

          <Section title={t("Similar")} icon={FaStar}>
            <SimilarList
              items={similar}
              loading={similarLoading}
              onOpen={onOpenSimilar}
              toAbsolute={toAbsolute}
            />
          </Section>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className={`ml-${open ? "80" : "12"} transition-all duration-500`}>
        {/* Your main viewer content here */}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes fadeSlide {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlide {
          animation: fadeSlide 0.4s ease-out both;
        }
      `}</style>
    </>
  );
}
