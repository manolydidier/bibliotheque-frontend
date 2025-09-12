// src/pages/media-library/Visualiseur/TagManagerModal.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import axios from "axios";
import {
  FaTimes, FaSearch, FaPlus, FaTag, FaTrash, FaPen,
  FaLink, FaUnlink, FaSpinner, FaCheck, FaArrowUp, FaArrowDown,
  FaEyeDropper, FaCopy, FaChevronDown, FaColumns
} from "react-icons/fa";

/* =========================================================
   Flash (fallback si pas de toast global)
   ========================================================= */
function useFlash() {
  const [flashes, setFlashes] = useState([]);
  const remove = useCallback((id) => setFlashes((p) => p.filter((f) => f.id !== id)), []);
  const push = useCallback((type, message, ttl = 3000) => {
    (async () => {
      try {
        const mod = await import("../../../component/toast/toast");
        const toast = mod?.toast || mod?.default || null;
        if (toast?.[type]) toast[type](message);
        else if (toast) toast(message);
      } catch {}
    })();
    const id = Math.random().toString(36).slice(2);
    setFlashes((p) => [...p, { id, type, message }]);
    setTimeout(() => remove(id), ttl);
  }, [remove]);
  return { flashes, push, remove };
}

function FlashStack({ flashes, onClose }) {
  if (!flashes.length) return null;
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[110] space-y-2" aria-live="polite">
      {flashes.map((f) => (
        <div
          key={f.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg backdrop-blur-sm
            ${f.type === "error"
              ? "bg-red-50/95 border border-red-200/80 text-red-800"
              : f.type === "success"
              ? "bg-green-50/95 border border-green-200/80 text-green-800"
              : "bg-white/95 border border-gray-200/80 text-gray-800"}`}
        >
          <div className="text-sm font-medium">{f.message}</div>
          <button
            onClick={() => onClose(f.id)}
            className="text-xs opacity-60 hover:opacity-100"
            aria-label="Fermer"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   axios helpers + erreurs Laravel
   ========================================================= */
function getTokenGuard() {
  try {
    return localStorage.getItem("tokenGuard") || sessionStorage.getItem("tokenGuard") || null;
  } catch {
    return null;
  }
}
function makeAxios() {
  const base = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const apiBase = base && /\/api\/?$/i.test(base) ? base : `${base || ""}/api`;
  const token = getTokenGuard();
  return axios.create({
    baseURL: apiBase || "/api",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: false,
  });
}
function extractLaravelError(err) {
  const s = err?.response?.status;
  if (s === 401) return "Authentification requise.";
  const d = err?.response?.data;
  if (d?.errors && typeof d.errors === "object") {
    const lines = [];
    for (const [field, arr] of Object.entries(d.errors)) {
      (arr || []).forEach((msg) => lines.push(`${field}: ${msg}`));
    }
    if (lines.length) return lines.join("\n");
  }
  return d?.message || err.message || "Erreur inconnue";
}

/* =========================================================
   Helpers pagination + dédoublonnage
   ========================================================= */
function parsePagination(payload, fallbackPage = 1, perPageDefault = 10) {
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const per_page = payload?.per_page ?? payload?.meta?.per_page ?? perPageDefault;
  const current_page = payload?.current_page ?? payload?.meta?.current_page ?? fallbackPage;
  const last_page =
    payload?.last_page ?? payload?.meta?.last_page ?? (items.length < per_page ? current_page : current_page + 1);
  const total = payload?.total ?? payload?.meta?.total ?? undefined;
  return { items, per_page, current_page, last_page, total };
}
function dedupeById(arr) {
  const seen = new Set();
  return (arr || []).filter((x) => {
    const id = x?.id != null ? String(x.id) : null;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/* =========================================================
   API (tags + pivot articlestags)
   ========================================================= */
function buildTagApi(axiosApi) {
  return {
    search: (q = "", { page = 1, per_page = 10 } = {}) =>
      axiosApi.get("/tags/tagsadvance", { params: { q, page, per_page } }).then((r) => r.data),
    create: (payload) => axiosApi.post("/tags", payload).then((r) => r.data),
    update: (id, payload) => axiosApi.put(`/tags/${id}`, payload).then((r) => r.data),
    destroy: (id) => axiosApi.delete(`/tags/${id}`).then((r) => r.data),

    listForArticle: (articleId) => axiosApi.get(`/articlestags/${articleId}/tags`).then((r) => r.data),
    attach: (articleId, tagId) =>
      axiosApi.post(`/articlestags/${articleId}/tags`, { tag_id: tagId }).then((r) => r.data),
    detach: (articleId, tagId) =>
      axiosApi.delete(`/articlestags/${articleId}/tags/${tagId}`).then((r) => r.data),
    reorder: (articleId, orderIds) =>
      axiosApi.patch(`/articlestags/${articleId}/tags/reorder`, { order: orderIds }).then((r) => r.data),
  };
}

/* =========================================================
   UI — Tag chip
   ========================================================= */
function TagChip({ name, color, className = "", onClick, title }) {
  const base = color || "#6366f1";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title || name}
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] leading-none font-medium border border-gray-200 bg-white shadow-sm hover:shadow transition-all hover:-translate-y-[1px] overflow-auto ${className}`}
      style={{ backdropFilter: "saturate(180%) blur(2px)" }}
    >
      <span className="inline-block w-2.5 h-2.5 rounded-full border border-black/5" style={{ backgroundColor: base }} />
      <span className="text-gray-800 truncate max-w-[220px]">{name}</span>
    </button>
  );
}

/* =========================================================
   Confirm dialog
   ========================================================= */
function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
  busy = false,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative max-w-md w-full bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-3">{title}</h4>
        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-gray-600 bg-gray-50 hover:bg-gray-100 text-sm"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg text-white text-sm ${
              busy ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {busy ? (
              <span className="inline-flex items-center">
                <FaSpinner className="animate-spin mr-2" size={12} />
                Traitement…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ColorPickerPro — sélecteur moderne
   ========================================================= */
function isValidHex(hex) {
  return /^#([A-Fa-f0-9]{6})$/.test(hex || "");
}
function normalizeHex(v) {
  let x = String(v || "").trim();
  if (!x) return "";
  if (x[0] !== "#") x = `#${x}`;
  if (/^#[A-Fa-f0-9]{3}$/.test(x)) {
    const r = x[1], g = x[2], b = x[3];
    x = `#${r}${r}${g}${g}${b}${b}`;
  }
  return x.toLowerCase();
}
function useRecentColors(max = 8) {
  const key = "tagpicker_recent";
  const [recent, setRecent] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) ? arr.filter(isValidHex).slice(0, max) : [];
    } catch { return []; }
  });
  const pushRecent = (hex) => {
    if (!isValidHex(hex)) return;
    setRecent((prev) => {
      const next = [hex, ...prev.filter((c) => c !== hex)].slice(0, max);
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clearRecent = () => {
    setRecent([]);
    try { localStorage.removeItem(key); } catch {}
  };
  return { recent, pushRecent, clearRecent };
}

export function ColorPickerPro({
  value,
  onChange,
  presets = ["#6366f1","#3b82f6","#0ea5e9","#14b8a6","#22c55e","#84cc16","#f59e0b","#ef4444","#ec4899","#a855f7","#64748b","#111827"],
  label = "Couleur",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(normalizeHex(value || "#6366f1"));
  const [copied, setCopied] = useState(false);
  const anchorRef = useRef(null);
  const panelRef = useRef(null);
  const eyeDropperSupported = typeof window !== "undefined" && "EyeDropper" in window;

  useEffect(() => setHex(normalizeHex(value)), [value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!panelRef.current || !anchorRef.current) return;
      if (panelRef.current.contains(e.target) || anchorRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const { recent, pushRecent, clearRecent } = useRecentColors(8);
  const isHexOk = isValidHex(hex);

  const apply = (h) => {
    const n = normalizeHex(h);
    setHex(n);
    if (isValidHex(n)) {
      onChange?.(n);
      pushRecent(n);
    }
  };
  const copyHex = async () => {
    try { await navigator.clipboard.writeText(hex); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
  };
  const openNative = () => {
    const input = document.createElement("input");
    input.type = "color";
    input.value = isHexOk ? hex : "#6366f1";
    input.style.position = "fixed"; input.style.left = "-9999px";
    document.body.appendChild(input);
    input.addEventListener("input", () => { apply(input.value); }, { once: true });
    input.click(); requestAnimationFrame(() => input.remove());
  };
  const pickFromScreen = async () => {
    if (!eyeDropperSupported) return;
    try {
      // @ts-ignore
      const ed = new window.EyeDropper();
      const res = await ed.open();
      if (res?.sRGBHex) apply(res.sRGBHex);
    } catch {}
  };

  const Swatch = ({ c }) => (
    <button
      type="button"
      className="w-7 h-7 rounded-full border shadow-sm hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-1"
      style={{ backgroundColor: c, borderColor: "rgba(0,0,0,0.08)" }}
      aria-label={`Choisir ${c}`}
      onClick={() => apply(c)}
    />
  );

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs text-gray-600">{label}</label>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm hover:bg-gray-50 transition-shadow shadow-sm"
        title="Ouvrir le sélecteur"
      >
        <span className="inline-flex items-center gap-2">
          <span className="w-5 h-5 rounded-md border" style={{ backgroundColor: hex }} />
          <span className="font-mono">{hex}</span>
        </span>
        <FaChevronDown className="text-gray-400" />
      </button>

      {open && (
        <div ref={panelRef} className="relative z-20">
          <div className="absolute mt-2 w-full rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
            <div className="flex items-center gap-2">
              <input
                value={hex}
                onChange={(e) => setHex(normalizeHex(e.target.value))}
                onBlur={(e) => isValidHex(e.target.value) && apply(e.target.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-mono ${
                  isHexOk ? "border-gray-200 focus:ring-blue-500 focus:outline-none" : "border-red-300 focus:ring-red-500 focus:outline-none"
                }`}
                placeholder="#6366f1"
                aria-invalid={!isHexOk}
              />
              <button type="button" onClick={copyHex} className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs hover:bg-gray-100 flex items-center gap-2" title="Copier">
                {copied ? <FaCheck className="text-green-600" /> : <FaCopy className="text-gray-600" />}
                {copied ? "Copié" : "Copier"}
              </button>
              <button type="button" onClick={openNative} className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs hover:bg-gray-100" title="Sélecteur natif">
                Natif
              </button>
              {eyeDropperSupported && (
                <button type="button" onClick={pickFromScreen} className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-xs hover:bg-gray-100 inline-flex items-center gap-2" title="Pipette (expérimental)">
                  <FaEyeDropper className="text-gray-700" /> Pipette
                </button>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-gray-500">Préréglages</span>
              </div>
              <div className="flex flex-wrap gap-2">{presets.map((c) => <Swatch key={c} c={c} />)}</div>
            </div>

            {!!recent.length && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500">Récents</span>
                  <button type="button" onClick={clearRecent} className="text-[11px] text-gray-500 hover:text-gray-700">vider</button>
                </div>
                <div className="flex flex-wrap gap-2">{recent.map((c) => <Swatch key={`rec-${c}`} c={c} />)}</div>
              </div>
            )}

            <div className="mt-3">
              <span className="text-[11px] text-gray-500">Aperçu</span>
              <div className="mt-2 flex items-center gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-[12px]">
                  <span className="w-3.5 h-3.5 rounded-full border" style={{ backgroundColor: hex }} />
                  <span style={{ color: hex }}>Exemple</span>
                </span>
                <div className="w-8 h-8 rounded-full border shadow-inner" style={{ background: `conic-gradient(from 0deg, ${hex}, ${hex})` }} title="Couleur sélectionnée" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Formulaire créer/éditer (intègre ColorPickerPro)
   ========================================================= */
function TagCreateOrEdit({ isEditing, name, setName, color, setColor, onSubmit, saving, onCancelEdit }) {
  const onKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); } };
  return (
    <form onSubmit={onSubmit} className="bg-white/70 rounded-xl border border-white/70 ring-1 ring-black/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-gray-900">{isEditing ? "Modifier le tag" : "Créer un nouveau tag"}</h5>
        {isEditing && <button type="button" className="text-xs text-gray-500 hover:text-gray-700" onClick={onCancelEdit}>Annuler</button>}
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-xs text-gray-600">Nom</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} onKeyDown={onKeyDown} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom du tag (ex: Développement, Finance…)" required />
        </div>

        <ColorPickerPro value={color} onChange={setColor} />

        <div>
          <span className="text-[11px] text-gray-500">Aperçu tag</span>
          <div className="mt-2"><TagChip name={name || "Aperçu du tag"} color={color} /></div>
        </div>
      </div>

      <button type="submit" disabled={saving || !name.trim()} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2.5 rounded-lg text-sm font-medium flex items-center justify-center">
        {saving ? <span className="inline-flex items-center"><FaSpinner className="animate-spin mr-2" size={14}/>{isEditing ? "Mise à jour…" : "Création…"}</span> : <span className="inline-flex items-center"><FaPlus className="mr-2" size={14}/>{isEditing ? "Mettre à jour & attacher" : "Créer & attacher"}</span>}
      </button>
    </form>
  );
}

/* =========================================================
   Composant principal
   ========================================================= */
export default function TagManagerModal({
  open,
  onClose,
  articleId,
  existingTags = [],
  onChange = () => {},
}) {
  const { flashes, push, remove } = useFlash();
  const axiosApi = useMemo(() => makeAxios(), []);
  const api = useMemo(() => buildTagApi(axiosApi), [axiosApi]);

  const [loading, setLoading] = useState(false);
  const [articleTags, setArticleTags] = useState(Array.isArray(existingTags) ? existingTags : []);
  const [orderDirty, setOrderDirty] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [globalView, setGlobalView] = useState(false); // Vue globale remplace la vue principale
  const leftListRef = useRef(null);

  // DROP highlight état
  const [leftDropActive, setLeftDropActive] = useState(false);

  // Recherche paginée
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [resPage, setResPage] = useState(1);
  const [resHasMore, setResHasMore] = useState(true);
  const [resCurrent, setResCurrent] = useState(1);
  const [resLast, setResLast] = useState(1);
  const [resTotal, setResTotal] = useState(undefined);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resRefreshKey, setResRefreshKey] = useState(0);
  const searchSeq = useRef(0);
  const resultsEndRef = useRef(null);
  const rightListScrollRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastBumpRef = useRef(0);

  // create/edit
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);

  // confirm
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", busy: false, onConfirm: null });

  /* lock scroll + focus sur recherche */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tid = setTimeout(() => searchInputRef.current?.focus(), 80);
    return () => { document.body.style.overflow = prev; clearTimeout(tid); };
  }, [open]);

  /* charger tags attachés */
  useEffect(() => {
    if (!open || !articleId) return;
    let mounted = true;
    setLoading(true);
    api.listForArticle(articleId)
      .then((payload) => {
        if (!mounted) return;
        const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
        setArticleTags(dedupeById(items));
        setOrderDirty(false);
      })
      .catch((e) => {
        setArticleTags(Array.isArray(existingTags) ? dedupeById(existingTags) : []);
        push("error", extractLaravelError(e));
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, articleId]);

  /* reset paging on query change */
  useEffect(() => {
    if (!open) return;
    setResPage(1); setResHasMore(true); setResCurrent(1); setResLast(1); setResTotal(undefined); setResults([]);
  }, [q, open]);

  /* fetch search (pagination/infinite) */
  useEffect(() => {
    if (!open) return;
    const seq = ++searchSeq.current;
    const run = async () => {
      if (resPage === 1) setSearching(true); else setLoadingMore(true);
      try {
        const payload = await api.search(q || "", { page: resPage, per_page: 10 });
        if (searchSeq.current !== seq) return;
        const { items, current_page, last_page, total } = parsePagination(payload, resPage, 10);
        setResults((prev) => dedupeById(current_page === 1 ? items : [...prev, ...items]));
        setResHasMore(current_page < last_page);
        setResCurrent(current_page);
        setResLast(last_page);
        setResTotal(total);
        if (current_page === 1) rightListScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      } catch (e) {
        if (searchSeq.current !== seq) return;
        if (resPage === 1) setResults([]);
        setResHasMore(false); setResCurrent(1); setResLast(1);
        push("error", extractLaravelError(e));
      } finally {
        if (resPage === 1) setSearching(false); else setLoadingMore(false);
      }
    };
    const tid = setTimeout(run, 220);
    return () => clearTimeout(tid);
  }, [q, resPage, open, api, push, resRefreshKey]);

  /* infinite scroll (liste de droite) */
  useEffect(() => {
    if (!open) return;
    const rootEl = rightListScrollRef.current;
    const sentinel = resultsEndRef.current;
    if (!rootEl || !sentinel) return;

    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && resHasMore && !loadingMore && !searching) {
        const now = Date.now();
        if (now - lastBumpRef.current > 300) { lastBumpRef.current = now; setResPage((p) => p + 1); }
      }
    }, { root: rootEl, rootMargin: "200px 0px 200px 0px" });
    io.observe(sentinel);

    const onScroll = () => {
      if (!resHasMore || loadingMore || searching) return;
      const nearBottom = rootEl.scrollTop + rootEl.clientHeight >= rootEl.scrollHeight - 80;
      if (nearBottom) {
        const now = Date.now();
        if (now - lastBumpRef.current > 300) { lastBumpRef.current = now; setResPage((p) => p + 1); }
      }
    };
    rootEl.addEventListener("scroll", onScroll);
    return () => { io.disconnect(); rootEl.removeEventListener("scroll", onScroll); };
  }, [open, resHasMore, loadingMore, searching]);

  const alreadyHas = useCallback((tagId) => (articleTags || []).some((t) => String(t.id) === String(tagId)), [articleTags]);
  const resetForm = () => { setEditId(null); setName(""); setColor("#6366f1"); };
  const onSelectForEdit = (t) => { setEditId(t.id); setName(t.name || ""); setColor(t.color || "#6366f1"); };

  const refreshRightResults = useCallback(() => {
    setResPage(1); setResHasMore(true); setResCurrent(1); setResLast(1); setResults([]); setResRefreshKey((k) => k + 1);
  }, []);

  /* attach/detach */
  const doAttach = async (tag) => {
    if (!articleId) return push("error", "Article manquant.");
    if (alreadyHas(tag.id)) { push("success", "Ce tag est déjà attaché."); return; }
    try {
      await api.attach(articleId, tag.id);
      const newList = dedupeById([...articleTags, tag]);
      setArticleTags(newList); onChange(newList);
      setOrderDirty(true);
      push("success", `« ${tag.name} » ajouté.`);
      setTimeout(() => leftListRef.current?.scrollTo({ top: leftListRef.current.scrollHeight, behavior: "smooth" }), 0);
      refreshRightResults();
    } catch (e) { push("error", extractLaravelError(e)); }
  };
  const doDetach = async (tag) => {
    if (!articleId) return push("error", "Article manquant.");
    try {
      await api.detach(articleId, tag.id);
      const newList = dedupeById(articleTags.filter((t) => String(t.id) !== String(tag.id)));
      setArticleTags(newList); onChange(newList);
      setOrderDirty(true);
      push("success", `« ${tag.name} » retiré.`);
      refreshRightResults();
    } catch (e) { push("error", extractLaravelError(e)); }
  };

  /* save order */
  const saveOrder = async () => {
    try {
      const orderIds = articleTags.map((t) => t.id);
      await api.reorder(articleId, orderIds);
      setOrderDirty(false);
      push("success", "Ordre des tags sauvegardé.");
    } catch (err) { push("error", extractLaravelError(err)); }
  };

  /* create/update/destroy */
  const doSave = async (e) => {
    e?.preventDefault?.();
    const label = (name || "").trim();
    if (!label) return;
    setSaving(true);
    try {
      let saved;
      if (editId) {
        saved = await api.update(editId, { name: label, color });
        setArticleTags((prev) => dedupeById(prev.map((t) => (String(t.id) === String(editId) ? saved : t))));
        push("success", "Tag mis à jour."); refreshRightResults();
      } else {
        saved = await api.create({ name: label, color });
        push("success", "Tag créé.");
        if (!alreadyHas(saved.id) && articleId) {
          await api.attach(articleId, saved.id);
          const newList = dedupeById([...articleTags, saved]);
          setArticleTags(newList); onChange(newList);
          setOrderDirty(true);
          push("success", "Tag attaché à l'article.");
          setTimeout(() => leftListRef.current?.scrollTo({ top: leftListRef.current.scrollHeight, behavior: "smooth" }), 0);
        }
        refreshRightResults();
      }
      resetForm();
    } catch (err) {
      push("error", extractLaravelError(err));
    } finally { setSaving(false); }
  };

  const doDestroy = (tag) => {
    setConfirm({
      open: true,
      title: "Confirmer la suppression",
      message: `Supprimer définitivement le tag « ${tag.name} » ?\n(Il sera détaché de tous les articles)`,
      busy: false,
      onConfirm: async () => {
        try {
          setConfirm((c) => ({ ...c, busy: true }));
          await api.destroy(tag.id);
          setArticleTags((prev) => dedupeById(prev.filter((t) => String(t.id) !== String(tag.id))));
          onChange((prev) => (prev || []).filter((t) => String(t.id) !== String(tag.id)));
          setConfirm({ open: false, title: "", message: "", busy: false, onConfirm: null });
          push("success", "Tag supprimé.");
          refreshRightResults();
        } catch (err) {
          setConfirm((c) => ({ ...c, busy: false }));
          push("error", extractLaravelError(err));
        }
      },
    });
  };

  /* DnD reorder (colonne gauche) */
  const onLeftItemDragStart = (idx) => (ev) => {
    if (!reorderMode) return;
    ev.dataTransfer.effectAllowed = "move";
    ev.dataTransfer.setData("text/plain", String(idx));
  };
  const onLeftItemDragOver = (ev) => {
    if (!reorderMode) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  };
  const onLeftItemDrop = (dropIdx) => (ev) => {
    if (!reorderMode) return;
    ev.preventDefault();
    ev.stopPropagation(); // évite de déclencher l'attach du conteneur
    const fromStr = ev.dataTransfer.getData("text/plain");
    const from = Number(fromStr);
    if (Number.isNaN(from) || from === dropIdx) return;
    setArticleTags((prev) => {
      const next = [...prev]; const [moved] = next.splice(from, 1); next.splice(dropIdx, 0, moved);
      return next;
    });
    setOrderDirty(true);
  };

  /* Zone de DROP pour attacher — n'accepte que application/json */
  const onLeftContainerDragEnter = (e) => {
    const types = e.dataTransfer?.types || [];
    if (types.includes("application/json")) setLeftDropActive(true);
  };
  const onLeftContainerDragOver = (e) => {
    const types = e.dataTransfer?.types || [];
    if (types.includes("application/json")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!leftDropActive) setLeftDropActive(true);
    }
  };
  const onLeftContainerDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setLeftDropActive(false); };
  const onLeftContainerDrop = async (e) => {
    e.preventDefault();
    setLeftDropActive(false);
    let payload = null;
    try {
      const json = e.dataTransfer.getData("application/json");
      if (json) payload = JSON.parse(json);
    } catch {}
    if (!payload || payload.id == null) return;
    await doAttach(payload);
  };

  if (!open) return null;

  const attachedCount = articleTags.length;

  return (
    <>
      <FlashStack flashes={flashes} onClose={remove} />

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open:false, title:"", message:"", busy:false, onConfirm:null })}
        busy={confirm.busy}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
      />

      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-slate-900/10 to-slate-900/20 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-xl w-full max-w-6xl border border-white/60 ring-1 ring-black/5 flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-5 border-b border-white/60 bg-gradient-to-r from-white/70 to-white/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center ring-1 ring-black/5"><FaTag className="text-blue-600" size={14}/></div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Gestion des tags</h3>
                <p className="text-xs text-gray-500">Glisse un tag depuis la droite, dépose-le à gauche pour l’attacher.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGlobalView((v)=>!v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border inline-flex items-center gap-2 ${
                  globalView ? "bg-emerald-600 text-white border-emerald-600" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                }`}
                title="Basculer la vue principale"
              >
                <FaColumns /> {globalView ? "Vue globale ON" : "Vue globale"}
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/70 border border-white/70" aria-label="Fermer"><FaTimes size={14}/></button>
            </div>
          </div>

          {/* Zone scrollable (le search est sticky ici) */}
          <div className="flex-1 overflow-y-auto">
            {/* Barre de recherche — identique au début, mais sticky/fixe */}
            <div className=" sticky right-0 top-0 z-[50] bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b border-gray-200">
              <div className="px-5 py-3">
                <div className="relative ">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 "><FaSearch size={14}/></div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={q}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const c = results.find(t => !alreadyHas(t.id)); if (c) doAttach(c); } }}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher des tags… (Entrée = attacher le 1er résultat)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    aria-label="Rechercher des tags"
                  />
                </div>
              </div>
            </div>

            {/* Corps */}
            <div className="p-5">
              {/* ====== VUE PRINCIPALE CLASSIQUE (2 colonnes) ====== */}
              {!globalView && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gauche : attachés + reorder + DROP */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Tags de l'article</h4>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setReorderMode(v => !v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${reorderMode ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"}`}
                          title="Activer/désactiver la réorganisation"
                        >
                          {reorderMode ? "Réorganisation ON" : "Réorganiser"}
                        </button>
                        {orderDirty && (
                          <button onClick={saveOrder} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium" title="Sauvegarder l'ordre">Sauvegarder</button>
                        )}
                      </div>
                    </div>

                    <div className="relative bg-white/70 rounded-xl border border-white/70 ring-1 ring-black/5">
                      {leftDropActive && (
                        <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/40 flex items-center justify-center z-10">
                          <span className="text-blue-700 text-sm font-medium">Déposez ici pour attacher</span>
                        </div>
                      )}

                      <div
                        ref={leftListRef}
                        className={`max-h-[38vh] overflow-y-auto p-3 relative rounded-xl ${leftDropActive ? "ring-2 ring-blue-400 border-blue-300 bg-blue-50/40" : ""}`}
                        style={{ WebkitOverflowScrolling: "touch" }}
                        onDragEnter={onLeftContainerDragEnter}
                        onDragOver={onLeftContainerDragOver}
                        onDragLeave={onLeftContainerDragLeave}
                        onDrop={onLeftContainerDrop}
                      >
                        {loading ? (
                          <div className="flex items-center justify-center py-8 text-gray-500">
                            <FaSpinner className="animate-spin mr-3" size={16}/> Chargement des tags…
                          </div>
                        ) : attachedCount === 0 ? (
                          <div className="text-center py-10 text-gray-500">
                            <FaTag className="mx-auto mb-3 text-gray-300" size={22}/>
                            <p className="text-sm">Aucun tag attaché</p>
                            <p className="text-xs text-gray-400 mt-1">Glissez un tag depuis la droite et déposez-le ici.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {dedupeById(articleTags).map((t, idx) => (
                              <div
                                key={`att-${t.id}`}
                                draggable={reorderMode}
                                onDragStart={onLeftItemDragStart(idx)}
                                onDragOver={onLeftItemDragOver}
                                onDrop={onLeftItemDrop(idx)}
                                className={`group flex items-center justify-between p-2 bg-white rounded-lg border transition-all ${reorderMode ? "border-blue-200 ring-1 ring-blue-100 cursor-grab active:cursor-grabbing" : "border-gray-200 hover:border-gray-300"}`}
                                title={reorderMode ? "Glissez pour réordonner" : "Cliquer pour détacher / modifier"}
                              >
                                <div className="flex items-center gap-2">
                                  {reorderMode && <span className="text-gray-400 mr-1 select-none">⋮⋮</span>}
                                  <TagChip name={t.name} color={t.color} onClick={() => doDetach(t)} title="Cliquer pour détacher"/>
                                </div>
                                <div className={`flex items-center gap-1.5 ${reorderMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
                                  <button onClick={() => doDetach(t)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Détacher"><FaUnlink size={11}/></button>
                                  <button onClick={() => onSelectForEdit(t)} className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Modifier"><FaPen size={11}/></button>
                                  {!reorderMode && (
                                    <>
                                      <button onClick={() => setArticleTags(p => { if (idx===0) return p; const n=[...p]; [n[idx-1], n[idx]]=[n[idx], n[idx-1]]; return n; }) || setOrderDirty(true)} disabled={idx===0} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md" title="Monter"><FaArrowUp size={11}/></button>
                                      <button onClick={() => setArticleTags(p => { if (idx===p.length-1) return p; const n=[...p]; [n[idx+1], n[idx]]=[n[idx], n[idx+1]]; return n; }) || setOrderDirty(true)} disabled={idx===articleTags.length-1} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md" title="Descendre"><FaArrowDown size={11}/></button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="px-3 py-2 border-t border-white/80 bg-white/60 text-[11px] text-gray-600 flex items-center justify-between">
                        <span>💡 Glissez un tag de droite vers cette zone pour l’attacher.</span>
                        <span className="text-gray-400">{attachedCount} attaché(s)</span>
                      </div>
                    </div>
                  </div>

                  {/* Droite : résultats + création */}
                  <div className="space-y-3">
                    <div className="bg-white/70 rounded-xl border border-white/70 ring-1 ring-black/5">
                      <div ref={rightListScrollRef} className="max-h-[28vh] overflow-y-auto p-3 relative" style={{ WebkitOverflowScrolling: "touch" }}>
                        {searching && results.length === 0 ? (
                          <div className="flex items-center justify-center py-8 text-gray-500"><FaSpinner className="animate-spin mr-3" size={16}/>Recherche en cours…</div>
                        ) : results.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <FaSearch className="mx-auto mb-3 text-gray-300" size={18}/>
                            <p className="text-sm">Aucun résultat trouvé</p>
                            <p className="text-xs text-gray-400 mt-1">Créez un nouveau tag ci-dessous</p>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-1.5">
                              {dedupeById(results).map(t => {
                                const attached = alreadyHas(t.id);
                                return (
                                  <div
                                    key={`res-${t.id}`}
                                    draggable
                                    onDragStart={(e) => {
                                      const json = JSON.stringify(t);
                                      e.dataTransfer.setData("application/json", json);
                                      e.dataTransfer.setData("text/plain", json);
                                      e.dataTransfer.effectAllowed = "copy";
                                    }}
                                    className="group flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm"
                                    title={attached ? "Déjà attaché" : "Glisser vers la colonne de gauche pour attacher"}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <TagChip name={t.name} color={t.color}/>
                                      {attached && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-green-700 bg-green-100 rounded-full"><FaCheck className="mr-1" size={8}/>Attaché</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {!attached ? (
                                        <button className="px-2.5 py-1 text-[11px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center" onClick={() => doAttach(t)} title="+ Ajouter à l'article">
                                          <FaLink className="mr-1" size={10}/> + Ajouter
                                        </button>
                                      ) : (
                                        <button className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-gray-600 rounded-md cursor-not-allowed" aria-disabled="true">Attaché</button>
                                      )}
                                      <button className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => onSelectForEdit(t)} title="Modifier le tag"><FaPen size={11}/></button>
                                      <button className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md" onClick={() => doDestroy(t)} title="Supprimer le tag"><FaTrash size={11}/></button>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={resultsEndRef} className="h-1"/>
                            </div>

                            <div className="sticky bottom-0 left-0 right-0">
                              <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-white/90 to-transparent"/>
                              <div className="pointer-events-auto bg-white/95 backdrop-blur border-t border-gray-200 px-3 py-2 flex items-center justify-between rounded-b-xl">
                                <span className="text-[11px] text-gray-500">Page {resCurrent} / {resLast}{typeof resTotal === "number" ? ` • ${resTotal} au total` : ""}</span>
                                <div className="flex items-center gap-2">
                                  {(loadingMore || (searching && results.length > 0)) && <span className="inline-flex items-center text-[11px] text-gray-500"><FaSpinner className="animate-spin mr-1"/>Chargement…</span>}
                                  {resHasMore && !searching && !loadingMore && (
                                    <button onClick={() => setResPage(p => p + 1)} className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-900">Charger plus</button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <TagCreateOrEdit
                      isEditing={!!editId}
                      name={name} setName={setName}
                      color={color} setColor={setColor}
                      onSubmit={doSave}
                      saving={saving}
                      onCancelEdit={() => { setEditId(null); setName(""); setColor("#6366f1"); }}
                    />
                  </div>
                </div>
              )}

              {/* ====== VUE GLOBALE (REMPLACE LA PRINCIPALE) ====== */}
              {globalView && (
                <div className="rounded-2xl border border-gray-200 bg-white/80 backdrop-blur shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <FaColumns className="text-emerald-600" /> Vue globale — aperçu élargi
                    </div>
                    <div className="text-[12px] text-gray-600">
                      {attachedCount} attaché(s){typeof resTotal === "number" ? ` • ${resTotal} disponibles` : ""}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {/* Panneau gauche (attachés) */}
                    <div
                      className={`relative p-3 md:border-r border-gray-200 ${leftDropActive ? "bg-blue-50/40" : ""}`}
                      onDragEnter={onLeftContainerDragEnter}
                      onDragOver={onLeftContainerDragOver}
                      onDragLeave={onLeftContainerDragLeave}
                      onDrop={onLeftContainerDrop}
                    >
                      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur px-2 py-2 border-b border-gray-200 rounded-t-xl flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">Tags de l’article</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setReorderMode(v => !v)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${reorderMode ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50 text-gray-700 border-gray-200"}`}
                            title="Réorganiser"
                          >
                            {reorderMode ? "Réorg ON" : "Réorganiser"}
                          </button>
                          {orderDirty && (
                            <button onClick={saveOrder} className="text-[11px] px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium" title="Sauvegarder">Sauver</button>
                          )}
                        </div>
                      </div>

                      <div className="h-[50vh] overflow-y-auto pt-2 pr-2">
                        {attachedCount === 0 ? (
                          <div className="text-center py-10 text-gray-500">
                            <FaTag className="mx-auto mb-3 text-gray-300" size={22}/>
                            <p className="text-sm">Aucun tag attaché</p>
                            <p className="text-xs text-gray-400 mt-1">Glissez un tag depuis la droite et déposez-le ici.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dedupeById(articleTags).map((t, idx) => (
                              <div
                                key={`att-wide-${t.id}`}
                                draggable={reorderMode}
                                onDragStart={onLeftItemDragStart(idx)}
                                onDragOver={onLeftItemDragOver}
                                onDrop={onLeftItemDrop(idx)}
                                className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                                title={reorderMode ? "Glissez pour réordonner" : undefined}
                              >
                                <TagChip name={t.name} color={t.color} />
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => doDetach(t)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md" title="Détacher"><FaUnlink size={11}/></button>
                                  <button onClick={() => onSelectForEdit(t)} className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" title="Modifier"><FaPen size={11}/></button>
                                  {!reorderMode && (
                                    <>
                                      <button onClick={() => setArticleTags(p => { if (idx===0) return p; const n=[...p]; [n[idx-1], n[idx]]=[n[idx], n[idx-1]]; return n; }) || setOrderDirty(true)} disabled={idx===0} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md" title="Monter"><FaArrowUp size={11}/></button>
                                      <button onClick={() => setArticleTags(p => { if (idx===p.length-1) return p; const n=[...p]; [n[idx+1], n[idx]]=[n[idx], n[idx+1]]; return n; }) || setOrderDirty(true)} disabled={idx===articleTags.length-1} className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md" title="Descendre"><FaArrowDown size={11}/></button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Panneau droit (résultats étendus) */}
                    <div className="relative p-3">
                      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur px-2 py-2 border-b border-gray-200 rounded-t-xl flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">Tags disponibles</span>
                        <div className="text-[11px] text-gray-500">Page {resCurrent} / {resLast}</div>
                      </div>

                      <div className="h-[50vh] overflow-y-auto pt-2 pr-2">
                        {results.length === 0 && !searching ? (
                          <div className="text-center py-10 text-gray-500">
                            <FaSearch className="mx-auto mb-3 text-gray-300" size={18}/>
                            <p className="text-sm">Aucun résultat</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {dedupeById(results).map((t) => {
                              const attached = alreadyHas(t.id);
                              return (
                                <div
                                  key={`wide-${t.id}`}
                                  draggable
                                  onDragStart={(e) => {
                                    const json = JSON.stringify(t);
                                    e.dataTransfer.setData("application/json", json);
                                    e.dataTransfer.setData("text/plain", json);
                                    e.dataTransfer.effectAllowed = "copy";
                                  }}
                                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
                                  title={attached ? "Déjà attaché" : "Glisser vers la colonne de gauche pour attacher"}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <TagChip name={t.name} color={t.color}/>
                                    {attached && <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-green-700 bg-green-100 rounded-full"><FaCheck className="mr-1" size={8}/>Attaché</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {!attached ? (
                                      <button className="px-2.5 py-1 text-[11px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center overflow-auto w-[88px]" onClick={() => doAttach(t)} title="+ Ajouter">
                                        <FaLink className="mr-1" size={10}/> + Ajouter
                                      </button>
                                    ) : (
                                      <button className="px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-gray-600 rounded-md cursor-not-allowed" aria-disabled="true">Attaché</button>
                                    )}
                                    <button className="w-6 h-6 flex items-center justify-center text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => onSelectForEdit(t)} title="Modifier"><FaPen size={11}/></button>
                                    <button className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md" onClick={() => doDestroy(t)} title="Supprimer"><FaTrash size={11}/></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-3">
                          {(loadingMore || (searching && results.length > 0)) && <span className="inline-flex items-center text-[12px] text-gray-500"><FaSpinner className="animate-spin mr-1"/>Chargement…</span>}
                          {resHasMore && !searching && !loadingMore && (
                            <button onClick={() => setResPage(p => p + 1)} className="ml-auto text-xs px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-900">Charger plus</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/60 bg-gradient-to-r from-white/70 to-white/40 flex items-center justify-between text-[12px] text-gray-600">
            <div><span className="font-medium text-gray-800">{attachedCount}</span> tag(s) attaché(s){typeof resTotal === "number" && <> • <span className="font-medium text-gray-800">{resTotal}</span> tag(s) disponibles</>}</div>
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium border border-gray-200">Fermer</button>
          </div>
        </div>
      </div>
    </>
  );
}
