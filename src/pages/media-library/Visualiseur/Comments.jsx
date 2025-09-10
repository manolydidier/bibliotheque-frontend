// src/media-library/Comments.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import axios from "axios";
import {
  FaUser, FaSpinner, FaTrash, FaThumbsUp, FaThumbsDown,
  FaCheck, FaTimes, FaBan, FaStar, FaEnvelope, FaInfoCircle
} from "react-icons/fa";
import { toast } from "../../../component/toast/toast"; // ⬅️ ajuste le chemin si besoin

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
    show: (articleId, params = {}) =>
      axiosi.get(`/comments/${articleId}`, { params }).then(r => r.data),
    replies: (commentId, params = {}) =>
      axiosi.get(`/comments/${commentId}/replies`, { params }).then(r => r.data),
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
/** Hook interne (fallback) si on ne passe PAS de props d'auth depuis Visualiseur */
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

function computeRights(permissions = []) {
  const list = Array.isArray(permissions) ? permissions : [];
  const isModerator = list.some(p =>
    String(p?.resource).toLowerCase() === "comments" &&
    /(moderateur|approver|approve|manage|admin|gerer)/i.test(String(p?.name))
  );
  const canDeleteAny =
    isModerator ||
    list.some(p =>
      String(p?.resource).toLowerCase() === "comments" &&
      /(supprimer|delete|remove)/i.test(String(p?.name))
    );
  return { isModerator, canDeleteAny };
}

