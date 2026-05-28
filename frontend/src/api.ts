import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor : attache automatiquement le JWT à chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ak_resto_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor : logout automatique en cas de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ak_resto_token');
      localStorage.removeItem('ak_resto_user');
      if (!window.location.pathname.startsWith('/staff/login')) {
        window.location.href = '/staff/login?expired=1';
      }
    }
    return Promise.reject(error);
  },
);

// ========== Menu (public) ==========

export async function fetchMenu(tableNumero: string, signature?: string) {
  const params = signature ? { sig: signature } : {};
  const { data } = await api.get(`/menu/public/${tableNumero}`, { params });
  return data;
}

// ========== Orders ==========

export async function createOrder(payload: {
  table_id: string;
  items: Array<{ item_id: string; quantite: number; options?: Record<string, string>; notes?: string }>;
  notes?: string;
}) {
  const { data } = await api.post('/orders', payload);
  return data;
}

export async function fetchOrder(id: string) {
  const { data } = await api.get(`/orders/${id}`);
  return data;
}

export async function fetchActiveOrders() {
  const { data } = await api.get('/orders');
  return data;
}

export async function updateOrderStatus(id: string, statut: string) {
  const { data } = await api.patch(`/orders/${id}/status`, { statut });
  return data;
}

// ========== Payments ==========

export type PaymentMethod = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'carte' | 'especes';

export async function recordPayment(payload: {
  order_id: string;
  methode: PaymentMethod;
  montant_fcfa: number;
  client_telephone?: string;
}) {
  const { data } = await api.post('/payments', payload);
  return data as { payment: any; order: any };
}

// ========== Admin ==========

export interface AdminTable {
  id: string;
  numero: string;
  capacite: number;
  zone: string | null;
  statut: string;
  signed_path: string;
}

export async function fetchAdminTables() {
  const { data } = await api.get('/admin/tables');
  return data as AdminTable[];
}

export async function regenerateTableQR(id: string) {
  const { data } = await api.post(`/admin/tables/${id}/regen-qr`);
  return data as { id: string; numero: string; signed_path: string };
}

// ========== Admin · Stats ==========

export interface AdminStats {
  kpis: {
    ca_fcfa: number;
    transactions: number;
    ticket_moyen_fcfa: number;
    plats_vendus: number;
    delta_ca_pct: number | null;
    delta_transactions: number;
    delta_plats: number;
  };
  hourly: Array<{ heure: number; ca: number; nb: number }>;
  top_items: Array<{ id: string; nom: string; ventes: number; ca: number }>;
  payments_by_method: Array<{ methode: string; nb: number; total: number }>;
}

export async function fetchTodayStats() {
  const { data } = await api.get('/admin/stats/today');
  return data as AdminStats;
}

// ========== Admin · Menu CRUD ==========

export interface AdminItem {
  id: string;
  category_id: string;
  nom: string;
  description: string | null;
  prix_fcfa: number;
  disponible: boolean;
  temps_prep_minutes: number;
  est_vedette: boolean;
  tags: string[];
  ordre: number;
  image_url: string | null;
}

export interface AdminCategory {
  id: string;
  nom: string;
  icone: string | null;
  ordre: number;
  active: boolean;
}

export async function fetchAdminMenu() {
  const { data } = await api.get('/admin/menu');
  return data as { categories: AdminCategory[]; items: AdminItem[] };
}

export async function createMenuItem(dto: Partial<AdminItem> & { category_id: string; nom: string; prix_fcfa: number }) {
  const { data } = await api.post('/admin/menu/items', dto);
  return data as AdminItem;
}

export async function updateMenuItem(id: string, dto: Partial<AdminItem>) {
  const { data } = await api.patch(`/admin/menu/items/${id}`, dto);
  return data as AdminItem;
}

export async function deleteMenuItem(id: string) {
  const { data } = await api.delete(`/admin/menu/items/${id}`);
  return data;
}

export async function createCategory(dto: { nom: string; icone?: string; ordre?: number }) {
  const { data } = await api.post('/admin/menu/categories', dto);
  return data as AdminCategory;
}

export async function updateCategory(id: string, dto: Partial<AdminCategory>) {
  const { data } = await api.patch(`/admin/menu/categories/${id}`, dto);
  return data as AdminCategory;
}

export async function deleteCategory(id: string) {
  const { data } = await api.delete(`/admin/menu/categories/${id}`);
  return data;
}

// ========== Auth ==========

export async function fetchStaff() {
  const { data } = await api.get('/auth/staff');
  return data as Array<{ id: string; nom: string; prenom: string; role: string }>;
}

export async function loginPin(user_id: string, pin: string) {
  const { data } = await api.post('/auth/login-pin', { user_id, pin });
  return data as { token: string; user: { id: string; nom: string; prenom: string; role: string } };
}

// ========== Helpers ==========

export function formatFCFA(n: number): string {
  return new Intl.NumberFormat('fr-CI').format(n) + ' F';
}
