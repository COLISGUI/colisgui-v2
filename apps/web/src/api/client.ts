import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = import.meta.env.VITE_API_URL ?? '/api/v1';

// withCredentials : nécessaire pour envoyer/recevoir le cookie httpOnly du refresh token.
export const api = axios.create({ baseURL, withCredentials: true });

export function getAccess() { return localStorage.getItem('cg_access'); }
export function setAccess(access: string) { localStorage.setItem('cg_access', access); }
export function clearTokens() {
  localStorage.removeItem('cg_access');
  localStorage.removeItem('cg_user');
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  try {
    // Le refresh token voyage via le cookie httpOnly (non accessible au JS).
    const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
    setAccess(data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url ?? '';
    // Ne pas tenter de rafraîchir sur les routes d'auth elles-mêmes.
    if (error.response?.status === 401 && original && !original._retry && !url.includes('/auth/')) {
      original._retry = true;
      refreshing = refreshing ?? doRefresh();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function apiError(e: unknown): string {
  const err = e as AxiosError<{ message?: string | string[] }>;
  const msg = err.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? err.message ?? 'Une erreur est survenue';
}
