// Sidebar.jsx
import React from "react";
import {
  FaFolderOpen,
  FaSearch,
  FaTimes,
  FaBars,
  FaStar,
  FaBackspace,
  FaRegFileAlt,
} from "react-icons/fa";

/* =========================================================
   Helpers (autonomes)
   ========================================================= */
function normalize(str = "") {
  try {
    return String(str).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
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

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/40 bg-white/35 backdrop-blur-xl shadow-[0_10px_30px_-12px_rgba(2,6,23,0.25)] ring-1 ring-white/40 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 font-medium text-slate-700 hover:bg-white/40 transition-all"
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
   Droits (local au Sidebar)
   ========================================================= */
function hasRoleLike(me, re) {
  const roles = (me?.roles || []).map((r) => String(r?.name ?? r).toLowerCase());
  return roles.some((r) => re.test(r));
}

function canManageTagsOf(me) {
  // Rôles forts (admin/modo/manager/owner)
  if (hasRoleLike(me, /(owner|super-?admin|admin|manager|moderator)/i)) return true;

  // Permissions explicites
  const perms = (me?.permissions || []).map((p) =>
    String(p?.name ?? p?.action ?? p).toLowerCase()
  );

  // Exemples de permissions acceptées (adapte selon ton backend)
  const tests = [
    /(tag|tags)\.(create|add|update|edit|delete|manage)/,
    /(articles|media)\.(tag|tags)\.(add|attach|detach|update|edit|delete|manage)/,
    /tags:manage/,
  ];
  return perms.some((n) => tests.some((re) => re.test(n)));
}

/* =========================================================
   Sidebar
   ========================================================= */
export default function Sidebar({
  /* contrôle & callbacks */
  open = true,
  onOpen,
  onClose,
  /* contenu */
  tags = [],
  mediaList = [],
  selectedFile,
  onSelectFile,
  similar = [],
  similarLoading = false,
  onOpenSimilar,
  onOpenTagManager,
  /* composants/ico helpers */
  TagListComponent,
  iconForType,
  iconBgForType,
  toAbsolute,
  /* ➜ NOUVEAU : contexte utilisateur pour droits */
  me = null,
}) {
  const [query, setQuery] = React.useState("");

  const ref = React.useRef(null);

  // Calculer localement si l'utilisateur peut gérer les tags
  const canManageTags = React.useMemo(() => canManageTagsOf(me), [me]);

  // Fermer sur clic extérieur
  React.useEffect(() => {
    if (!open) return;
    function handleDown(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("touchstart", handleDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("touchstart", handleDown);
    };
  }, [open, onClose]);

  // Fermer avec ESC
  React.useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if ((e.key || "").toLowerCase() === "escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sortedFiltered = React.useMemo(() => {
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

  const handleSelect = React.useCallback(
    (f) => {
      onSelectFile?.(f);
      // UX: on ferme après sélection
      onClose?.();
    },
    [onSelectFile, onClose]
  );

  const handleOpenSimilar = React.useCallback(
    (slugOrId) => {
      onOpenSimilar?.(slugOrId);
      onClose?.();
    },
    [onOpenSimilar, onClose]
  );

  /* ---------- bouton flottant “ouvrir” quand fermé ---------- */
  if (!open) {
    return (
      <>
        <button
          onClick={() => onOpen?.()}
          className="fixed top-5 left-5 z-[60] group px-4 py-3 rounded-2xl
                     bg-white/30 backdrop-blur-xl
                     border border-white/40 ring-1 ring-white/50
                     shadow-[0_12px_30px_-10px_rgba(2,6,23,0.35)]
                     hover:bg-white/40 transition-all"
          title="Open library"
        >
          <span className="flex items-center gap-2 text-slate-800">
            <div className="p-2 rounded-xl bg-blue-600 shadow ring-1 ring-white/40">
              <FaBars className="text-white" />
            </div>
            <span className="font-medium hidden sm:inline">Library</span>
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      {/* Overlay glassy pour capter le clic et fermer */}
      <button
        aria-label="Close sidebar overlay"
        onClick={() => onClose?.()}
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[2px]"
      />

      {/* Sidebar */}
      <aside
        ref={ref}
        className="visualiseur-sidebar-animated fixed top-20 left-0 z-50 w=[320px] sm:w-[360px] h-[calc(100vh-5rem)]
                   flex flex-col
                   bg-white/30 backdrop-blur-2xl
                   border-r border-white/40 ring-1 ring-white/40
                   shadow-[0_25px_60px_-20px_rgba(2,6,23,0.45)]
                   animate-slideIn rounded-tr-2xl rounded-br-2xl overflow-hidden"
      >
        {/* HEADER */}
        <header className="p-4 border-b border-white/40 bg-white/30 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center">
            <div className="mr-3 p-2 bg-blue-600 rounded-xl shadow ring-1 ring-white/40">
              <FaFolderOpen className="text-white text-lg" />
            </div>
            <h2 className="text-lg font-medium text-slate-800">Library</h2>
          </div>
          <button
            onClick={() => onClose?.()}
            className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-white/50 transition"
            title="Close"
          >
            <FaTimes />
          </button>
        </header>

        {/* SEARCH BAR */}
        <div className="p-3 relative">
          <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-white/40 rounded-xl
                       focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400
                       text-sm placeholder:text-slate-400
                       shadow-[inset_0_2px_10px_rgba(2,6,23,0.04)]
                       bg-white/50 backdrop-blur-sm transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
              title="Clear"
            >
              <FaBackspace />
            </button>
          )}
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 custom-scroll">
          {/* Files */}
          <Section title="Files" icon={FaFolderOpen}>
            {sortedFiltered.length ? (
              <div className="grid grid-cols-1 gap-2">
                {sortedFiltered.map((f, idx) => {
                  const isActive = selectedFile?.id === f.id;
                  const title = f?.title || f?.name || "Untitled";
                  return (
                    <button
                      key={f.id ?? idx}
                      onClick={() => handleSelect(f)}
                      style={{ animationDelay: `${idx * 70}ms` }}
                      className={`text-left p-3 rounded-xl border transition-all duration-300 animate-fadeSlide
                        ${
                          isActive
                            ? "bg-white/70 border-blue-300 ring-1 ring-blue-200 scale-[1.01]"
                            : "bg-white/40 border-white/50 hover:bg-white/60"
                        }`}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-10 h-10 ${iconBgForType?.(
                            f.type
                          )} rounded-lg flex items-center justify-center mr-3`}
                        >
                          {iconForType?.(f.type, "text-lg")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            <Highlight text={title} query={query} />
                          </p>
                        </div>
                        {f.favorite && (
                          <FaStar className="ml-2 text-amber-400 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-600/80 text-center py-2">
                No media found.
              </p>
            )}
          </Section>

          {/* Tags */}
          <Section title="Tags" icon={FaStar} defaultOpen={false}>
            {Array.isArray(tags) && tags.length > 0 ? (
              TagListComponent ? (
                <TagListComponent
                  tags={tags}
                  onAddClick={canManageTags ? onOpenTagManager : undefined}
                  max={10}
                />
              ) : (
                <p className="text-xs text-slate-500">Tags not provided</p>
              )
            ) : canManageTags ? (
              <button
                onClick={onOpenTagManager}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold
                           border border-emerald-300 text-emerald-700 bg-emerald-50/70
                           hover:bg-emerald-100 rounded-lg transition-all"
              >
                + Add tag
              </button>
            ) : (
              <p className="text-xs text-slate-500/80">No tags.</p>
            )}
          </Section>

          {/* Similar — version compacte */}
          <Section title="Similar" icon={FaStar} defaultOpen={true}>
            {similarLoading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : Array.isArray(similar) && similar.length ? (
              <div className="grid grid-cols-2 gap-2">
                {similar.map((s, i) => {
                  const title = s.title || s.slug || `#${s.id}`;
                  const initials = String(title).slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={s.id ?? s.slug ?? i}
                      onClick={() => handleOpenSimilar(s.slug ?? s.id)}
                      className="w-full text-left rounded-xl border border-white/50 bg-white/50 hover:bg-white/70 transition
                                 p-2.5 flex items-start gap-2 shadow-[0_6px_18px_-10px_rgba(2,6,23,0.25)]"
                      title={title}
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-xs shrink-0">
                        {s.icon ? s.icon : <FaRegFileAlt className="opacity-80" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-slate-800 leading-tight truncate">
                          {title}
                        </div>
                        {s.excerpt ? (
                          <div className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                            {s.excerpt}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">{initials}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500/80">No similar content.</p>
            )}
          </Section>
        </div>
      </aside>

      {/* Styles locaux */}
      <style>{`
        @keyframes fadeSlide {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeSlide { animation: fadeSlide 0.35s ease-out both; }

        @keyframes slideIn {
          0% { transform: translateX(-12px); opacity: 0.7; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn { animation: slideIn 220ms ease-out both; }

        .custom-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(148,163,184,0.5) transparent;
        }
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.45);
          border-radius: 9999px;
        }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        /* Tailwind line-clamp fallback */
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
