// src/media-library/Comments.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import {
  FaUser, FaSpinner, FaTrash, FaThumbsUp, FaThumbsDown,
  FaCheck, FaTimes, FaBan, FaStar, FaEnvelope, FaSmile, FaEyeSlash,
  FaEdit, FaSave, FaUndo, FaShieldAlt
} from "react-icons/fa";
import { BsArrowDown, BsArrowUp, BsStar } from "react-icons/bs";

/* ------------------ AVATAR HELPERS ------------------ */
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

/* ------------------ axios helpers ------------------ */
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

/* ------------------ Emoji picker (no deps) ------------------ */
function EmojiPopover({ onSelect, onClose, title = "Emojis pro" }) {
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
      className="absolute bottom-full mb-2 right-0 w-72 max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg p-2 z-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
        sessionStorage.getItem("auth_token") ||
        localStorage.getItem("tokenGuard") ||
        sessionStorage.getItem("tokenGuard") ||
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
        const { data } = await axios.get('/user', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
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

/* --------- BADGE RÔLE --------- */
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

  // ---- ÉDITION ----
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const editRef = useRef(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(extLoading);
  const [localError, setLocalError] = useState(extError);

  // réponses: id -> { items, page, last_page, per_page, open, loading, error }
  const [repliesMap, setRepliesMap] = useState({});

  const sentinelRef = useRef(null);
  const canLoad = !!articleId && !loading && hasMore;

  // ---- TRI (icônes only) ----
  const [sortRoot, setSortRoot] = useState("newest");          // newest | oldest
  const [featuredFirstRoot, setFeaturedFirstRoot] = useState(true);
  const sortReplies = sortRoot; // les réponses suivent le tri des commentaires

  /* ========= Utils ========= */
  function normalizeComment(c, seed, i = 0) {
    const u = c?.user || {};
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    const displayName = u.username || fullName || c?.guest_name || "Anonyme";
    const email = u.email || c?.guest_email || "";
    const created = c?.created_at ? new Date(c.created_at) : null;

    // avatar
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
      status: c?.status || "approved",
      featured: !!(c?.is_featured ?? c?.featured ?? c?.pinned ?? c?._pinned),
      like_count: c?.like_count ?? 0,
      dislike_count: c?.dislike_count ?? 0,
      reply_count: c?.reply_count ?? 0,
      _liked: false,
      _disliked: false,
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

  // On respecte l'ordre du serveur → on filtre juste côté client
  const visibleComments = useMemo(() => comments.filter(isVisible), [comments, isVisible]);

  const canSeeDeleteFor = useCallback((node) => {
    return isAdmin || isModerator || canDeleteAny || isSelf(node);
  }, [isAdmin, isModerator, canDeleteAny, isSelf]);

  function canEdit(node) {
    if (!token) return false;
    if (!isSelf(node)) return false;
    const status = (node?.status || "").toLowerCase();
    if (status === "approved") return false;
    if (status === "rejected" || status === "spam") return false;
    const replies = Number(node?.reply_count || 0);
    if (replies > 0) return false;
    return true;
  }

  /* ========= Chargement liste (observe tri) ========= */
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

  /* ========= Fermer popovers emoji ========= */
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

  const handleLike = useCallback(async (id) => {
    try {
      setComments(prev => prev.map(c => {
        if (c.id !== id) return c;
        const nowLiked = !c._liked;
        const likeDelta = nowLiked ? 1 : -1;
        const undoDislike = c._disliked ? 1 : 0;
        return { ...c, _liked: nowLiked, _disliked: false, like_count: c.like_count + likeDelta, dislike_count: c.dislike_count - undoDislike };
      }));
      const target = comments.find(c => c.id === id);
      const action = target?._liked ? "unlike" : "like";
      await api.like(id, action === "like" ? "like" : "unlike");
    } catch (err) {
      console.error("Erreur like:", err);
      setLocalError(extractLaravelError(err));
    }
  }, [api, comments]);

  const handleDislike = useCallback(async (id) => {
    try {
      setComments(prev => prev.map(c => {
        if (c.id !== id) return c;
        const now = !c._disliked;
        const dDelta = now ? 1 : -1;
        const undoLike = c._liked ? 1 : 0;
        return { ...c, _disliked: now, _liked: false, dislike_count: c.dislike_count + dDelta, like_count: c.like_count - undoLike };
      }));
      const target = comments.find(c => c.id === id);
      const action = target?._disliked ? "undislike" : "dislike";
      await api.dislike(id, action === "dislike" ? "dislike" : "undislike");
    } catch (err) {
      console.error("Erreur dislike:", err);
      setLocalError(extractLaravelError(err));
    }
  }, [api, comments]);

  // --- Approve modal state ---
  const [approveFor, setApproveFor] = useState(null);
  const openApproveModal = (c) => setApproveFor({ id: c.id, author: c.author, email: c.email, content: c.content });
  const closeApproveModal = () => setApproveFor(null);
  const confirmApprove = async (notes) => {
    if (!approveFor) return;
    try {
      const updated = await api.approve(approveFor.id, notes || null);
      setComments(prev => prev.map(c => c.id === approveFor.id ? normalizeComment(updated, seed) : c));
      closeApproveModal();
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  };

  const handleReject = useCallback(async (id, notes = "Non conforme") => {
    try {
      const updated = await api.reject(id, notes);
      setComments(prev => prev.map(c => c.id === id ? normalizeComment(updated, seed) : c));
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  }, [api, seed]);

  const handleSpam = useCallback(async (id, notes = null) => {
    try {
      const updated = await api.spam(id, notes);
      setComments(prev => prev.map(c => c.id === id ? normalizeComment(updated, seed) : c));
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  }, [api, seed]);

  const handleFeature = useCallback(async (id, featured = true) => {
    try {
      const updated = await api.feature(id, featured);
      setComments(prev => prev.map(c => c.id === id ? normalizeComment(updated, seed) : c));
    } catch (err) {
      setLocalError(extractLaravelError(err));
    }
  }, [api, seed]);

  /* ========= Réponses: open/close/fetch (observe tri) ========= */
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

  /* ---------------- UI ---------------- */
  const meBanner = currentUser && (
    <div className="mb-4 flex items-center gap-3 text-sm text-gray-700 px-3 py-2">
      {(isAdmin || isModerator) && (
        <RoleBadge variant={isAdmin ? "admin" : "moderator"} />
      )}
    </div>
  );

  // --- Toolbar ultra-épurée (icônes only) ---
  const toolbar = (
    <div className="mb-3 flex items-center justify-end gap-2">
      {/* Toggle ordre (↓ / ↑) */}
      <button
        type="button"
        onClick={() => { setSortRoot(prev => (prev === "newest" ? "oldest" : "newest")); setPage(1); setRepliesMap({}); }}
        title={sortRoot === "newest" ? "Plus récent → moins récent" : "Plus ancien → plus récent"}
        aria-label="Basculer l’ordre de tri"
        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
      >
        {sortRoot === "newest"
          ? <BsArrowDown className="w-3 h-3 text-gray-700" />
          : <BsArrowUp className="w-3 h-3 text-gray-700" />
        }
      </button>

      {/* Checkbox “mis en avant d’abord” */}
      <label
        className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition cursor-pointer"
        title="Mettre les commentaires en avant en priorité"
        aria-label="Mis en avant d’abord"
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={featuredFirstRoot}
          onChange={(e) => { setFeaturedFirstRoot(e.target.checked); setPage(1); }}
        />
        <BsStar className={`w-3 h-3 ${featuredFirstRoot ? "text-amber-500" : "text-gray-500"}`} />
      </label>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center">Commentaires</h2>
      <div className="flex flex-raw gap-3 mb-4 justify-between">
        {meLoading ? (
          <div className="mb-4 flex items-center text-sm text-gray-600">
            <FaSpinner className="animate-spin mr-2" /> Chargement de votre profil…
          </div>
        ) : meBanner}
        {toolbar}
      </div>

      {localError && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm whitespace-pre-line">{localError}</div>
      )}

      <div className="comment-box bg-white p-5 rounded-xl mb-6 border border-gray-200/50 shadow-sm overflow-y-auto" style={{ maxHeight: "520px" }}>
        {loading && comments.length === 0 && (
          <div className="flex items-center justify-center py-4">
            <FaSpinner className="animate-spin mr-2" />
            <span className="text-sm text-gray-500">Chargement des commentaires…</span>
          </div>
        )}

        {visibleComments.length === 0 && !loading && (
          <p className="text-sm text-gray-500">Aucun commentaire.</p>
        )}

        {visibleComments.map((c) => {
          const r = repliesMap[c.id] || {};
          const visibleReplies = (r.items || []).filter(isVisible);
          const hasReplies = (c.reply_count ?? 0) > 0 || visibleReplies.length > 0;
          const showToggle = hasReplies || r.open;
          const showDeleteThis = canSeeDeleteFor(c);
          const allowEdit = canEdit(c);
          const isEditing = editingId === c.id;

          const wrapperBase = "group relative flex mb-6 pb-6 border-b last:border-b-0 last:mb-0 last:pb-0";
          const wrapperFeatured = "bg-amber-50/60 border-amber-300 rounded-xl ring-1 ring-amber-300/60 p-3 -mx-3 px-4";
          const borderLine = "border-b border-gray-200/50";
          const containerClass = `${wrapperBase} ${c.featured ? wrapperFeatured : borderLine}`;

          const showMyRoleBadge = isSelf(c) && (isAdmin || isModerator);

          return (
          <div key={c.id} className={containerClass}>
            {(showDeleteThis || isModerator || isAdmin || allowEdit) && (
              <div className="absolute right-0 top-0 flex items-center gap-3 bg-white/90 backdrop-blur px-2 py-1 rounded-bl-lg border border-gray-200
                              opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {allowEdit && !isEditing && (
                  <button
                    onClick={() => { setEditingId(c.id); setEditText(c.content); setTimeout(()=>editRef.current?.focus(),0); }}
                    className="text-blue-600 hover:text-blue-800 text-xs"
                    title="Modifier"
                  >
                    <div className="flex flex-col items-center">
                      <FaEdit /> <span>Modifier</span>
                    </div>
                  </button>
                )}

                {isEditing && (
                  <>
                    <button
                      onClick={async () => {
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
                      className="text-green-600 hover:text-green-800 text-xs disabled:opacity-50"
                      disabled={editBusy || !editText.trim()}
                      title="Enregistrer"
                    >
                      <div className="flex flex-col items-center">
                        <FaSave /> <span>Enregistrer</span>
                      </div>
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditText(""); }}
                      className="text-gray-600 hover:text-gray-800 text-xs"
                      title="Annuler"
                    >
                      <div className="flex flex-col items-center">
                        <FaUndo /> <span>Annuler</span>
                      </div>
                    </button>
                  </>
                )}

                {showDeleteThis && (
                  <button
                    onClick={() => handleDeleteComment(c.id, null)}
                    className="text-red-600 hover:text-red-800 text-xs"
                    title="Supprimer"
                  >
                    <div className="flex flex-col items-center">
                      <FaTrash /> <span>Supprimer</span>
                    </div>
                  </button>
                )}

                {/* === Boutons MODÉRATION (rétablis) === */}
                {(isModerator || isAdmin) && !isEditing && (
                  <>
                    <button
                      onClick={() => openApproveModal(c)}
                      className="text-green-600 hover:text-green-800 text-xs"
                      title="Approuver"
                    >
                      <div className="flex flex-col items-center">
                        <FaCheck /> <span>Approuver</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleReject(c.id)}
                      className="text-orange-600 hover:text-orange-800 text-xs"
                      title="Rejeter"
                    >
                      <div className="flex flex-col items-center">
                        <FaTimes /> <span>Rejeter</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleSpam(c.id)}
                      className="text-pink-600 hover:text-pink-800 text-xs"
                      title="Spam"
                    >
                      <div className="flex flex-col items-center">
                        <FaBan /> <span>Spam</span>
                      </div>
                    </button>

                    <button
                      onClick={() => handleFeature(c.id, !c.featured)}
                      className={`${c.featured ? "text-amber-600 hover:text-amber-700" : "text-yellow-600 hover:text-yellow-800"} text-xs`}
                      title={c.featured ? "Retirer de l'avant" : "Mettre en avant"}
                    >
                      <div className="flex flex-col items-center">
                        <FaStar />
                        <span>{c.featured ? "Retirer" : "En avant"}</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full mr-3 flex-shrink-0 overflow-hidden border border-blue-200 bg-blue-100 flex items-center justify-center">
              {c.avatar ? (
                <img
                  src={c.avatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                  onError={(e)=>{ e.currentTarget.src = PLACEHOLDER_AVATAR; }}
                />
              ) : (
                <FaUser className="text-blue-600 text-sm" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate flex items-center gap-2">
                    {c.author}
                    {showMyRoleBadge && <RoleBadge variant={isAdmin ? "admin" : "moderator"} />}
                    {c.featured && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        <FaStar className="opacity-90" />
                        Mis en avant
                      </span>
                    )}
                    {c.status !== "approved" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 align-middle">
                        {c.status === "pending" ? "En modération" : c.status}
                      </span>
                    )}
                  </p>
                  {c.email && (
                    <p className="text-xs text-gray-500 flex items-center mt-0.5">
                      <FaEnvelope className="mr-1 opacity-70" /> {c.email}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500">{c.date}</p>
              </div>

              {/* Badge auteur si non approuvé */}
              {c.status !== "approved" && isSelf(c) && (
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    <FaEyeSlash className="opacity-70" />
                    Vous seul(e) pouvez voir ce commentaire
                  </span>
                </div>
              )}

              {/* Contenu / Édition */}
              {!isEditing ? (
                <p className="text-sm mt-1 whitespace-pre-line break-words">{c.content}</p>
              ) : (
                <div className="mt-2">
                  <textarea
                    ref={editRef}
                    className="w-full border border-blue-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={editText}
                    onChange={(e)=>setEditText(e.target.value)}
                    placeholder="Modifier votre commentaire…"
                    disabled={editBusy}
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={async () => {
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
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
                      disabled={editBusy || !editText.trim()}
                    >
                      <FaSave className="inline mr-2" /> Enregistrer
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditText(""); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs"
                    >
                      <FaUndo className="inline mr-2" /> Annuler
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
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
                const hasReplies = (c.reply_count ?? 0) > 0 || (r.items || []).length > 0;
                if (!hasReplies && !r.open) return null;
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

              {/* Bloc réponses */}
              {(() => {
                const r = repliesMap[c.id] || {};
                if (!r.open) return null;
                const visibleReplies = (r.items || []).filter(isVisible);
                return (
                  <div className="mt-3 pl-6 border-l border-gray-200">
                    {r.error && (
                      <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded">{r.error}</div>
                    )}

                    {visibleReplies.map(rep => {
                      const showDelReply = canSeeDeleteFor(rep);
                      const allowEditReply = canEdit(rep);
                      const isEditingReply = editingId === rep.id;
                      const showMyReplyBadge = isSelf(rep) && (isAdmin || isModerator);

                      return (
                        <div key={rep.id} className="group/reply relative flex mb-4">
                          {(showDelReply || isModerator || isAdmin || allowEditReply) && (
                            <div className="absolute right-0 top-0 flex items-center gap-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-bl-lg border border-gray-200
                                            opacity-0 group-hover/reply:opacity-100 transition-opacity duration-150">
                              {allowEditReply && !isEditingReply && (
                                <button
                                  onClick={() => { setEditingId(rep.id); setEditText(rep.content); setTimeout(()=>editRef.current?.focus(),0); }}
                                  className="text-blue-600 hover:text-blue-800 text-[11px]"
                                  title="Modifier"
                                >
                                  <div className="flex flex-col items-center">
                                    <FaEdit /> <span>Modifier</span>
                                  </div>
                                </button>
                              )}

                              {isEditingReply && (
                                <>
                                  <button
                                    onClick={async () => {
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
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
                                    disabled={editBusy || !editText.trim()}
                                  >
                                    <FaSave className="inline mr-2" /> Enregistrer
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setEditText(""); }}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs"
                                  >
                                    <FaUndo className="inline mr-2" /> Annuler
                                  </button>
                                </>
                              )}

                              {showDelReply && (
                                <button
                                  onClick={() => handleDeleteComment(rep.id, c.id)}
                                  className="text-red-600 hover:text-red-800 text-[11px]"
                                  title="Supprimer"
                                >
                                  <div className="flex flex-col items-center">
                                    <FaTrash /> <span>Supprimer</span>
                                  </div>
                                </button>
                              )}

                              {/* === Boutons MODÉRATION (réponses) === */}
                              {(isModerator || isAdmin) && !isEditingReply && (
                                <>
                                  <button onClick={() => openApproveModal(rep)} className="text-green-600 hover:text-green-800 text-[11px]" title="Approuver">
                                    <div className="flex flex-col items-center">
                                      <FaCheck /> <span>Approuver</span>
                                    </div>
                                  </button>
                                  <button onClick={() => handleReject(rep.id)} className="text-orange-600 hover:text-orange-800 text-[11px]" title="Rejeter">
                                    <div className="flex flex-col items-center">
                                      <FaTimes /> <span>Rejeter</span>
                                    </div>
                                  </button>
                                  <button onClick={() => handleSpam(rep.id)} className="text-pink-600 hover:text-pink-800 text-[11px]" title="Spam">
                                    <div className="flex flex-col items-center">
                                      <FaBan /> <span>Spam</span>
                                    </div>
                                  </button>
                                  {/* Si tu veux “mettre en avant” aussi les réponses, dé-commente : */}
                                  {/* <button
                                    onClick={() => handleFeature(rep.id, !rep.featured)}
                                    className={`${rep.featured ? "text-amber-600 hover:text-amber-700" : "text-yellow-600 hover:text-yellow-800"} text-[11px]`}
                                    title={rep.featured ? "Retirer de l'avant" : "Mettre en avant"}
                                  >
                                    <div className="flex flex-col items-center">
                                      <FaStar />
                                      <span>{rep.featured ? "Retirer" : "En avant"}</span>
                                    </div>
                                  </button> */}
                                </>
                              )}
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
                            ) : (
                              <FaUser className="text-blue-600 text-xs" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate flex items-center gap-2">
                                  {rep.author}
                                  {showMyReplyBadge && <RoleBadge variant={isAdmin ? "admin" : "moderator"} />}
                                  {rep.status !== "approved" && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 align-middle">
                                      {rep.status === "pending" ? "En modération" : rep.status}
                                    </span>
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
                              <div className="mt-2">
                                <textarea
                                  ref={editRef}
                                  className="w-full border border-blue-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  rows={3}
                                  value={editText}
                                  onChange={(e)=>setEditText(e.target.value)}
                                  placeholder="Modifier votre réponse…"
                                  disabled={editBusy}
                                />
                                <div className="mt-2 flex gap-2">
                                  <button
                                    onClick={async () => {
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
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs disabled:opacity-50"
                                    disabled={editBusy || !editText.trim()}
                                  >
                                    <FaSave className="inline mr-2" /> Enregistrer
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setEditText(""); }}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-lg text-xs"
                                  >
                                    <FaUndo className="inline mr-2" /> Annuler
                                  </button>
                                </div>
                              </div>
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

                    {/* Charger plus de réponses */}
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
        )})}

        {/* bouton "Charger plus" OU sentinelle pour infinite scroll */}
        {!infinite && hasMore && !loading && (
          <div className="mt-3 flex justify-center">
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
