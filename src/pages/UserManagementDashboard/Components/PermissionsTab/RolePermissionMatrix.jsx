// components/permissions/RolePermissionMatrix.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useDeferredValue,
} from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEye,
  faEdit,
  faTrash,
  faDatabase,
  faChevronDown,
  faChevronRight,
  faCheckCircle,
  faSpinner,
  faExclamationCircle,
  faShieldAlt,
  faFilter,
  faTimes,
  faSearch,
  faExpandAlt,
  faCompressAlt,
  faSync,
  faBan,
  faDownload,
  faUpload,
  faLayerGroup,
  faUndo,
  faRedo,
  faCheck,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const ACTIONS = [
  { key: 'create', labelKey: 'create', icon: faPlus, color: 'text-green-600' },
  { key: 'read',   labelKey: 'read',   icon: faEye,  color: 'text-blue-600' },
  { key: 'update', labelKey: 'edit',   icon: faEdit, color: 'text-yellow-600' },
  { key: 'delete', labelKey: 'delete', icon: faTrash,color: 'text-red-600' },
];

const STORAGE_KEYS = {
  selectedRoles: 'rpm:selectedRoles',
  expandedResources: 'rpm:expandedResources',
  search: 'rpm:search',
  lkg: 'rpm:lkg',            // Last Known Good data
  presets: 'rpm:presets',    // { [name]: { grants: { [roleId]: [permId,...] } } }
};

const HISTORY_LIMIT = 50;
const MAX_CONCURRENCY = 6;

