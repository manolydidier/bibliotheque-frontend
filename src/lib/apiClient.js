import axios from 'axios';
import { logoutUser } from '../store/slices/Slice';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
});

export function initApiClient(store) {
  api.interceptors.request.use((config) => {
    const token = store.getState()?.library?.auth?.token;
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error?.response?.status === 401) {
        store.dispatch(logoutUser());
      }
      return Promise.reject(error);
    }
  );
}
export default api;
