import { defineStore } from 'pinia';
import axios from 'axios';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null,
    user: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken
  },
  actions: {
    async login(email, password) {
      const res = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
      this.accessToken = res.data.data.accessToken;
      this.user = res.data.data.user;
    },
    async refresh() {
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        this.accessToken = res.data.data.accessToken;
        this.user = res.data.data.user;
        return true;
      } catch {
        this.accessToken = null;
        this.user = null;
        return false;
      }
    },
    async logout() {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
      this.accessToken = null;
      this.user = null;
    }
  }
});
