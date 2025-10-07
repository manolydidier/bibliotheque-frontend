// src/media-library/Comments.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  FaUser, FaSpinner, FaTrash, FaThumbsUp, FaThumbsDown,
  FaCheck, FaTimes, FaBan, FaStar, FaEnvelope, FaSmile, FaEyeSlash,
  FaEdit, FaSave, FaUndo, FaShieldAlt, FaEllipsisH
} from "react-icons/fa";
import { BsArrowDown, BsArrowUp, BsStar } from "react-icons/bs";

/* -------------------------------------------------------------------------- */
/* ANIM HELPERS                                                               */
/* -------------------------------------------------------------------------- */
function useMountFade() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

// Transition de hauteur pour ouvrir/fermer un bloc à hauteur variable (réponses)
function HeightTransition({ open, children, duration = 250, easing = 'ease' }) {
  const innerRef = React.useRef(null);
  const [height, setHeight] = React.useState(open ? 'auto' : 0);

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    if (open) {
      const full = el.scrollHeight;
      setHeight(full);
      const t = setTimeout(() => setHeight('auto'), duration);
      return () => clearTimeout(t);
    } else {
      const full = el.scrollHeight;
      requestAnimationFrame(() => {
        setHeight(full);
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open, children, duration]);

  return (
    <div style={{ height, transition: `height ${duration}ms ${easing}`, overflow: 'hidden' }} aria-hidden={!open}>
      <div ref={innerRef}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AVATAR HELPERS                                                             */
/* -------------------------------------------------------------------------- */
const PLACEHOLDER_AVATAR = "https://randomuser.me/api/portraits/lego/2.jpg";
const cleanBaseStorage = () => (import.meta.env.VITE_API_BASE_STORAGE || "").replace(/\/+$/,"");
function buildAvatarSrc(avatar_url, updated_at) {
  const base = cleanBaseStorage();
  const raw = (avatar_url || "").toString().trim();
  if (!raw) return PLACEHOLDER_AVATAR;
  const abs = /^https?:\/\//i.test(raw) ? raw : `${base}/storage/${raw.replace(/^\/+/, "")}`;
  const cb = `cb=${Date.now()}`;
  const t = updated_at ? `t=${encodeURIComponent(updated_at)}` : "";
  return `${abs}${abs.includes("?") ? "&" : "?"}${t ? `${t}&` : ""}${cb}`;
}

/* -------------------------------------------------------------------------- */
/* axios helpers                                                              */
/* -------------------------------------------------------------------------- */
function makeAxios(token) {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");
  const apiBase = `${base.replace(/\/api\/?$/,'')}/api`;
  return axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
function buildCommentApi(axiosi) {
  return {
    show: (articleId, params = {}) => axiosi.get(`/comments/${articleId}`, { params }).then(r => r.data),
    replies: (commentId, params = {}) => axiosi.get(`/comments/${commentId}/replies`, { params }).then(r => r.data),
    index: (params = {}) => axiosi.get("/comments", { params }).then(r => r.data),
    store: (payload) => axiosi.post("/comments", payload).then(r => r.data),
    update: (id, payload) => axiosi.patch(`/comments/${id}`, payload).then(r => r.data),
    destroy: (id) => axiosi.delete(`/comments/${id}`).then(r => r.data),
    restore: (id) => axiosi.post(`/comments/${id}/restore`).then(r => r.data),
    reply: (id, payload) => axiosi.post(`/comments/${id}/reply`, payload).then(r => r.data),
    like: (id, action) => axiosi.post(`/comments/${id}/like`, { action }).then(r => r.data),
    dislike: (id, action) => axiosi.post(`/comments/${id}/dislike`, { action }).then(r => r.data),
    approve: (id, notes = null) => axiosi.post(`/comments/${id}/approve`, notes ? { notes } : {}).then(r => r.data),
    reject: (id, notes) => axiosi.post(`/comments/${id}/reject`, { notes }).then(r => r.data),
    spam: (id, notes = null) => axiosi.post(`/comments/${id}/spam`, notes ? { notes } : {}).then(r => r.data),
    feature: (id, featured) => axiosi.post(`/comments/${id}/feature`, { featured }).then(r => r.data),
  };
}
function extractLaravelError(err) {
  const status = err?.response?.status;
  if (status === 401) return "Authentification requise.";
  const d = err?.response?.data;
  if (d?.errors && typeof d.errors === 'object') {
    const lines = [];
    for (const [field, arr] of Object.entries(d.errors)) {
      (arr || []).forEach(msg => lines.push(`${field}: ${msg}`));
    }
    if (lines.length) return lines.join('\n');
  }
  return d?.message || err.message || 'Erreur inconnue';
}

/* -------------------------------------------------------------------------- */
/* Emoji picker (no deps)                                                     */
/* -------------------------------------------------------------------------- */
function EmojiPopover({ onSelect, onClose, title = "Emojis" }) {
  const EMOJIS = [
    "😀","😁","😂","🤣","😊","😍","😘","😎","🙂","🙃","🤩","😇","🤔","🤨","😅","😭","😡",
    "👍","👎","🙏","👏","💯","🔥","✨","🎉","✅","❌","⚠️","💡","📌","📣","⏳","📅","📝","🔗","❤️","🚀",
    "📚","📖","🗂️","🗃️","🗄️","🗒️","📑","📄","🧾","📎","🖇️","🏷️",
    "🖊️","🖋️","🖨️","🧮","📊","📈","📉","⏰","📍","🔒",
    "💼","📬","📨","🔍","🤝","🏛️","⚖️","🧠","🧩","🧪","🧬",
    "🔧","🔨","🛠️","💻","🖥️","🗑️","📡","🌐","💾","📀","🎯","📷","🎥","🎬","🎨",
    "🎵","🎶","🎼","🎤","🎧","📱","📲","🔔","🛎️","💰","💳","🛒","🏆","🥇","🥈","🥉"
  ];
  return (
    <div
      className="absolute bottom-full mb-2 right-0 w-72 max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-[9999]"
      role="dialog"
      aria-label="Sélecteur d’emojis"
      onClick={(e)=>e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-medium text-gray-600">{title}</span>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 rounded" aria-label="Fermer" title="Fermer">
          <FaTimes />
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1 text-xl">
        {EMOJIS.map(e => (
          <button key={e} type="button" className="hover:bg-gray-100 rounded p-1" onClick={() => onSelect(e)} aria-label={`emoji ${e}`} title={e}>
            {e}
          </button>
        ))}
      </div>
      <div className="text-[11px] text-gray-400 mt-2 text-right">Échap pour fermer</div>
    </div>
  );
}

/* Insère du texte au niveau du curseur d'un <textarea> */
function insertAtCursor(textareaEl, currentValue, toInsert, setValue) {
  if (!textareaEl) { setValue((currentValue || "") + toInsert); return; }
  const start = textareaEl.selectionStart ?? (currentValue?.length || 0);
  const end = textareaEl.selectionEnd ?? (currentValue?.length || 0);
  const next = (currentValue || "").slice(0, start) + toInsert + (currentValue || "").slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    textareaEl.focus();
    const pos = start + toInsert.length;
    textareaEl.setSelectionRange(pos, pos);
  });
}

/* -------- Helpers pagination -------- */
function parsePagination(payload, fallbackPage = 1, perPageDefault = 20) {
  const items = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  const per_page = payload?.per_page ?? payload?.meta?.per_page ?? perPageDefault;
  const current_page = payload?.current_page ?? payload?.meta?.current_page ?? fallbackPage;
  const last_page = payload?.last_page ?? payload?.meta?.last_page
    ?? (items.length < per_page ? current_page : current_page + 1);
  return { items, per_page, current_page, last_page };
}

/* ------------------ Approve Modal ------------------ */
function ApproveModal({ open, onClose, onConfirm, comment }) {
  const [notes, setNotes] = useState("");
  useEffect(() => { if (open) setNotes(""); }, [open]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Approuver le commentaire</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><FaTimes /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600">
            <div className="font-medium text-gray-800">{comment?.author}</div>
            {comment?.email && (
              <div className="flex items-center text-gray-500 mt-1">
                <FaEnvelope className="mr-2" /> {comment.email}
              </div>
            )}
            <p className="mt-3 whitespace-pre-line text-gray-700 border rounded-lg p-3 bg-gray-50">
              {comment?.content}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (facultatif)</label>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="3"
              placeholder="Message de modération…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-100 hover:bg-gray-200">Annuler</button>
          <button onClick={() => onConfirm(notes)} className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700">Approuver</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ /user (Laravel) ------------------ */
function useMeFromLaravel() {
  const [me, setMe] = useState({ user: null, roles: [], permissions: [] });
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    try {
      return (
        localStorage.getItem("auth_token") ||
        localStorage.getItem("tokenGuard") ||
        null
      );
    } catch { return null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) { setMe({ user: null, roles: [], permissions: [] }); return; }
      try {
        setLoading(true);
        const api = makeAxios(token);
        const { data } = await api.get('/user');
        const user = data?.user || data || null;
        const roles = data?.roles || user?.roles || [];
        const permissions = data?.permissions || user?.permissions || [];
        if (!cancelled) setMe({ user, roles, permissions });
      } catch {
        if (!cancelled) setMe({ user: null, roles: [], permissions: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return { me, loading, token };
}

/* --------- DROITS + RÔLES (robuste) --------- */
function computeRights(permissions = [], roles = [], user = {}) {
  const merge = (arr) => (Array.isArray(arr) ? arr : []);
  const allPerms = [...merge(permissions), ...merge(user?.permissions)];
  const allRoles = [...merge(roles), ...merge(user?.roles)];

  const hasModWord = (s) => /(moderateur|modérateur|moderator|moderate|approver|approve|manage|manager|gerer|gérer)/i.test(String(s||""));
  const hasAdminWord = (s) => /(admin(istrateur)?|owner|super)/i.test(String(s||""));

  const isModerator =
    allPerms.some(p => String(p?.resource||"").toLowerCase()==="comments" && (hasModWord(p?.name) || hasAdminWord(p?.name))) ||
    allRoles.some(r => hasModWord(r?.name || r) || hasAdminWord(r?.name || r));

  const isAdmin =
    allRoles.some(r => hasAdminWord(r?.name || r)) ||
    allPerms.some(p => hasAdminWord(p?.name));

  const canDeleteAny =
    isAdmin || isModerator ||
    allPerms.some(p => String(p?.resource||"").toLowerCase()==="comments" && /(supprimer|delete|remove)/i.test(String(p?.name||"")));

  return { isModerator, isAdmin, canDeleteAny };
}

/* --------- BADGES --------- */
function RoleBadge({ variant }) {
  if (!variant) return null;
  const isAdmin = variant === "admin";
  const cls = isAdmin ? "text-yellow-700 italic" : "text-blue-700";
  const label = isAdmin ? "Admin" : "Modérateur";
  return (
    <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] ${cls}`}>
      <FaShieldAlt className={isAdmin ? "text-yellow-500" : "text-blue-600"} />
      {label}
    </span>
  );
}
const Chip = ({ className="", children }) => (
  <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${className}`}>{children}</span>
);

/* --------- TOOLBAR --------- */
function Toolbar({ sortRoot, setSortRoot, featuredFirstRoot, setFeaturedFirstRoot, resetLists }) {
  return (
    <div className="mb-3 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => { setSortRoot(prev => (prev === "newest" ? "oldest" : "newest")); resetLists?.(); }}
        title={sortRoot === "newest" ? "Plus récent → moins récent" : "Plus ancien → plus récent"}
        aria-label="Basculer l’ordre de tri"
        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
      >
        {sortRoot === "newest"
          ? <BsArrowDown className="w-3 h-3 text-gray-700" />
          : <BsArrowUp className="w-3 h-3 text-gray-700" />
        }
      </button>

      <label
        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition cursor-pointer"
        title="Mettre les commentaires en avant en priorité"
        aria-label="Mis en avant d’abord"
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={featuredFirstRoot}
          onChange={(e) => { setFeaturedFirstRoot(e.target.checked); resetLists?.(); }}
        />
        <BsStar className={`w-3 h-3 ${featuredFirstRoot ? "text-amber-500" : "text-gray-500"}`} />
      </label>
    </div>
  );
}

/* --------- ÉDITEUR inline réutilisable --------- */
function EditableArea({ value, onChange, onSave, onCancel, saving=false, placeholder="Modifier…" }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="mt-2">
      <textarea
        ref={ref}
        className="w-full border border-blue-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={3}
        value={value}
        onChange={(e)=>onChange(e.target.value)}
        placeholder={placeholder}
        disabled={saving}
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={onSave}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
          disabled={saving || !value.trim()}
        >
          <FaSave className="inline mr-2" /> Enregistrer
        </button>
        <button
          onClick={onCancel}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs"
        >
          <FaUndo className="inline mr-2" /> Annuler
        </button>
      </div>
    </div>
  );
}

/* --------- MENU D’ACTIONS COMPACT (portal + z-index très élevé) --------- */
function ActionsMenu({ children }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const mw = menuRef.current?.offsetWidth || 176;
    const mh = menuRef.current?.offsetHeight || 0;

    let left = r.right - mw;
    let top  = r.bottom + 6;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left < 8) left = 8;
    if (left + mw > vw - 8) left = vw - mw - 8;
    if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 6);

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const inBtn  = btnRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (!inBtn && !inMenu) setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
        title="Actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FaEllipsisH className="text-gray-700" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="w-44 bg-white border border-gray-200 rounded-xl shadow-xl p-1"
          style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 100000 }}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  );
}
const MenuItem = ({ onClick, icon:Icon, children, danger, title }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-gray-50 ${danger ? "text-red-600 hover:text-red-700" : "text-gray-700"}`}
    role="menuitem"
  >
    {Icon && <Icon className={danger ? "opacity-90" : "text-gray-500"} />}
    <span>{children}</span>
  </button>
);

/* ------------------ Main component ------------------ */
export default function Comments({
  articleId,
  initialComments = [],
  perPage = 20,
  infinite = false,
  isLoading: extLoading = false,
  error: extError = null,
}) {
  /* ========= Utilisateur + permissions ========= */
  const { me, loading: meLoading, token } = useMeFromLaravel();
  const currentUser = me.user;
  const { isModerator, isAdmin, canDeleteAny } = useMemo(
    () => computeRights(me.permissions, me.roles, me.user),
    [me]
  );

  /* ========= API Comments ========= */
  const axiosi = useMemo(() => makeAxios(token), [token]);
  const api = useMemo(() => buildCommentApi(axiosi), [axiosi]);

  /* ========= État local ========= */
  const seed = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showEmojiComment, setShowEmojiComment] = useState(false);
  const commentRef = useRef(null);
  const emojiCommentWrapRef = useRef(null);

  const [comments, setComments] = useState(() =>
    (initialComments || []).map((c, i) => normalizeComment(c, seed, i))
  );

  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showEmojiReply, setShowEmojiReply] = useState(false);
  const replyRef = useRef(null);
  const emojiReplyWrapRef = useRef(null);

  // ---- ÉDITION factorisée ----
  const [editingId, setEditingId] = useState(null); // id du node (comment ou reply)
  const [editText, setEditText] = useState("");
  const [editBusy, setEditBusy] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(extLoading);
  const [localError, setLocalError] = useState(extError);

  // réponses: id -> { items, page, last_page, per_page, open, loading, error }
  const [repliesMap, setRepliesMap] = useState({});

  const sentinelRef = useRef(null);
  const canLoad = !!articleId && !loading && hasMore;

  // ---- TRI ----
  const [sortRoot, setSortRoot] = useState("newest");          // newest | oldest
  const [featuredFirstRoot, setFeaturedFirstRoot] = useState(true);
  const sortReplies = sortRoot;

  /* ========= Utils ========= */
  function normalizeComment(c, seed, i = 0) {
    const u = c?.user || {};
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    const displayName = u.username || fullName || c?.guest_name || "Anonyme";
    const email = u.email || c?.guest_email || "";
    const created = c?.created_at ? new Date(c.created_at) : null;

    const avatarRaw = u?.avatar_url_full || u?.avatar_url || c?.avatar_url || null;
    const avatar = buildAvatarSrc(avatarRaw, u?.updated_at || c?.updated_at || null);

    return {
      id: c?.id ?? (i + 1),
      author: displayName,
      author_id: u?.id ?? c?.user_id ?? c?._user_id ?? null,
      email,
      avatar,
      date: created ? created.toLocaleDateString() : "—",
      created_ts: created ? created.getTime() : 0,
      content: c?.content || c?.body || "",
      status: (c?.status || "approved").toLowerCase(),
      featured: !!(c?.is_featured ?? c?.featured ?? c?.pinned ?? c?._pinned),
      like_count: c?.like_count ?? 0,
      dislike_count: c?.dislike_count ?? 0,
      reply_count: c?.reply_count ?? 0,
      _liked: !!c?._liked,
      _disliked: !!c?._disliked,
      _raw: c,
    };
  }

  const isSelf = useCallback((node) => {
    const uid = currentUser?.id;
    const ownerId = node?.author_id ?? node?._raw?.user?.id ?? node?._raw?.user_id ?? null;
    if (!uid || !ownerId) return false;
    return String(uid) === String(ownerId);
  }, [currentUser?.id]);

  const isVisible = useCallback((node) => {
    if (isModerator || isAdmin) return true;
    if (node?.status === "approved") return true;
    if (isSelf(node)) return true;
    return false;
  }, [isModerator, isAdmin, isSelf]);

  const visibleComments = useMemo(() => comments.filter(isVisible), [comments, isVisible]);

  const canSeeDeleteFor = useCallback((node) => {
    return isAdmin || isModerator || canDeleteAny || isSelf(node);
  }, [isAdmin, isModerator, canDeleteAny, isSelf]);

  const canEdit = useCallback((node) => {
    if (!token) return false;
    if (!isSelf(node)) return false;
    const status = (node?.status || "").toLowerCase();
    if (status === "approved" || status === "rejected" || status === "spam") return false;
    const replies = Number(node?.reply_count || 0);
    if (replies > 0) return false;
    return true;
  }, [token, isSelf]);

  /* ---- Helpers de MAJ pour commentaires & réponses ---- */
  const findNodeById = useCallback((id) => {
    const inComments = comments.find(c => c.id === id);
    if (inComments) return inComments;
    for (const k in repliesMap) {
      const arr = repliesMap[k]?.items || [];
      const found = arr.find(x => x.id === id);
      if (found) return found;
    }
    return null;
  }, [comments, repliesMap]);

  const updateNodeById = useCallback((id, updater) => {
    // update in root comments
    setComments(prev => prev.map(c => (c.id === id ? updater(c) : c)));
    // update in replies
    setRepliesMap(prev => {
      let changed = false;
      const next = { ...prev };
      for (const pid in next) {
        const r = next[pid];
        const items = r.items || [];
        let any = false;
        const newItems = items.map(it => {
          if (it.id === id) { any = true; return updater(it); }
          return it;
        });
        if (any) {
          next[pid] = { ...r, items: newItems };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  /* ========= Chargement liste ========= */
  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    setLocalError(null);

    api.show(articleId, {
      parent_id: "null",
      per_page: perPage,
      page,
      sort: sortRoot,
      featured_first: featuredFirstRoot
    })
      .then(payload => {
        const { items, current_page, last_page } = parsePagination(payload, page, perPage);
        const mapped = items.map((c, i) => normalizeComment(c, seed, (page - 1) * perPage + i));
        setComments(prev => page === 1 ? mapped : [...prev, ...mapped]);
        setHasMore(current_page < last_page);
      })
      .catch(err => {
        console.error("Erreur chargement commentaires:", err);
        setLocalError(extractLaravelError(err));
      })
      .finally(() => setLoading(false));
  }, [articleId, page, api, seed, perPage, sortRoot, featuredFirstRoot]);

  /* ========= Infinite scroll ========= */
  useEffect(() => {
    if (!infinite) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && canLoad) setPage(p => p + 1);
    }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [infinite, canLoad]);

  /* ========= Gestion fermetures popovers emoji ========= */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowEmojiComment(false);
        setShowEmojiReply(false);
      }
    };
    const onDown = (e) => {
      if (!emojiCommentWrapRef.current?.contains(e.target)) setShowEmojiComment(false);
      if (!emojiReplyWrapRef.current?.contains(e.target)) setShowEmojiReply(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, []);

  /* ========= Actions ========= */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!token) { setLocalError("Authentification requise."); return; }
    const val = comment.trim();
    if (!val) return;

    setSubmitting(true);
    setLocalError(null);
    try {
      const payload = { article_id: articleId, content: val };
      const created = await api.store(payload);
      const mapped = normalizeComment(created, seed, comments.length);
      setComments(prev => sortRoot === "newest" ? [mapped, ...prev] : [...prev, mapped]);
      setComment("");
    } catch (err) {
      console.error("Erreur envoi:", err);
      setLocalError(extractLaravelError(err));
    } finally {
      setSubmitting(false);
    }
  }, [comment, articleId, api, comments.length, seed, token, sortRoot]);

  const handleDeleteComment = useCallback(async (id, parentId = null) => {
    try {
      await api.destroy(id);
      if (parentId) {
        setRepliesMap(prev => {
          const r = prev[parentId];
          if (!r) return prev;
          const newItems = (r.items || []).filter(x => x.id !== id);
          return { ...prev, [parentId]: { ...r, items: newItems } };
        });
        setComments(prev => prev.map(c => c.id === parentId
          ? { ...c, reply_count: Math.max(0, (c.reply_count || 1) - 1) }
          : c
        ));
      } else {
        setComments(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Erreur suppression:", err);
      setLocalError(extractLaravelError(err));
    }
  }, [api]);

  const handleReply = useCallback(async (parentId, content) => {
    if (!token) { setLocalError("Authentification requise."); return; }
    const text = (content || "").trim();
    if (!text) return;

    try {
      const created = await api.reply(parentId, { content: text });
      const mapped = normalizeComment(created, seed, 0);
      setRepliesMap(prev => {
        const r = prev[parentId] || { items: [], page: 1, last_page: 1, per_page: 3, open: true, loading: false, error: null };
        const nextItems = sortReplies === "newest" ? [mapped, ...(r.items || [])] : [ ...(r.items || []), mapped ];
        return { ...prev, [parentId]: { ...r, open: true, items: nextItems } };
      });
      setComments(prev => prev.map(c => c.id === parentId ? { ...c, reply_count: (c.reply_count || 0) + 1 } : c));
    } catch (err) {
      console.error("Erreur réponse:", err);
      setLocalError(extractLaravelError(err));
    }
  }, [api, seed, token, sortReplies]);

  // --- helpers like/dislike (optimistes, pour commentaires ET réponses)
  const softToggleLike = useCallback((node) => {
    const nowLiked = !node._liked;
    const likeDelta = nowLiked ? 1 : -1;
    const undoDislike = node._disliked ? 1 : 0;
    return {
      ...node,
      _liked: nowLiked,
      _disliked: false,
      like_count: Math.max(0, node.like_count + likeDelta),
      dislike_count: Math.max(0, node.dislike_count - undoDislike),
    };
  }, []);
  const softToggleDislike = useCallback((node) => {
    const now = !node._disliked;
    const dDelta = now ? 1 : -1;
    const undoLike = node._liked ? 1 : 0;
    return {
      ...node,
      _disliked: now,
      _liked: false,
      dislike_count: Math.max(0, node.dislike_count + dDelta),
      like_count: Math.max(0, node.like_count - undoLike),
    };
  }, []);

  const handleLike = useCallback(async (id) => {
    try {
      const before = findNodeById(id);
      const prevLiked = !!before?._liked;
      updateNodeById(id, softToggleLike);
      await api.like(id, prevLiked ? "unlike" : "like");
    } catch (err) {
      console.error("Erreur like:", err);
      setLocalError(extractLaravelError(err));
    }
  }, [api, findNodeById, updateNodeById, softToggleLike]);

  const handleDislike = useCallback(async (id) => {
    try {
      const before = findNodeById(id);
      const prevDisliked = !!before?._disliked;
      updateNodeById(id, softToggleDislike);
      await api.dislike(id, prevDisliked ? "undislike" : "dislike");
    } catch (err) {
      console.error("Erreur dislike:", err);
      setLocalError(extractLaravelError(err));
    }
  }, [api, findNodeById, updateNodeById, softToggleDislike]);

  // --- Approve modal state ---
  const [approveFor, setApproveFor] = useState(null);
  const openApproveModal = (c) => setApproveFor({ id: c.id, author: c.author, email: c.email, content: c.content });
  const closeApproveModal = () => setApproveFor(null);
  const applyServerUpdate = useCallback((updated) => {
    const norm = normalizeComment(updated, seed);
    setComments(prev => prev.map(c => (c.id === norm.id ? norm : c)));
    setRepliesMap(prev => {
      let changed = false;
      const next = { ...prev };
      for (const pid in next) {
        const r = next[pid];
        const items = r.items || [];
        let any = false;
        const newItems = items.map(it => (it.id === norm.id ? norm : it));
        if (items.length !== newItems.length || newItems.some((it, i) => it !== items[i])) {
          any = true;
        }
        if (any) {
          next[pid] = { ...r, items: newItems };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [seed]);

  const confirmApprove = async (notes) => {
    if (!approveFor) return;
    try {
      const updated = await api.approve(approveFor.id, notes || null);
      applyServerUpdate(updated);
      closeApproveModal();
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  };

  const handleReject = useCallback(async (id, notes = "Non conforme") => {
    try {
      const updated = await api.reject(id, notes);
      applyServerUpdate(updated);
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  }, [api, applyServerUpdate]);

  const handleSpam = useCallback(async (id, notes = null) => {
    try {
      const updated = await api.spam(id, notes);
      applyServerUpdate(updated);
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  }, [api, applyServerUpdate]);

  const handleFeature = useCallback(async (id, featured = true) => {
    try {
      const updated = await api.feature(id, featured);
      applyServerUpdate(updated);
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  }, [api, applyServerUpdate]);

  /* ========= Réponses ========= */
  const fetchReplies = useCallback(async (parentId, nextPage = 1, per = 3) => {
    setRepliesMap(prev => {
      const r = prev[parentId] || { items: [], page: 0, last_page: 1, per_page: per, open: true, loading: false, error: null };
      return { ...prev, [parentId]: { ...r, per_page: per, loading: true, error: null } };
    });

    try {
      const payload = await api.replies(parentId, {
        per_page: per,
        page: nextPage,
        sort: sortReplies,
        featured_first: false
      });
      const { items, current_page, last_page } = parsePagination(payload, nextPage, per);
      const mapped = items.map((c, i) => normalizeComment(c, seed, i));

      setRepliesMap(prev => {
        const r = prev[parentId] || {};
        const prevItems = r.items || [];
        const merged = nextPage === 1 ? mapped : [...prevItems, ...mapped];
        return {
          ...prev,
          [parentId]: {
            ...r,
            items: merged,
            page: current_page,
            last_page,
            per_page: per,
            loading: false,
            error: null,
            open: true,
          }
        };
      });
    } catch (err) {
      setRepliesMap(prev => {
        const r = prev[parentId] || {};
        return { ...prev, [parentId]: { ...r, loading: false, error: extractLaravelError(err) } };
      });
    }
  }, [api, seed, sortReplies]);

  const openReplies = useCallback((parentId) => {
    setRepliesMap(prev => {
      const r = prev[parentId] || { items: [], page: 0, last_page: 1, per_page: 3, open: false, loading: false, error: null };
      return { ...prev, [parentId]: { ...r, open: true } };
    });
    setTimeout(() => {
      setRepliesMap(prev => {
        const r = prev[parentId];
        if (r && r.page === 0 && !r.loading) fetchReplies(parentId, 1, r.per_page || 3);
        return prev;
      });
    }, 0);
  }, [fetchReplies]);

  const closeReplies = useCallback((parentId) => {
    setRepliesMap(prev => {
      const r = prev[parentId];
      if (!r) return prev;
      return { ...prev, [parentId]: { ...r, open: false } };
    });
  }, []);

  /* ---------------- RENDER ---------------- */
  const meBanner = currentUser && (
    <div className="mb-2 flex items-center gap-3 text-sm text-gray-700 px-3 py-2 rounded-xl bg-gray-50">
      {currentUser?.username || `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() || "Vous"}
      {(isAdmin || isModerator) && <RoleBadge variant={isAdmin ? "admin" : "moderator"} />}
    </div>
  );

  const resetLists = () => { setPage(1); setRepliesMap({}); };
  const mounted = useMountFade();

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Commentaires</h2>

      <div className="flex flex-row gap-3 mb-3 justify-between items-center">
        {meLoading ? (
          <div className="flex items-center text-sm text-gray-600">
            <FaSpinner className="animate-spin mr-2" /> Chargement de votre profil…
          </div>
        ) : meBanner}
        <Toolbar
          sortRoot={sortRoot}
          setSortRoot={setSortRoot}
          featuredFirstRoot={featuredFirstRoot}
          setFeaturedFirstRoot={setFeaturedFirstRoot}
          resetLists={resetLists}
        />
      </div>

      {localError && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm whitespace-pre-line border border-red-200">{localError}</div>
      )}

      <div
        className={`bg-white p-4 rounded-2xl mb-6 border border-gray-100 shadow-sm overflow-y-auto transform transition
                    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        style={{ maxHeight: "520px" }}
      >
        {loading && comments.length === 0 && (
          <div className="flex items-center justify-center py-6">
            <FaSpinner className="animate-spin mr-2" />
            <span className="text-sm text-gray-500">Chargement des commentaires…</span>
          </div>
        )}

        {visibleComments.length === 0 && !loading && (
          <p className="text-sm text-gray-500">Aucun commentaire.</p>
        )}

        <div className="space-y-5">
          {visibleComments.map((c, idx) => {
            const r = repliesMap[c.id] || {};
            const visibleReplies = (r.items || []).filter(isVisible);
            const hasReplies = (c.reply_count ?? 0) > 0 || visibleReplies.length > 0; // (non utilisé ici mais utile si besoin)
            const showDeleteThis = canSeeDeleteFor(c);
            const allowEdit = canEdit(c);
            const isEditing = editingId === c.id;
            const showMyRoleBadge = isSelf(c) && (isAdmin || isModerator);

            return (
              <article
                key={c.id}
                className={`group relative rounded-2xl border
                            ${c.featured ? "border-amber-300/70 bg-amber-50/40" : "border-gray-100 bg-gray-50/50"}
                            p-4 hover:shadow-sm transition-all transform
                            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ transitionDuration: '300ms', transitionDelay: `${idx * 25}ms` }}
              >
                {/* HEAD */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-blue-200 bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {c.avatar ? (
                      <img
                        src={c.avatar}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={(e)=>{ e.currentTarget.src = PLACEHOLDER_AVATAR; }}
                      />
                    ) : <FaUser className="text-blue-600 text-sm" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900 truncate">{c.author}</p>
                          {showMyRoleBadge && <RoleBadge variant={isAdmin ? "admin" : "moderator"} />}
                          {c.featured && <Chip className="bg-amber-100 text-amber-800"><FaStar /> Mis en avant</Chip>}
                          {c.status !== "approved" && (
                            <Chip className="bg-yellow-100 text-yellow-700">
                              {c.status === "pending" ? "En modération" : c.status}
                            </Chip>
                          )}
                        </div>
                        {c.email && (
                          <p className="text-xs text-gray-500 flex items-center mt-0.5">
                            <FaEnvelope className="mr-1 opacity-70" /> {c.email}
                          </p>
                        )}
                      </div>

                      {(showDeleteThis || allowEdit || isModerator || isAdmin) && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ActionsMenu>
                            {allowEdit && !isEditing && (
                              <MenuItem
                                onClick={() => { setEditingId(c.id); setEditText(c.content); }}
                                icon={FaEdit}
                              >
                                Modifier
                              </MenuItem>
                            )}
                            {showDeleteThis && (
                              <MenuItem
                                onClick={() => handleDeleteComment(c.id, null)}
                                icon={FaTrash}
                                danger
                              >
                                Supprimer
                              </MenuItem>
                            )}
                            {(isModerator || isAdmin) && !isEditing && (
                              <>
                                <MenuItem onClick={() => openApproveModal(c)} icon={FaCheck}>Approuver</MenuItem>
                                <MenuItem onClick={() => handleReject(c.id)} icon={FaTimes}>Rejeter</MenuItem>
                                <MenuItem onClick={() => handleSpam(c.id)} icon={FaBan}>Spam</MenuItem>
                                <MenuItem onClick={() => handleFeature(c.id, !c.featured)} icon={FaStar}>
                                  {c.featured ? "Retirer de l'avant" : "Mettre en avant"}
                                </MenuItem>
                              </>
                            )}
                          </ActionsMenu>
                        </div>
                      )}
                    </div>

                    {c.status !== "approved" && isSelf(c) && (
                      <div className="mt-1">
                        <Chip className="bg-gray-100 text-gray-600"><FaEyeSlash className="opacity-70" /> Vous seul(e) voyez ce commentaire</Chip>
                      </div>
                    )}

                    {/* Contenu / édition */}
                    {!isEditing ? (
                      <p className="text-sm mt-2 whitespace-pre-line break-words text-gray-800">{c.content}</p>
                    ) : (
                      <EditableArea
                        value={editText}
                        onChange={setEditText}
                        saving={editBusy}
                        placeholder="Modifier votre commentaire…"
                        onSave={async () => {
                          if (!editText.trim()) return;
                          setEditBusy(true);
                          try {
                            const updated = await api.update(c.id, { content: editText.trim() });
                            setComments(prev => prev.map(x => x.id === c.id ? normalizeComment(updated, seed) : x));
                            setEditingId(null);
                            setEditText("");
                          } catch (err) {
                            setLocalError(extractLaravelError(err));
                          } finally {
                            setEditBusy(false);
                          }
                        }}
                        onCancel={() => { setEditingId(null); setEditText(""); }}
                      />
                    )}

                    {/* Actions rapides */}
                    <div className="mt-2 flex items-center gap-3 text-xs">
                      <button onClick={() => handleLike(c.id)} className="flex items-center gap-1 text-gray-600 hover:text-blue-700">
                        <FaThumbsUp className={c._liked ? "opacity-100" : "opacity-60"} />
                        {c.like_count}
                      </button>
                      <button onClick={() => handleDislike(c.id)} className="flex items-center gap-1 text-gray-600 hover:text-blue-700">
                        <FaThumbsDown className={c._disliked ? "opacity-100" : "opacity-60"} />
                        {c.dislike_count}
                      </button>
                      <button onClick={() => setReplyTo(c.id)} className="text-blue-700 hover:underline">Répondre</button>
                    </div>

                    {/* Toggle réponses */}
                    {(() => {
                      const r = repliesMap[c.id] || {};
                      const has = (c.reply_count ?? 0) > 0 || (r.items || []).length > 0;
                      if (!has && !r.open) return null;
                      return (
                        <div className="mt-2">
                          {r.open ? (
                            <button onClick={() => closeReplies(c.id)} className="text-xs text-gray-600 hover:text-blue-700">
                              Masquer les réponses
                            </button>
                          ) : (
                            <button onClick={() => openReplies(c.id)} className="text-xs text-gray-600 hover:text-blue-700">
                              Afficher les réponses{typeof c.reply_count === "number" ? ` (${c.reply_count})` : ""}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Bloc réponses (animé) */}
                    {(() => {
                      const r = repliesMap[c.id] || {};
                      const visibleReplies2 = (r.items || []).filter(isVisible);

                      return (
                        <HeightTransition open={!!r.open}>
                          <div className="mt-3 pl-6 border-l border-gray-200">
                            {r.error && (
                              <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                                {r.error}
                              </div>
                            )}

                            {visibleReplies2.map(rep => {
                              const showDelReply   = canSeeDeleteFor(rep);
                              const allowEditReply = canEdit(rep);
                              const isEditingReply = editingId === rep.id;
                              const showMyReplyBadge = isSelf(rep) && (isAdmin || isModerator);

                              return (
                                <div key={rep.id} className="group/reply relative flex mb-4">
                                  {(showDelReply || isModerator || isAdmin || allowEditReply) && (
                                    <div className="absolute right-0 top-0 opacity-0 group-hover/reply:opacity-100 transition-opacity">
                                      <ActionsMenu>
                                        {allowEditReply && !isEditingReply && (
                                          <MenuItem onClick={() => { setEditingId(rep.id); setEditText(rep.content); }} icon={FaEdit}>
                                            Modifier
                                          </MenuItem>
                                        )}
                                        {showDelReply && (
                                          <MenuItem onClick={() => handleDeleteComment(rep.id, c.id)} danger icon={FaTrash}>
                                            Supprimer
                                          </MenuItem>
                                        )}
                                        {(isModerator || isAdmin) && !isEditingReply && (
                                          <>
                                            <MenuItem onClick={() => openApproveModal(rep)} icon={FaCheck}>Approuver</MenuItem>
                                            <MenuItem onClick={() => handleReject(rep.id)} icon={FaTimes}>Rejeter</MenuItem>
                                            <MenuItem onClick={() => handleSpam(rep.id)} icon={FaBan}>Spam</MenuItem>
                                          </>
                                        )}
                                      </ActionsMenu>
                                    </div>
                                  )}

                                  {/* Avatar réponse */}
                                  <div className="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden border border-blue-200 bg-blue-100 flex items-center justify-center">
                                    {rep.avatar ? (
                                      <img
                                        src={rep.avatar}
                                        alt="avatar"
                                        className="w-full h-full object-cover"
                                        onError={(e)=>{ e.currentTarget.src = PLACEHOLDER_AVATAR; }}
                                      />
                                    ) : <FaUser className="text-blue-600 text-xs" />}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium text-gray-900 truncate flex items-center gap-2">
                                          {rep.author}
                                          {showMyReplyBadge && <RoleBadge variant={isAdmin ? "admin" : "moderator"} />}
                                          {rep.status !== "approved" && (
                                            <Chip className="bg-yellow-100 text-yellow-700">
                                              {rep.status === "pending" ? "En modération" : rep.status}
                                            </Chip>
                                          )}
                                        </p>
                                        {rep.email && (
                                          <p className="text-[11px] text-gray-500 flex items-center mt-0.5">
                                            <FaEnvelope className="mr-1 opacity-70" /> {rep.email}
                                          </p>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-gray-500">{rep.date}</p>
                                    </div>

                                    {!isEditingReply ? (
                                      <p className="text-[13px] mt-1 whitespace-pre-line break-words">{rep.content}</p>
                                    ) : (
                                      <EditableArea
                                        value={editText}
                                        onChange={setEditText}
                                        saving={editBusy}
                                        placeholder="Modifier votre réponse…"
                                        onSave={async () => {
                                          if (!editText.trim()) return;
                                          setEditBusy(true);
                                          try {
                                            const updated = await api.update(rep.id, { content: editText.trim() });
                                            setRepliesMap(prev => {
                                              const r2 = prev[c.id] || {};
                                              const items = (r2.items || []).map(x => x.id === rep.id ? normalizeComment(updated, seed) : x);
                                              return { ...prev, [c.id]: { ...r2, items } };
                                            });
                                            setEditingId(null);
                                            setEditText("");
                                          } catch (err) {
                                            setLocalError(extractLaravelError(err));
                                          } finally {
                                            setEditBusy(false);
                                          }
                                        }}
                                        onCancel={() => { setEditingId(null); setEditText(""); }}
                                      />
                                    )}

                                    <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                                      <button onClick={() => handleLike(rep.id)} className="flex items-center gap-1 text-gray-600 hover:text-blue-700">
                                        <FaThumbsUp className={rep._liked ? "opacity-100" : "opacity-60"} />
                                        {rep.like_count}
                                      </button>
                                      <button onClick={() => handleDislike(rep.id)} className="flex items-center gap-1 text-gray-600 hover:text-blue-700">
                                        <FaThumbsDown className={rep._disliked ? "opacity-100" : "opacity-60"} />
                                        {rep.dislike_count}
                                      </button>
                                      <button onClick={() => setReplyTo(c.id)} className="text-blue-700 hover:underline">Répondre</button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {r.page < (r.last_page || 1) && !r.loading && (
                              <div className="mt-1">
                                <button
                                  onClick={() => fetchReplies(c.id, (r.page || 0) + 1, r.per_page || 3)}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded"
                                >
                                  Charger plus de réponses
                                </button>
                              </div>
                            )}

                            {r.loading && (
                              <div className="flex items-center justify-start py-2 text-xs text-gray-500">
                                <FaSpinner className="animate-spin mr-2" />
                                Chargement des réponses…
                              </div>
                            )}
                          </div>
                        </HeightTransition>
                      );
                    })()}

                    {/* zone réponse rapide */}
                    {replyTo === c.id && (
                      <div className="mt-3">
                        <div className="relative" ref={emojiReplyWrapRef}>
                          <textarea
                            ref={replyRef}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onFocus={() => setShowEmojiReply(false)}
                            onClick={() => setShowEmojiReply(false)}
                            className="w-full border border-gray-300 rounded-xl p-2 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows="2"
                            placeholder="Votre réponse…"
                          />
                          <div className="absolute right-3 bottom-3">
                            <div className="relative select-none">
                              {showEmojiReply && (
                                <EmojiPopover
                                  onSelect={(emo) => {
                                    insertAtCursor(replyRef.current, replyText, emo, setReplyText);
                                    setShowEmojiReply(false);
                                  }}
                                  onClose={() => setShowEmojiReply(false)}
                                  title="Emojis de réponse"
                                />
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowEmojiReply(v => !v); }}
                                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
                                title="Insérer un emoji"
                              >
                                <FaSmile />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={async () => { await handleReply(c.id, replyText); setReplyText(""); setReplyTo(null); setShowEmojiReply(false); }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs"
                          >
                            Répondre
                          </button>
                          <button
                            onClick={() => { setReplyText(""); setReplyTo(null); setShowEmojiReply(false); }}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* bouton "Charger plus" OU sentinelle pour infinite scroll */}
        {!infinite && hasMore && !loading && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            >
              Charger plus
            </button>
          </div>
        )}
        {infinite && <div ref={sentinelRef} />}

        {loading && visibleComments.length > 0 && (
          <div className="flex items-center justify-center py-3">
            <FaSpinner className="animate-spin mr-2" />
            <span className="text-xs text-gray-500">Chargement…</span>
          </div>
        )}
      </div>

      {/* Formulaire d’ajout */}
      <div className="flex items-start">
        {/* Avatar utilisateur */}
        <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden border border-blue-200 bg-blue-100">
          {currentUser?.avatar_url ? (
            <img
              src={buildAvatarSrc(currentUser.avatar_url, currentUser.updated_at)}
              alt="avatar"
              className="w-full h-full object-cover"
              onError={(e)=>{ e.currentTarget.src = PLACEHOLDER_AVATAR; }}
            />
          ) : (
            <FaUser className="text-blue-600 text-sm"/>
          )}
        </div>

        <form className="flex-1" onSubmit={handleSubmit}>
          {!token && (
            <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              Vous devez être connecté pour publier un commentaire.
            </div>
          )}

          <div className="relative" ref={emojiCommentWrapRef}>
            <textarea
              ref={commentRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onFocus={() => setShowEmojiComment(false)}
              onClick={() => setShowEmojiComment(false)}
              className="w-full border border-gray-300 rounded-xl p-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows="2"
              placeholder={token ? "Ajouter un commentaire…" : "Connectez-vous pour commenter…"}
              disabled={submitting || !token}
            />

            {/* Bouton + popover emoji */}
            <div className="absolute right-3 bottom-3">
              <div className="relative select-none">
                {showEmojiComment && (
                  <EmojiPopover
                    onSelect={(emo) => {
                      insertAtCursor(commentRef.current, comment, emo, setComment);
                      setShowEmojiComment(false);
                    }}
                    onClose={() => setShowEmojiComment(false)}
                    title="Emojis de commentaire"
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowEmojiComment(v => !v); }}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-50"
                  title="Insérer un emoji"
                  disabled={!token || submitting}
                >
                  <FaSmile />
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !comment.trim() || !token}
            className="mt-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white px-5 py-2.5 rounded-xl text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:shadow-md"
          >
            {submitting ? (<><FaSpinner className="inline animate-spin mr-2" /> Envoi en cours…</>) : ("Envoyer")}
          </button>
        </form>
      </div>

      {/* Modale d’approbation */}
      <ApproveModal
        open={!!approveFor}
        onClose={closeApproveModal}
        onConfirm={confirmApprove}
        comment={approveFor}
      />
    </div>
  );
}
