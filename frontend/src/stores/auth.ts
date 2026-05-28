import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface AuthUser {
  id: string;
  nom: string;
  prenom?: string;
  role: 'admin' | 'gerant' | 'cuisine' | 'caisse' | 'serveur';
}

const TOKEN_KEY = 'ak_resto_token';
const USER_KEY = 'ak_resto_user';

export const useAuth = defineStore('auth', () => {
  // Initial state restored from localStorage
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AuthUser | null>(
    JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  );

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const role = computed(() => user.value?.role || null);

  function hasRole(allowed: string | string[]): boolean {
    if (!user.value) return false;
    const list = Array.isArray(allowed) ? allowed : [allowed];
    return list.includes(user.value.role);
  }

  function setSession(newToken: string, newUser: AuthUser) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function initials(): string {
    if (!user.value) return '?';
    const first = user.value.prenom?.[0] || '';
    const last = user.value.nom?.[0] || '';
    return (first + last).toUpperCase() || user.value.nom[0].toUpperCase();
  }

  // Redirige un utilisateur vers son dashboard par défaut selon son rôle.
  function defaultRouteForRole(): string {
    if (!user.value) return '/staff/login';
    switch (user.value.role) {
      case 'cuisine':
        return '/kitchen';
      case 'caisse':
        return '/caisse';
      case 'gerant':
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    role,
    hasRole,
    setSession,
    logout,
    initials,
    defaultRouteForRole,
  };
});
