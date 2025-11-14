// src/hooks/useMeFromLaravel.js
import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const cleanBaseUrl = () => (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/,"");
const makeAxios = (token) => {
  const base = cleanBaseUrl();
  const apiBase = `${base.replace(/\/api\/?$/,'')}/api`;
  return axios.create({
    baseURL: apiBase,
    withCredentials: true,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export default function useMeFromLaravel() {
  const [me, setMe] = useState({ user: null, roles: [], permissions: [] });
  const [loading, setLoading] = useState(false);

  const token = useMemo(() => {
    try {
      return (
        localStorage.getItem("auth_token") ||
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