const RolePermissionMatrix = () => {
  const { t } = useTranslation();

  // ---- Data ----
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [resources, setResources] = useState([]);
  const [rolePermissionSet, setRolePermissionSet] = useState(() => new Set()); // `${roleId}:${permId}`
  const [permissionByKey, setPermissionByKey] = useState(() => new Map());     // `${resource}.${action}` -> perm

  // ---- UI / State ----
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState({}); // `${roleId}-${resource}-${action}` -> bool

  const [expandedResources, setExpandedResources] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEYS.expandedResources) || '[]')); }
    catch { return new Set(); }
  });
  const [selectedRoles, setSelectedRoles] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.selectedRoles) || '[]'); }
    catch { return []; }
  });
  const [searchTerm, setSearchTerm] = useState(localStorage.getItem(STORAGE_KEYS.search) || '');
  const deferredSearch = useDeferredValue(searchTerm);

  const [isStale, setIsStale] = useState(false);
  const [status, setStatus] = useState({ roles: 'idle', perms: 'idle', rps: 'idle' });
  const [bannerClosed, setBannerClosed] = useState(false);

  // ---- New features state ----
  const [bulkMode, setBulkMode] = useState(false);
  const [historyBack, setHistoryBack] = useState([]); // [{changes: [{roleId, permId, prevHas, nextHas}], at: Date}]
  const [historyForward, setHistoryForward] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.presets) || '{}'); }
    catch { return {}; }
  });
  const [showPresetUI, setShowPresetUI] = useState(false);
  const [presetName, setPresetName] = useState('');

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  // Refs
  const controllerRef = useRef(null);
  const cancelSourceRef = useRef(null);
  const mountedRef = useRef(true);
  const importInputRef = useRef(null);

  // ---- Axios config ----
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    axios.defaults.baseURL = API_BASE_URL;
    axios.defaults.timeout = 20000;
  }, [API_BASE_URL]);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // ---- Persist UI state ----
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.selectedRoles, JSON.stringify(selectedRoles)); }, [selectedRoles]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.expandedResources, JSON.stringify(Array.from(expandedResources))); }, [expandedResources]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.search, searchTerm); }, [searchTerm]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(presets)); }, [presets]);

  // ---- Helpers ----
  const extractArray = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.data)) return payload.data;
    if (payload && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
    return [];
  };
  const buildIndexes = useCallback((permList) => {
    const byKey = new Map();
    const resSet = new Set();
    for (const p of permList) {
      if (p?.action && typeof p.action === 'string') {
        byKey.set(p.action, p);
        const [resource] = p.action.split('.');
        if (resource) resSet.add(resource);
      }
      if (p?.resource && typeof p.resource === 'string') resSet.add(p.resource);
    }
    return { byKey, resources: Array.from(resSet).sort((a, b) => a.localeCompare(b)) };
  }, []);
  const applyData = useCallback((rolesData, permsData, rpsData) => {
    setRoles(rolesData.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
    setPermissions(permsData);
    const { byKey, resources: resList } = buildIndexes(permsData);
    setPermissionByKey(byKey);
    setResources(resList);
    const rpSet = new Set();
    for (const rp of rpsData) {
      if (rp?.role_id != null && rp?.permission_id != null) rpSet.add(`${rp.role_id}:${rp.permission_id}`);
    }
    setRolePermissionSet(rpSet);
  }, [buildIndexes]);

  // LKG au boot
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.lkg);
      if (!raw) return;
      const { roles: lr = [], perms: lp = [], rps: lrp = [] } = JSON.parse(raw) || {};
      if (lr.length || lp.length || lrp.length) {
        applyData(lr, lp, lrp);
        setIsStale(true);
        setLoading(false);
      }
    } catch {}
  }, [applyData]);

  // Annuler refresh
  const cancelRefresh = useCallback(() => {
    try { controllerRef.current?.abort(); } catch {}
    try { cancelSourceRef.current?.cancel('refresh canceled'); } catch {}
    controllerRef.current = null;
    cancelSourceRef.current = null;
    setRefreshing(false);
    if (!isStale && loading) setLoading(false);
  }, [isStale, loading]);

  // Fetch robuste
  const loadData = useCallback(async () => {
    setBannerClosed(false);
    setRefreshing(true);
    setLoading((prev) => (prev && !isStale ? true : false));
    setError('');
    setStatus({ roles: 'idle', perms: 'idle', rps: 'idle' });

    const supportsAbort = typeof AbortController !== 'undefined';
    const hasCancelToken = !!axios.CancelToken;
    const reqConfig = {};
    if (supportsAbort) {
      controllerRef.current = new AbortController();
      reqConfig.signal = controllerRef.current.signal;
    } else if (hasCancelToken) {
      cancelSourceRef.current = axios.CancelToken.source();
      reqConfig.cancelToken = cancelSourceRef.current.token;
    }
    const req = (url) => axios.get(url, reqConfig);

    try {
      const [rolesS, permsS, rpsS] = await Promise.allSettled([
        req('/roles').then((r)=>{ setStatus(s=>({...s,roles:'ok'})); return r; }).catch((e)=>{ setStatus(s=>({...s,roles:'err'})); throw e; }),
        req('/permissions').then((r)=>{ setStatus(s=>({...s,perms:'ok'})); return r; }).catch((e)=>{ setStatus(s=>({...s,perms:'err'})); throw e; }),
        req('/role-permissions').then((r)=>{ setStatus(s=>({...s,rps:'ok'})); return r; }).catch((e)=>{ setStatus(s=>({...s,rps:'err'})); throw e; }),
      ]);

      if (!mountedRef.current) return;

      const rolesData = rolesS.status === 'fulfilled' ? extractArray(rolesS.value.data) : [];
      const permsData = permsS.status === 'fulfilled' ? extractArray(permsS.value.data) : [];
      const rpsData   = rpsS.status === 'fulfilled' ? extractArray(rpsS.value.data)   : [];

      applyData(rolesData, permsData, rpsData);

      try { localStorage.setItem(STORAGE_KEYS.lkg, JSON.stringify({ roles: rolesData, perms: permsData, rps: rpsData })); } catch {}

      if ([rolesS, permsS, rpsS].some((s) => s.status === 'rejected')) {
        setError(t('partial_load_warning') || 'Chargement partiel : certaines données ont échoué.');
        setIsStale(false);
      } else {
        setError('');
        setIsStale(false);
      }
    } catch (e) {
      const canceled =
        (e && (e.name === 'CanceledError' || e.message === 'canceled' || e.message === 'refresh canceled')) ||
        (typeof axios.isCancel === 'function' && axios.isCancel(e));
      if (!canceled) {
        console.error('Load error:', e);
        if (!isStale) setError(t('failed_to_load_permissions_matrix') || 'Échec du chargement');
        else setError(t('backend_slow') || 'Le serveur met du temps à répondre… (affichage en cache)');
      }
    } finally {
      controllerRef.current = null;
      cancelSourceRef.current = null;
      setRefreshing(false);
      if (mountedRef.current) setLoading(false);
    }
  }, [applyData, isStale, t]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived
  const filteredResources = useMemo(() => {
    const term = deferredSearch?.trim().toLowerCase();
    if (!term) return resources;
    return resources.filter((r) => r.toLowerCase().includes(term) || t(r, r).toLowerCase().includes(term));
  }, [resources, deferredSearch, t]);

  const displayedRoles = useMemo(() => {
    if (!selectedRoles?.length) return roles;
    const setSel = new Set(selectedRoles);
    return roles.filter((r) => setSel.has(r.id));
  }, [roles, selectedRoles]);

  const allExpanded = useMemo(() => filteredResources.length > 0 && filteredResources.every((res) => expandedResources.has(res)), [filteredResources, expandedResources]);

  // Permission helpers
  const getPermissionFor = useCallback((resource, actionKey) => permissionByKey.get(`${resource}.${actionKey}`), [permissionByKey]);
  const hasPermission = useCallback((roleId, resource, actionKey) => {
    const perm = getPermissionFor(resource, actionKey);
    return perm ? rolePermissionSet.has(`${roleId}:${perm.id}`) : false;
  }, [getPermissionFor, rolePermissionSet]);

  const setHasPermissionLocal = useCallback((roleId, permId, newHas) => {
    setRolePermissionSet((prev) => {
      const next = new Set(prev);
      const key = `${roleId}:${permId}`;
      newHas ? next.add(key) : next.delete(key);
      return next;
    });
  }, []);

  // Historique
  const pushHistory = useCallback((changes) => {
    setHistoryBack((prev) => {
      const next = [...prev, { changes, at: Date.now() }];
      if (next.length > HISTORY_LIMIT) next.shift();
      return next;
    });
    setHistoryForward([]); // purge redo
  }, []);

  // API set permission to desired state (optimistic)
  const setPermissionDesired = useCallback(async (roleId, perm, desiredHas, options = { recordHistory: true }) => {
    const keyPair = `${roleId}:${perm.id}`;
    const currentHas = rolePermissionSet.has(keyPair);
    if (currentHas === desiredHas) return null; // no-op

    // optimistic
    setHasPermissionLocal(roleId, perm.id, desiredHas);

    try {
      if (desiredHas) {
        await axios.post('/role-permissions', { role_id: roleId, permission_id: perm.id });
      } else {
        await axios.delete(`/role-permissions/${roleId}/${perm.id}`);
      }
      if (options.recordHistory) {
        pushHistory([{ roleId, permId: perm.id, prevHas: currentHas, nextHas: desiredHas }]);
      }
      return { roleId, permId: perm.id, prevHas: currentHas, nextHas: desiredHas };
    } catch (err) {
      // rollback
      setHasPermissionLocal(roleId, perm.id, currentHas);
      console.error('API setPermissionDesired error:', err);
      setError(t('update_permission_error') || 'Impossible de mettre à jour la permission.');
      return null;
    }
  }, [rolePermissionSet, setHasPermissionLocal, pushHistory, t]);

  // Toggle single permission (UI)
  const togglePermission = useCallback(async (roleId, resource, actionKey) => {
    const perm = getPermissionFor(resource, actionKey);
    if (!perm) { alert(t('permission_not_found', { action: actionKey, resource })); return; }

    const cellKey = `${roleId}-${resource}-${actionKey}`;
    if (pending[cellKey]) return;

    const currentHas = rolePermissionSet.has(`${roleId}:${perm.id}`);
    const nextHas = !currentHas;

    setPending((p) => ({ ...p, [cellKey]: true }));
    const res = await setPermissionDesired(roleId, perm, nextHas, { recordHistory: true });
    setPending((p) => { const n = { ...p }; delete n[cellKey]; return n; });

    return res;
  }, [getPermissionFor, pending, rolePermissionSet, setPermissionDesired, t]);

  // Bulk helpers
  const throttleRun = useCallback(async (tasks, onProgress) => {
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: tasks.length });
    const queue = [...tasks];
    let running = 0;
    let done = 0;
    const workers = [];

    const next = () => {
      if (!queue.length) return Promise.resolve();
      const task = queue.shift();
      running++;
      return task().finally(() => {
        running--;
        done++;
        onProgress?.(done, tasks.length);
      }).then(next);
    };

    for (let i = 0; i < Math.min(MAX_CONCURRENCY, tasks.length); i++) {
      workers.push(next());
    }
    await Promise.all(workers);
    setBatchRunning(false);
  }, []);

  const bulkApplyForResource = useCallback(async (resource, desiredHas) => {
    // Applique pour toutes les actions *et* pour tous les rôles affichés
    const tasks = [];
    for (const action of ACTIONS) {
      const perm = getPermissionFor(resource, action.key);
      if (!perm) continue;
      for (const role of displayedRoles) {
        const keyPair = `${role.id}:${perm.id}`;
        const currentHas = rolePermissionSet.has(keyPair);
        if (currentHas === desiredHas) continue;
        tasks.push(() => setPermissionDesired(role.id, perm, desiredHas, { recordHistory: false }));
      }
    }
    if (!tasks.length) return;

    const changeAccumulator = [];
    await throttleRun(tasks, (done, total) => setBatchProgress({ done, total }));
    // Recalcule les changements pour l’historique (post-run)
    for (const action of ACTIONS) {
      const perm = getPermissionFor(resource, action.key);
      if (!perm) continue;
      for (const role of displayedRoles) {
        const keyPair = `${role.id}:${perm.id}`;
        const prevHas = !desiredHas; // on suppose tout inversé localement pour ce bulk
        const nextHas = desiredHas;
        changeAccumulator.push({ roleId: role.id, permId: perm.id, prevHas, nextHas });
      }
    }
    pushHistory(changeAccumulator);
  }, [ACTIONS, displayedRoles, getPermissionFor, rolePermissionSet, setPermissionDesired, throttleRun, pushHistory]);

  const bulkApplyForActionEverywhere = useCallback(async (actionKey, desiredHas) => {
    // Applique pour *toutes les ressources filtrées* et tous les rôles affichés
    const tasks = [];
    for (const resource of filteredResources) {
      const perm = getPermissionFor(resource, actionKey);
      if (!perm) continue;
      for (const role of displayedRoles) {
        const keyPair = `${role.id}:${perm.id}`;
        const currentHas = rolePermissionSet.has(keyPair);
        if (currentHas === desiredHas) continue;
        tasks.push(() => setPermissionDesired(role.id, perm, desiredHas, { recordHistory: false }));
      }
    }
    if (!tasks.length) return;
    const changeAccumulator = [];
    await throttleRun(tasks, (done, total) => setBatchProgress({ done, total }));
    for (const resource of filteredResources) {
      const perm = getPermissionFor(resource, actionKey);
      if (!perm) continue;
      for (const role of displayedRoles) {
        changeAccumulator.push({ roleId: role.id, permId: perm.id, prevHas: !desiredHas, nextHas: desiredHas });
      }
    }
    pushHistory(changeAccumulator);
  }, [filteredResources, displayedRoles, getPermissionFor, rolePermissionSet, setPermissionDesired, throttleRun, pushHistory]);

  // Undo / Redo
  const doUndo = useCallback(async () => {
    const last = historyBack[historyBack.length - 1];
    if (!last) return;
    const { changes } = last;
    setHistoryBack((p) => p.slice(0, -1));
    setHistoryForward((p) => [...p, last]);

    const tasks = changes.map(({ roleId, permId, prevHas, nextHas }) => () => {
      // nous voulons revenir à prevHas
      const fakePerm = { id: permId };
      return setPermissionDesired(roleId, fakePerm, prevHas, { recordHistory: false });
    });
    await throttleRun(tasks, (done, total) => setBatchProgress({ done, total }));
  }, [historyBack, setPermissionDesired, throttleRun]);

  const doRedo = useCallback(async () => {
    const last = historyForward[historyForward.length - 1];
    if (!last) return;
    const { changes } = last;
    setHistoryForward((p) => p.slice(0, -1));
    setHistoryBack((p) => [...p, last]);

    const tasks = changes.map(({ roleId, permId, prevHas, nextHas }) => () => {
      const fakePerm = { id: permId };
      return setPermissionDesired(roleId, fakePerm, nextHas, { recordHistory: false });
    });
    await throttleRun(tasks, (done, total) => setBatchProgress({ done, total }));
  }, [historyForward, setPermissionDesired, throttleRun]);

  // Presets
  const exportJSON = useCallback(() => {
    // Exporte les permissions des rôles affichés
    const grants = {};
    for (const role of displayedRoles) {
      const ids = [];
      for (const perm of permissions) {
        if (rolePermissionSet.has(`${role.id}:${perm.id}`)) ids.push(perm.id);
      }
      grants[role.id] = ids;
    }
    const payload = { exported_at: new Date().toISOString(), roles: displayedRoles.map(r=>({id:r.id,name:r.name})), grants };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'permissions_export.json'; a.click();
    URL.revokeObjectURL(url);
  }, [displayedRoles, permissions, rolePermissionSet]);

  const importJSON = useCallback((obj) => {
    if (!obj || !obj.grants) return;
    const tasks = [];
    const changeAccumulator = [];
    for (const role of displayedRoles) {
      const desired = new Set(obj.grants[String(role.id)] || obj.grants[role.id] || []);
      for (const perm of permissions) {
        const target = desired.has(perm.id);
        const cur = rolePermissionSet.has(`${role.id}:${perm.id}`);
        if (cur !== target) {
          tasks.push(() => setPermissionDesired(role.id, perm, target, { recordHistory: false }));
          changeAccumulator.push({ roleId: role.id, permId: perm.id, prevHas: cur, nextHas: target });
        }
      }
    }
    if (!tasks.length) return;
    throttleRun(tasks, (done, total) => setBatchProgress({ done, total })).then(() => {
      pushHistory(changeAccumulator);
    });
  }, [displayedRoles, permissions, rolePermissionSet, setPermissionDesired, throttleRun, pushHistory]);

  const onImportFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(String(evt.target?.result || '{}'));
        importJSON(json);
      } catch (err) {
        setError(t('invalid_file') || 'Fichier invalide.');
      } finally {
        if (importInputRef.current) importInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  }, [importJSON, t]);

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const name = presetName.trim();
    const grants = {};
    for (const role of displayedRoles) {
      const ids = [];
      for (const perm of permissions) {
        if (rolePermissionSet.has(`${role.id}:${perm.id}`)) ids.push(perm.id);
      }
      grants[role.id] = ids;
    }
    const next = { ...presets, [name]: { created_at: Date.now(), grants } };
    setPresets(next);
    setPresetName('');
  }, [presetName, displayedRoles, permissions, rolePermissionSet, presets]);

  const applyPreset = useCallback((name) => {
    const obj = presets[name];
    if (!obj) return;
    importJSON({ grants: obj.grants });
  }, [presets, importJSON]);

  // UI Handlers
  const onToggleExpandOne = useCallback((resource) => {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      next.has(resource) ? next.delete(resource) : next.add(resource);
      return next;
    });
  }, []);
  const onToggleExpandAll = useCallback(() => {
    setExpandedResources((prev) => {
      const next = new Set(prev);
      const setAll = !allExpanded;
      for (const r of filteredResources) setAll ? next.add(r) : next.delete(r);
      return next;
    });
  }, [allExpanded, filteredResources]);
  const onToggleRoleChip = useCallback((roleId) => {
    setSelectedRoles((prev) => prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]);
  }, []);
  const onSelectAll = useCallback(() => setSelectedRoles(roles.map((r) => r.id)), [roles]);
  const onClearSelection = useCallback(() => setSelectedRoles([]), []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === '/') { e.preventDefault(); const el = document.getElementById('rpm-search'); el?.focus(); }
      if (e.key.toLowerCase() === 'e') onToggleExpandAll();
      if (e.key.toLowerCase() === 'a') onSelectAll();
      if (e.key.toLowerCase() === 'z') doUndo();
      if (e.key.toLowerCase() === 'y') doRedo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleExpandAll, onSelectAll, doUndo, doRedo]);

  // ---- Render ----
  if (loading && !isStale) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl mb-3 text-blue-600" />
        <p className="text-lg">{t('loading')}...</p>
        <div className="mt-6 w-full max-w-3xl space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="h-6 bg-gray-200 rounded animate-pulse" />))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" role="region" aria-label={t('permissions_management')}>
      {/* Bannière état */}
      {(error || isStale || refreshing || batchRunning) && !bannerClosed && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={(refreshing || batchRunning) ? faSpinner : faExclamationCircle} className={(refreshing || batchRunning) ? 'animate-spin' : ''} />
            <span className="flex items-center gap-2">
              {isStale && <span>{t('offline_cache', 'Affichage des dernières données connues')}</span>}
              {(isStale && (error || refreshing || batchRunning)) ? <span>–</span> : null}
              {error && <span>{error}</span>}
              {refreshing && <span>{t('refreshing', 'Actualisation en cours...')}</span>}
              {batchRunning && <span>{t('applying_changes', 'Application des changements...')} {batchProgress.done}/{batchProgress.total}</span>}
              <span className="ml-3 text-xs">
                <b>roles:</b> {status.roles} <b>perms:</b> {status.perms} <b>rps:</b> {status.rps}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!refreshing && !batchRunning && (
              <button onClick={loadData} className="text-sm px-3 py-1 rounded bg-yellow-100 hover:bg-yellow-200 flex items-center gap-2" title={t('retry', 'Réessayer')}>
                <FontAwesomeIcon icon={faSync} /> {t('retry', 'Réessayer')}
              </button>
            )}
            {refreshing && (
              <button onClick={cancelRefresh} className="text-sm px-3 py-1 rounded bg-yellow-100 hover:bg-yellow-200 flex items-center gap-2" title={t('cancel_refresh')}>
                <FontAwesomeIcon icon={faBan} /> {t('cancel_refresh')}
              </button>
            )}
            <button onClick={() => setBannerClosed(true)} className="text-sm px-2 py-1 rounded hover:bg-yellow-100" aria-label={t('close', 'Fermer')}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/30 p-2 rounded-lg"><FontAwesomeIcon icon={faShieldAlt} className="text-xl" /></div>
            <div>
              <h3 className="text-lg font-semibold">{t('permissions_management')}</h3>
              <p className="text-sm opacity-90">{t('click_resource_to_manage')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Recherche */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faSearch} className="text-gray-200" />
              </div>
              <input
                id="rpm-search"
                type="text"
                placeholder={t('search_resources')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-9 py-2 border border-white/20 bg-white/10 rounded-lg text-white placeholder:text-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50"
                aria-label={t('search_resources')}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center" aria-label={t('clear_search')}>
                  <FontAwesomeIcon icon={faTimes} className="text-white/80 hover:text-white" />
                </button>
              )}
            </div>

            {/* Undo / Redo */}
            <button onClick={doUndo} disabled={!historyBack.length || batchRunning} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 disabled:opacity-50">
              <FontAwesomeIcon icon={faUndo} /> {t('undo') || 'Annuler'}
            </button>
            <button onClick={doRedo} disabled={!historyForward.length || batchRunning} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 disabled:opacity-50">
              <FontAwesomeIcon icon={faRedo} /> {t('redo') || 'Rétablir'}
            </button>

            {/* Bulk mode */}
            <button onClick={() => setBulkMode((b) => !b)} className={`px-3 py-2 rounded-lg flex items-center gap-2 ${bulkMode ? 'bg-white text-blue-700' : 'bg-white/20 hover:bg-white/30'}`} title={t('bulk_mode')}>
              <FontAwesomeIcon icon={faLayerGroup} /> {t('bulk_mode') || 'Mode groupé'}
            </button>

            {/* Expand all */}
            <button onClick={onToggleExpandAll} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2">
              <FontAwesomeIcon icon={allExpanded ? faCompressAlt : faExpandAlt} />
              <span className="text-sm">{allExpanded ? t('collapse_all') : t('expand_all')}</span>
            </button>

            {/* Import / Export */}
            <button onClick={exportJSON} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2" title={t('export')}>
              <FontAwesomeIcon icon={faDownload} /> {t('export') || 'Exporter'}
            </button>
            <label className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 cursor-pointer" title={t('import')}>
              <FontAwesomeIcon icon={faUpload} /> {t('import') || 'Importer'}
              <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />
            </label>

            {/* Presets */}
            <button onClick={() => setShowPresetUI((s) => !s)} className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2">
              <FontAwesomeIcon icon={faLayerGroup} /> {t('presets') || 'Presets'}
            </button>
          </div>
        </div>

        {/* Preset UI */}
        {showPresetUI && (
          <div className="mt-3 bg-white/10 rounded-lg p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('preset_name') || 'Nom du preset'}
                className="px-3 py-2 rounded bg-white/20 text-white placeholder:text-white/70 border border-white/30 focus:ring-1 focus:ring-white/50"
              />
              <button onClick={savePreset} disabled={!presetName.trim()} className="px-3 py-2 bg-white text-blue-700 rounded hover:bg-gray-100 disabled:opacity-50">
                <FontAwesomeIcon icon={faCheck} className="mr-1" /> {t('save') || 'Sauver'}
              </button>
              <div className="flex flex-wrap gap-2">
                {Object.keys(presets).length === 0 && <span className="text-white/80 text-sm">{t('no_presets') || 'Aucun preset'}</span>}
                {Object.keys(presets).map((name) => (
                  <div key={name} className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded text-sm">
                    <button onClick={() => applyPreset(name)} className="underline">{name}</button>
                    <button onClick={() => setPresets((p) => { const n = { ...p }; delete n[name]; return n; })} aria-label="delete preset" title={t('delete')}>
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filtre des rôles */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 shrink-0">
            <FontAwesomeIcon icon={faFilter} /> {t('filter_roles')}:
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onSelectAll} className={`text-xs px-3 py-1 rounded-full ${selectedRoles.length === roles.length && roles.length > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
              {t('all')}
            </button>
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => onToggleRoleChip(role.id)}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${selectedRoles.includes(role.id) ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                aria-pressed={selectedRoles.includes(role.id)}
              >
                {role.name}{selectedRoles.includes(role.id) && (<FontAwesomeIcon icon={faTimes} className="ml-1 w-3 h-3" />)}
              </button>
            ))}
            {selectedRoles.length > 0 && (
              <button onClick={onClearSelection} className="text-xs text-red-600 hover:text-red-800 px-2">{t('clear_selection')}</button>
            )}
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto relative">
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 md:hidden" />
        <table className="min-w-full divide-y divide-gray-200" role="table" aria-label={t('permissions_management')}>
          <thead className="bg-gray-50" role="rowgroup">
            <tr role="row">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 z-20 min-w-[240px]" role="columnheader">{t('resource')}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700" role="columnheader">
                <div className="flex items-center gap-3">
                  <span>{t('action')}</span>
                  {/* Bulk par action (sur toutes ressources filtrées) */}
                  {bulkMode && (
                    <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
                      <span className="mr-1">{t('apply_to_filtered_resources') || 'Appliquer (ressources filtrées):'}</span>
                      {ACTIONS.map(a => (
                        <div key={`bulkact-${a.key}`} className="flex items-center gap-1">
                          <button
                            className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            title={`${t('grant')} ${t(a.labelKey)}`}
                            onClick={(e) => { e.stopPropagation(); bulkApplyForActionEverywhere(a.key, true); }}
                          >{t(a.labelKey)} +</button>
                          <button
                            className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                            title={`${t('revoke')} ${t(a.labelKey)}`}
                            onClick={(e) => { e.stopPropagation(); bulkApplyForActionEverywhere(a.key, false); }}
                          >{t(a.labelKey)} −</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </th>
              {displayedRoles.map((role) => (
                <th key={role.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[130px]" role="columnheader" aria-label={role.name}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="whitespace-nowrap">{role.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
            {filteredResources.length === 0 ? (
              <tr role="row">
                <td colSpan={displayedRoles.length + 2} className="p-8 text-center text-gray-500" role="cell">
                  <FontAwesomeIcon icon={faDatabase} size="3x" className="opacity-30 mb-4" />
                  <p className="text-lg">{t('no_resources_found')}</p>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                      {t('clear_search')}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredResources.map((resource) => {
                const isOpen = expandedResources.has(resource);
                return (
                  <React.Fragment key={resource}>
                    {/* Ligne ressource */}
                    <tr className="hover:bg-blue-50 transition-colors group" role="row" aria-expanded={isOpen}>
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-blue-50 z-10 min-w-[240px]" role="cell">
                        <div className="flex items-center gap-3">
                          <button onClick={() => onToggleExpandOne(resource)} className="p-1 rounded hover:bg-gray-100">
                            <FontAwesomeIcon icon={isOpen ? faChevronDown : faChevronRight} className="text-gray-500 transition-transform" />
                          </button>
                          <FontAwesomeIcon icon={faDatabase} className="text-blue-600" />
                          <span className="font-medium text-gray-900 whitespace-nowrap">{t(resource, resource)}</span>
                          {bulkMode && (
                            <div className="ml-3 flex items-center gap-2">
                              <button
                                className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                title={t('grant_all_for_resource') || 'Tout accorder (ressource)'}
                                onClick={() => bulkApplyForResource(resource, true)}
                              >
                                {t('grant_all') || 'Tout +'}
                              </button>
                              <button
                                className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                                title={t('revoke_all_for_resource') || 'Tout retirer (ressource)'}
                                onClick={() => bulkApplyForResource(resource, false)}
                              >
                                {t('revoke_all') || 'Tout −'}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500" role="cell">
                        {isOpen ? t('tap_to_collapse') : t('tap_to_configure')}
                      </td>
                      {displayedRoles.map((role) => {
                        const granted = ACTIONS.filter((a) => hasPermission(role.id, resource, a.key)).length;
                        const total = ACTIONS.length;
                        const percent = Math.round((granted / total) * 100);
                        return (
                          <td key={role.id} className="px-4 py-3 text-center" role="cell">
                            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => onToggleExpandOne(resource)}>
                              <div className="w-16 bg-gray-200 rounded-full h-2" aria-hidden>
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    percent === 100 ? 'bg-green-500' : percent > 0 ? 'bg-blue-500' : 'bg-gray-200'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600 whitespace-nowrap" aria-label={`${granted}/${total}`}>{granted}/{total}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Actions détaillées */}
                    {isOpen && ACTIONS.map((action) => (
                      <tr key={`${resource}-${action.key}`} className="hover:bg-gray-50" role="row">
                        <td className="px-4 py-2 sticky left-0 bg-white hover:bg-gray-50 z-10 min-w-[240px]" role="cell" />
                        <td className="px-4 py-2" role="cell">
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                            <FontAwesomeIcon icon={action.icon} className={action.color} />
                            {t(action.labelKey)}
                            {bulkMode && (
                              <span className="ml-2 flex items-center gap-1 text-xs">
                                <button
                                  className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  onClick={(e) => { e.stopPropagation(); bulkApplyForActionEverywhere(action.key, true); }}
                                >
                                  {t('grant')} +
                                </button>
                                <button
                                  className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 hover:bg-rose-200"
                                  onClick={(e) => { e.stopPropagation(); bulkApplyForActionEverywhere(action.key, false); }}
                                >
                                  {t('revoke')} −
                                </button>
                              </span>
                            )}
                          </div>
                        </td>

                        {displayedRoles.map((role) => {
                          const perm = getPermissionFor(resource, action.key);
                          const has = perm ? rolePermissionSet.has(`${role.id}:${perm.id}`) : false;
                          const cellKey = `${role.id}-${resource}-${action.key}`;
                          const isPending = !!pending[cellKey];
                          return (
                            <td key={`${role.id}-${action.key}`} className="px-4 py-2 text-center" role="cell">
                              {isPending ? (
                                <div className="flex justify-center" aria-busy>
                                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600" />
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); togglePermission(role.id, resource, action.key); }}
                                  className={`relative w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center text-white font-medium text-sm ${
                                    has
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg'
                                      : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600'
                                  }`}
                                  title={has ? t('revoke_permission') : t('grant_permission')}
                                  aria-pressed={has}
                                  aria-label={`${has ? t('revoke') : t('grant')} ${t(action.labelKey)} ${t('permission_for')} ${role.name}`}
                                >
                                  <FontAwesomeIcon icon={has ? faCheckCircle : faPlus} />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Légende & infos */}
      <div className="px-6 py-3 bg-gray-50 text-xs text-gray-600 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" />{t('all_permissions_granted')}</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-500" />{t('some_permissions_granted')}</span>
            <span className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-gray-300" />{t('no_permissions_granted')}</span>
          </div>
          <div className="text-gray-500">
            {t('showing')} {filteredResources.length} {t('of')} {resources.length} {t('resources')}
            {searchTerm && ` (${t('filtered')})`} • {t('roles')}: {displayedRoles.length}/{roles.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionMatrix;
