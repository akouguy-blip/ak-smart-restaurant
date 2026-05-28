<template>
  <div class="min-h-screen bg-ak-bg">
    <!-- Header -->
    <header class="border-b border-ak-border px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="serif text-2xl text-ak-gold tracking-[0.2em]">AK</div>
        <div class="h-6 w-px bg-ak-border"></div>
        <div>
          <div class="text-sm font-medium text-ak-cream">Cuisine</div>
          <div class="text-[11px] text-ak-mute mt-0.5 flex items-center gap-1.5">
            <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
            En direct · {{ now }}
          </div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <div class="text-xs font-medium text-ak-cream">
            {{ auth.user?.prenom || '' }} {{ auth.user?.nom || '' }}
          </div>
          <div class="text-[10px] text-ak-mute capitalize">
            {{ auth.user?.role || '' }}
          </div>
        </div>
        <div class="w-9 h-9 rounded-full border border-ak-gold/60 bg-ak-card text-ak-gold flex items-center justify-center text-xs font-medium">
          {{ auth.initials() }}
        </div>
        <button
          @click="onLogout"
          class="text-[10px] text-ak-mute hover:text-ak-cream tracking-wider uppercase"
          aria-label="Déconnexion"
        >Sortir</button>
      </div>
    </header>

    <!-- Filtres -->
    <div class="px-6 py-3 flex gap-2 border-b border-ak-border bg-ak-card/30">
      <button
        v-for="f in filters"
        :key="f.key"
        @click="activeFilter = f.key"
        class="px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors flex items-center gap-2"
        :class="
          activeFilter === f.key
            ? 'bg-ak-card text-ak-gold border border-ak-gold/40'
            : 'text-ak-mute hover:text-ak-cream border border-transparent'
        "
      >
        <span>{{ f.label }}</span>
        <span
          class="text-[10px] px-1.5 py-0.5 rounded"
          :class="activeFilter === f.key ? 'bg-ak-gold text-ak-bg' : 'bg-ak-border text-ak-mute'"
        >{{ countFor(f.key) }}</span>
      </button>
    </div>

    <!-- Grille de commandes -->
    <main class="p-6">
      <div v-if="loading" class="text-center py-20 text-ak-mute">Chargement…</div>
      <div v-else-if="filteredOrders.length === 0" class="text-center py-20 text-ak-mute">
        <div class="text-4xl mb-3 opacity-30">∅</div>
        <p class="text-sm">Aucune commande dans cette catégorie</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <article
          v-for="order in filteredOrders"
          :key="order.id"
          class="bg-ak-card rounded-xl border-2 transition-all"
          :class="urgencyBorder(order)"
        >
          <!-- Card header -->
          <header class="px-4 pt-4 pb-3 border-b border-ak-border flex items-start justify-between">
            <div>
              <div class="serif text-2xl text-ak-gold leading-none">
                #{{ order.numero_court }}
              </div>
              <div class="text-[11px] text-ak-mute mt-1.5">
                Table {{ order.table_numero }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-medium" :class="urgencyText(order)">
                {{ elapsedLabel(order) }}
              </div>
              <div
                class="mt-1.5 inline-block text-[9px] tracking-widest font-medium px-2 py-0.5 rounded uppercase"
                :class="statusBadgeClass[order.statut]"
              >
                {{ statusLabels[order.statut] || order.statut }}
              </div>
            </div>
          </header>

          <!-- Items list -->
          <div class="px-4 py-3 space-y-2">
            <div
              v-for="item in order.items"
              :key="item.id"
              class="flex items-start gap-3"
            >
              <span class="serif text-ak-gold text-base leading-none mt-0.5">
                {{ item.quantite }}×
              </span>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-ak-cream">{{ item.nom_snapshot }}</div>
                <div
                  v-if="hasOptions(item)"
                  class="text-[11px] text-ak-mute mt-0.5"
                >
                  <span
                    v-for="(value, key) in item.options"
                    :key="key"
                    class="inline-block mr-2"
                  >· {{ value }}</span>
                </div>
                <div
                  v-if="item.notes"
                  class="text-[11px] text-amber-400/80 mt-0.5 italic"
                >
                  Note : {{ item.notes }}
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <footer class="px-4 py-3 border-t border-ak-border flex gap-2">
            <button
              v-if="order.statut === 'nouvelle'"
              @click="transition(order, 'en_cuisine')"
              :disabled="busy.has(order.id)"
              class="flex-1 bg-ak-gold text-ak-bg font-medium text-sm py-2 rounded disabled:opacity-50"
            >
              Démarrer la cuisson
            </button>

            <button
              v-else-if="order.statut === 'en_cuisine'"
              @click="transition(order, 'prete')"
              :disabled="busy.has(order.id)"
              class="flex-1 bg-ak-gold text-ak-bg font-medium text-sm py-2 rounded disabled:opacity-50"
            >
              Marquer prête
            </button>

            <div
              v-else-if="order.statut === 'prete'"
              class="flex-1 text-center text-xs text-ak-mute py-2 italic"
            >
              En attente du serveur…
            </div>
          </footer>
        </article>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { io, Socket } from 'socket.io-client';
import { fetchActiveOrders, updateOrderStatus } from '../api';
import { useAuth } from '../stores/auth';

const router = useRouter();
const auth = useAuth();

const orders = ref<any[]>([]);
const loading = ref(true);
const busy = ref(new Set<string>());
const activeFilter = ref('all');
const now = ref(currentTime());
let socket: Socket | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function onLogout() {
  auth.logout();
  socket?.disconnect();
  router.push({ name: 'staff-login' });
}

const statusLabels: Record<string, string> = {
  nouvelle: 'Nouvelle',
  en_cuisine: 'En cuisine',
  presque_prete: 'Presque prête',
  prete: 'Prête',
};

const filters = [
  { key: 'all', label: 'Toutes' },
  { key: 'nouvelle', label: 'Nouvelles' },
  { key: 'en_cuisine', label: 'En cuisine' },
  { key: 'prete', label: 'Prêtes' },
];

const filteredOrders = computed(() => {
  if (activeFilter.value === 'all') return orders.value;
  return orders.value.filter((o: any) => o.statut === activeFilter.value);
});

function countFor(key: string): number {
  if (key === 'all') return orders.value.length;
  return orders.value.filter((o: any) => o.statut === key).length;
}

function currentTime(): string {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function elapsedMinutes(order: any): number {
  const start = new Date(order.cree_at).getTime();
  return Math.floor((Date.now() - start) / 60000);
}

function elapsedLabel(order: any): string {
  const m = elapsedMinutes(order);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

// Couleurs d'urgence selon le temps écoulé
function urgencyBorder(order: any): string {
  const m = elapsedMinutes(order);
  if (m >= 15) return 'border-red-500/70';
  if (m >= 10) return 'border-amber-500/60';
  if (order.statut === 'en_cuisine') return 'border-blue-500/40';
  if (order.statut === 'prete') return 'border-green-500/50';
  return 'border-ak-gold/40';
}

function urgencyText(order: any): string {
  const m = elapsedMinutes(order);
  if (m >= 15) return 'text-red-400';
  if (m >= 10) return 'text-amber-400';
  return 'text-ak-mute';
}

const statusBadgeClass: Record<string, string> = {
  nouvelle: 'bg-ak-gold/10 text-ak-gold border border-ak-gold/30',
  en_cuisine: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  presque_prete: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  prete: 'bg-green-500/10 text-green-400 border border-green-500/30',
};

function hasOptions(item: any): boolean {
  return item.options && typeof item.options === 'object' && Object.keys(item.options).length > 0;
}

async function transition(order: any, statut: string) {
  if (busy.value.has(order.id)) return;
  busy.value.add(order.id);
  try {
    const updated = await updateOrderStatus(order.id, statut);
    upsertOrder(updated);
  } catch (err) {
    console.error('Transition failed', err);
  } finally {
    busy.value.delete(order.id);
  }
}

function upsertOrder(order: any) {
  // Retirer les commandes hors workflow cuisine
  if (['servie', 'payee', 'annulee'].includes(order.statut)) {
    orders.value = orders.value.filter((o) => o.id !== order.id);
    return;
  }
  const idx = orders.value.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders.value[idx] = order;
  } else {
    // Nouvelle commande → en tête de liste
    orders.value = [order, ...orders.value];
  }
}

onMounted(async () => {
  try {
    orders.value = await fetchActiveOrders();
  } catch (err) {
    console.error('Failed to load orders', err);
  } finally {
    loading.value = false;
  }

  // WebSocket
  socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  socket.on('order:new', (order: any) => upsertOrder(order));
  socket.on('order:update', (order: any) => upsertOrder(order));

  // Refresh horloge + recompute des "elapsed" toutes les 30s
  timer = setInterval(() => {
    now.value = currentTime();
    // Trigger reactivity pour recalcul des elapsed labels
    orders.value = [...orders.value];
  }, 30000);
});

onUnmounted(() => {
  socket?.disconnect();
  if (timer) clearInterval(timer);
});
</script>
