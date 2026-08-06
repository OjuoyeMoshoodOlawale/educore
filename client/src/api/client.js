import axios from 'axios';
import { useAuthStore } from '../stores/auth';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const auth = useAuthStore();
  if (auth.accessToken) config.headers.Authorization = `Bearer ${auth.accessToken}`;
  return config;
});

// One 401 -> try a silent refresh once, then retry the original request.
let refreshing = null;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const auth = useAuthStore();
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      refreshing = refreshing || auth.refresh();
      const ok = await refreshing;
      refreshing = null;
      if (ok) return api(original);
    }
    return Promise.reject(error);
  }
);
