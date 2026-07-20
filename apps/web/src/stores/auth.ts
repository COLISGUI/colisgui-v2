import { defineStore } from 'pinia';
import { api, setAccess, clearTokens, getAccess } from '../api/client';

export interface AuthUser { id: string; nom: string; prenom: string; role: string; }

export const useAuth = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('cg_user') || 'null') as AuthUser | null,
    ready: false,
  }),
  getters: {
    isAuthenticated: () => !!getAccess(),
    role: (s) => s.user?.role ?? '',
    initials: (s) => (s.user ? (s.user.prenom[0] ?? '') + (s.user.nom[0] ?? '') : '?'),
  },
  actions: {
    async login(identifiant: string, password: string) {
      // Réponse : { accessToken, user }. Le refresh token est posé en cookie httpOnly.
      const { data } = await api.post('/auth/login', { identifiant, password });
      setAccess(data.accessToken);
      this.user = data.user;
      localStorage.setItem('cg_user', JSON.stringify(data.user));
    },
    async logout() {
      try { await api.post('/auth/logout'); } catch { /* ignore */ }
      clearTokens();
      this.user = null;
    },
  },
});