/* ------------------ Main component ------------------ */
export default function Comments({
  articleId,
  initialComments = [],
  perPage = 20,
  infinite = false,
  isLoading: extLoading = false,
  error: extError = null,

  /** ⬇️ Nouveaux props pour injecter l’auth/permissions depuis Visualiseur */
  meOverride = null,          // { user, roles, permissions }
  tokenOverride = null,       // string (Bearer)
  rightsOverride = null,      // { isModerator, canDeleteAny }
}) {
  /* ========= Utilisateur + permissions ========= */
  const internal = useMeFromLaravel();
  const me = meOverride ?? internal.me;
  const meLoading = meOverride ? false : internal.loading;
  const token = tokenOverride ?? internal.token;

  const computed = useMemo(() => computeRights(me?.permissions), [me?.permissions]);
  const { isModerator, canDeleteAny } = rightsOverride ?? computed;

  const currentUser = me.user;

  /* ========= API Comments ========= */
  const axiosi = useMemo(() => makeAxios(token), [token]);
  const api = useMemo(() => buildCommentApi(axiosi), [axiosi]);

  /* ========= État local ========= */
  const seed = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [comments, setComments] = useState(() =>
    (initialComments || []).map((c, i) => normalizeComment(c, seed, i))
  );

  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(extLoading);
  const [localError, setLocalError] = useState(extError);

  // Auto-dismiss de l'erreur globale après 4.5s
  useEffect(() => {
    if (!localError) return;
    const t = setTimeout(() => setLocalError(null), 4500);
    return () => clearTimeout(t);
  }, [localError]);

  // réponses: id -> { items, page, last_page, per_page, open, loading, error }
  const [repliesMap, setRepliesMap] = useState({});

  const sentinelRef = useRef(null);
  const canLoad = !!articleId && !loading && hasMore;

  /* ========= Chargement liste ========= */
  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    setLocalError(null);

    api.show(articleId, { parent_id: "null", per_page: perPage, page })
      .then(payload => {
        const { items, current_page, last_page } = parsePagination(payload, page, perPage);
        const mapped = items.map((c, i) => normalizeComment(c, seed, (page - 1) * perPage + i));
        setComments(prev => page === 1 ? mapped : [...prev, ...mapped]);
        setHasMore(current_page < last_page);
      })
      .catch(err => {
        const msg = extractLaravelError(err);
        toast.error(msg, { duration: 4000, position: "top-right" });
        setLocalError(msg);
      })
      .finally(() => setLoading(false));
  }, [articleId, page, api, seed, perPage]);

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

  /* ========= Utils ========= */
  function getRandomColor(key = "") {
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return `#${"000000".substring(0, 6 - c.length) + c}`;
  }
  function normalizeComment(c, seed, i = 0) {
    const u = c?.user || {};
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    const displayName = u.username || fullName || c?.guest_name || "Anonyme";
    theCommentStatus(c);
    const email = u.email || c?.guest_email || "";
    const avatar = u.avatar_url_full || u.avatar_url || null;
    const created = c?.created_at ? new Date(c.created_at) : null;

    return {
      id: c?.id ?? (i + 1),
      author: displayName,
      author_id: u?.id ?? c?.user_id ?? c?._user_id ?? null,
      email,
      avatar,
      date: created ? created.toLocaleDateString() : "—",
      content: c?.content || c?.body || "",
      color: getRandomColor(`${seed}${i}`),
      status: c?.status || "approved",
      like_count: c?.like_count ?? 0,
      dislike_count: c?.dislike_count ?? 0,
      reply_count: c?.reply_count ?? 0,
      _liked: false,
      _disliked: false,
      _raw: c,
    };
  }
  function theCommentStatus(c){ return c?.status; }

  const isSelf = useCallback((node) => {
    const uid = me?.user?.id;
    const ownerId = node?.author_id ?? node?._raw?.user?.id ?? node?._raw?.user_id ?? null;
    if (!uid || !ownerId) return false;
    return String(uid) === String(ownerId);
  }, [me?.user?.id]);

  const isVisible = useCallback((node) => {
    if (isModerator) return true;
    if (node?.status === "approved") return true;
    if (isSelf(node)) return true;
    return false;
  }, [isModerator, isSelf]);

  const visibleComments = useMemo(() => comments.filter(isVisible), [comments, isVisible]);

  const canSeeDeleteFor = useCallback((node) => {
    return isModerator || canDeleteAny || isSelf(node);
  }, [isModerator, canDeleteAny, isSelf]);

  /* ========= Actions ========= */
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!token) {
      toast.info("Connectez-vous pour commenter.", { duration: 3000, position: "top-right" });
      setLocalError("Authentification requise.");
      return;
    }
    const val = comment.trim();
    if (!val) return;

    setSubmitting(true);
    setLocalError(null);
    try {
      const payload = { article_id: articleId, content: val };
      const created = await api.store(payload);
      const mapped = normalizeComment(created, seed, comments.length);
      setComments(prev => [mapped, ...prev]);
      setComment("");
      toast.success(
        mapped.status === "approved" ? "Commentaire publié." : "Commentaire envoyé (en attente de modération).",
        { duration: 2500, position: "top-right" }
      );
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
      setLocalError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [comment, articleId, api, comments.length, seed, token]);

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
      toast.success("Commentaire supprimé.", { duration: 2200, position: "top-right" });
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
      setLocalError(msg);
    }
  }, [api]);

  const handleReply = useCallback(async (parentId, content) => {
    if (!token) {
      toast.info("Connectez-vous pour répondre.", { duration: 3000, position: "top-right" });
      setLocalError("Authentification requise.");
      return;
    }
    const text = (content || "").trim();
    if (!text) return;

    try {
      const created = await api.reply(parentId, { content: text });
      const mapped = normalizeComment(created, seed, 0);
      setRepliesMap(prev => {
        const r = prev[parentId] || { items: [], page: 1, last_page: 1, per_page: 3, open: true, loading: false, error: null };
        return { ...prev, [parentId]: { ...r, open: true, items: [mapped, ...(r.items || [])] } };
      });
      setComments(prev => prev.map(c => c.id === parentId ? { ...c, reply_count: (c.reply_count || 0) + 1 } : c));

      toast.success(
        mapped.status === "approved" ? "Réponse publiée." : "Réponse envoyée (en attente de modération).",
        { duration: 2500, position: "top-right" }
      );
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
      setLocalError(msg);
    }
  }, [api, seed, token]);

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
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 3000, position: "top-right" });
      setLocalError(msg);
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
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 3000, position: "top-right" });
      setLocalError(msg);
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
      toast.success("Commentaire approuvé.", { duration: 2200, position: "top-right" });
      closeApproveModal();
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
  };

  const handleReject = useCallback(async (id, notes = "Non conforme") => {
    try {
      const updated = await api.reject(id, notes);
      setComments(prev => prev.map(c => c.id === id ? normalizeComment(updated, seed) : c));
      toast.info("Commentaire rejeté.", { duration: 2400, position: "top-right" });
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
  }, [api, seed]);

  const handleSpam = useCallback(async (id, notes = null) => {
    try {
      const updated = await api.spam(id, notes);
      setComments(prev => prev.map(c => c.id === id ? normalizeComment(updated, seed) : c));
      toast.info("Marqué comme spam.", { duration: 2200, position: "top-right" });
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
  }, [api, seed]);

  const handleFeature = useCallback(async (id, featured = true) => {
    try {
      const updated = await api.feature(id, featured);
      setComments(prev => prev.map(c => c.id === id ? normalizeComment(updated, seed) : c));
      toast.success("Commentaire mis en avant.", { duration: 2200, position: "top-right" });
    } catch (err) {
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 4000, position: "top-right" });
    }
  }, [api, seed]);

  /* ========= Réponses: open/close/fetch ========= */
  const fetchReplies = useCallback(async (parentId, nextPage = 1, per = 3) => {
    setRepliesMap(prev => {
      const r = prev[parentId] || { items: [], page: 0, last_page: 1, per_page: per, open: true, loading: false, error: null };
      return { ...prev, [parentId]: { ...r, per_page: per, loading: true, error: null } };
    });

    try {
      const payload = await api.replies(parentId, { per_page: per, page: nextPage });
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
            items: merged, // on garde tout, filtre à l’affichage
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
      const msg = extractLaravelError(err);
      toast.error(msg, { duration: 3500, position: "top-right" });
      setRepliesMap(prev => {
        const r = prev[parentId] || {};
        return { ...prev, [parentId]: { ...r, loading: false, error: msg } };
      });
    }
  }, [api, seed]);

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
    <div className="mb-4 flex items-center gap-3 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
      <div className="w-6 h-6 rounded-full overflow-hidden bg-blue-200 flex items-center justify-center text-white">
        {currentUser.avatar_url ? (
          <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs">
            {(currentUser.username || currentUser.first_name || "U").slice(0,1).toUpperCase()}
          </span>
        )}
      </div>
      <span>
        Connecté en tant que <strong>{currentUser.username || `${currentUser.first_name ?? ""} ${currentUser.last_name ?? ""}`.trim() || currentUser.email}</strong>
        {isModerator && <em className="ml-2 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">Modération</em>}
      </span>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center">
        <FaUser className="mr-2 text-blue-600" />
        Commentaires
      </h2>

      {meLoading ? (
        <div className="mb-4 flex items-center text-sm text-gray-600">
          <FaSpinner className="animate-spin mr-2" /> Chargement de votre profil…
        </div>
      ) : meBanner}

     {localError && (
        <div
          role="alert"
          className="relative mb-4 p-3 pl-4 pr-10 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm whitespace-pre-line"
        >
          <span className="block">{localError}</span>
          <button
            type="button"
            onClick={() => setLocalError(null)}
            aria-label="Fermer l’alerte"
            className="absolute top-2.5 right-2.5 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-red-200/60 focus:outline-none"
            title="Fermer"
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>
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
          const hasVisibleReplies = visibleReplies.length > 0;
          const showToggle = (!r.open && (c.reply_count ?? 0) > 0) || (r.open && hasVisibleReplies);
          const showDeleteThis = canSeeDeleteFor(c);

          return (
          <div key={c.id} className="group relative flex mb-6 pb-6 border-b border-gray-200/50 last:border-b-0 last:mb-0 last:pb-0">
            {(showDeleteThis || isModerator) && (
              <div className="absolute right-0 top-0 flex items-center gap-2 bg-white/90 backdrop-blur px-2 py-1 rounded-bl-lg border border-gray-200
                              opacity-0 group-hover:opacity-100 transition-opacity duration-150">
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
                {isModerator && (
                  <>
                    <button onClick={() => openApproveModal(c)} className="text-green-600 hover:text-green-800 text-xs" title="Approuver">
                      <div className="flex flex-col items-center">
                        <FaCheck /> <span>Approuver</span>
                      </div>
                    </button>
                    <button onClick={() => handleReject(c.id)} className="text-orange-600 hover:text-orange-800 text-xs" title="Rejeter">
                      <div className="flex flex-col items-center">
                        <FaTimes /> <span>Rejeter</span>
                      </div>
                    </button>
                    <button onClick={() => handleSpam(c.id)} className="text-pink-600 hover:text-pink-800 text-xs" title="Spam">
                      <div className="flex flex-col items-center">
                        <FaBan /> <span>Spam</span>
                      </div>
                    </button>
                    <button onClick={() => handleFeature(c.id, true)} className="text-yellow-600 hover:text-yellow-800 text-xs" title="Mettre en avant">
                      <div className="flex flex-col items-center">
                        <FaStar /> <span>En avant</span>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full mr-3 flex-shrink-0 overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center"
              style={{ backgroundColor: !c.avatar ? c.color : undefined }}
            >
              {c.avatar ? (
                <img src={c.avatar} alt="avatar" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
              ) : (
                <FaUser className="text-white text-sm" />
              )}
            </div>

            {/* Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {c.author}
                    {c.status !== "approved" && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 align-middle">
                        {c.status === "pending" ? "En modération" : c.status}
                      </span>
                    )}
                  </p>

                  {/* Pastille de visibilité locale */}
                  {c.status !== "approved" && (
                    <div className="mt-1 text-[11px] text-gray-600 inline-flex items-center gap-1">
                      <FaInfoCircle className="opacity-70" />
                      {isModerator
                        ? "Visible pour la modération"
                        : (isSelf(c) ? "Visible uniquement par vous" : null)
                      }
                    </div>
                  )}

                  {c.email && (
                    <p className="text-xs text-gray-500 flex items-center mt-0.5">
                      <FaEnvelope className="mr-1 opacity-70" /> {c.email}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500">{c.date}</p>
              </div>

              <p className="text-sm mt-1 whitespace-pre-line break-words">{c.content}</p>

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
              {showToggle && (
                <div className="mt-2">
                  {r.open ? (
                    hasVisibleReplies ? (
                      <button onClick={() => closeReplies(c.id)} className="text-xs text-gray-600 hover:text-blue-700">
                        Masquer les réponses
                      </button>
                    ) : null
                  ) : (
                    <button onClick={() => openReplies(c.id)} className="text-xs text-gray-600 hover:text-blue-700">
                      Afficher les réponses{typeof c.reply_count === "number" ? ` (${c.reply_count})` : ""}
                    </button>
                  )}
                </div>
              )}

              {/* Pastille quand ouvert mais 0 réponse visible */}
              {r.open && !hasVisibleReplies && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full">
                  <FaInfoCircle className="opacity-70" />
                  Aucune réponse visible
                </div>
              )}

              {/* Bloc réponses */}
              {(r.open && hasVisibleReplies) && (
                <div className="mt-3 pl-6 border-l border-gray-200">
                  {r.error && (
                    <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded">{r.error}</div>
                  )}

                  {visibleReplies.map(rep => {
                    const showDelReply = canSeeDeleteFor(rep);
                    return (
                      <div key={rep.id} className="group/reply relative flex mb-4">
                        {(showDelReply || isModerator) && (
                          <div className="absolute right-0 top-0 flex items-center gap-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-bl-lg border border-gray-200
                                          opacity-0 group-hover/reply:opacity-100 transition-opacity duration-150">
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
                            {isModerator && (
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
                              </>
                            )}
                          </div>
                        )}

                        {/* Avatar reply */}
                        <div
                          className="w-8 h-8 rounded-full mr-3 flex-shrink-0 overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center"
                          style={{ backgroundColor: !rep.avatar ? rep.color : undefined }}
                        >
                          {rep.avatar ? (
                            <img src={rep.avatar} alt="avatar" className="w-full h-full object-cover" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                          ) : (
                            <FaUser className="text-white text-xs" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {rep.author}
                                {rep.status !== "approved" && (
                                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 align-middle">
                                    {rep.status === "pending" ? "En modération" : rep.status}
                                  </span>
                                )}
                              </p>

                              {rep.status !== "approved" && (
                                <div className="mt-0.5 text-[10px] text-gray-600 inline-flex items-center gap-1">
                                  <FaInfoCircle className="opacity-70" />
                                  {isModerator
                                    ? "Visible pour la modération"
                                    : (isSelf(rep) ? "Visible uniquement par vous" : null)
                                  }
                                </div>
                              )}

                              {rep.email && (
                                <p className="text-[11px] text-gray-500 flex items-center mt-0.5">
                                  <FaEnvelope className="mr-1 opacity-70" /> {rep.email}
                                </p>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">{rep.date}</p>
                          </div>

                          <p className="text-[13px] mt-1 whitespace-pre-line break-words">{rep.content}</p>

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

                  {/* pagination réponses */}
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
        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3 flex-shrink-0 overflow-hidden">
          {currentUser?.avatar_url ? (
            <img src={currentUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <FaUser className="text-gray-600 text-sm"/>
          )}
        </div>
        <form className="flex-1" onSubmit={handleSubmit}>
          {!token && (
            <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              Vous devez être connecté pour publier un commentaire.
            </div>
          )}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows="2"
            placeholder={token ? "Ajouter un commentaire…" : "Connectez-vous pour commenter…"}
            disabled={submitting || !token}
          />
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
