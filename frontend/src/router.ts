import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from './stores/auth';

const routes = [
  { path: '/', redirect: '/t/07' },

  // ====== Routes publiques (clients) ======
  {
    path: '/t/:numero',
    name: 'welcome',
    component: () => import('./views/Welcome.vue'),
  },
  {
    path: '/t/:numero/menu',
    name: 'menu',
    component: () => import('./views/Menu.vue'),
  },
  {
    path: '/t/:numero/cart',
    name: 'cart',
    component: () => import('./views/Cart.vue'),
  },
  {
    path: '/order/:id',
    name: 'order',
    component: () => import('./views/OrderTracking.vue'),
  },

  // ====== Authentification staff ======
  {
    path: '/staff/login',
    name: 'staff-login',
    component: () => import('./views/StaffLogin.vue'),
  },

  // ====== Routes protégées (staff) ======
  {
    path: '/kitchen',
    name: 'kitchen',
    component: () => import('./views/Kitchen.vue'),
    meta: { requiresAuth: true, roles: ['cuisine', 'caisse', 'gerant', 'admin'] },
  },
  {
    path: '/caisse',
    name: 'caisse',
    component: () => import('./views/Caisse.vue'),
    meta: { requiresAuth: true, roles: ['caisse', 'gerant', 'admin'] },
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard',
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('./views/AdminDashboard.vue'),
    meta: { requiresAuth: true, roles: ['gerant', 'admin'] },
  },
  {
    path: '/admin/menus',
    name: 'admin-menus',
    component: () => import('./views/MenuAdmin.vue'),
    meta: { requiresAuth: true, roles: ['gerant', 'admin'] },
  },
  {
    path: '/admin/tables',
    name: 'admin-tables',
    component: () => import('./views/TablesQR.vue'),
    meta: { requiresAuth: true, roles: ['gerant', 'admin'] },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard : redirige vers le login si non authentifié ou rôle insuffisant
router.beforeEach((to, _from, next) => {
  if (!to.meta.requiresAuth) return next();

  const auth = useAuth();
  if (!auth.isAuthenticated) {
    return next({ name: 'staff-login', query: { redirect: to.fullPath } });
  }

  const allowedRoles = to.meta.roles as string[] | undefined;
  if (allowedRoles && !auth.hasRole(allowedRoles)) {
    return next(auth.defaultRouteForRole());
  }

  next();
});

export default router;
