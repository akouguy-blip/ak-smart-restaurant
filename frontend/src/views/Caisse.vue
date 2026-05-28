<template>
  <div class="min-h-screen bg-ak-bg">
    <!-- Header -->
    <header class="border-b border-ak-border px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="serif text-2xl text-ak-gold tracking-[0.2em]">AK</div>
        <div class="h-6 w-px bg-ak-border"></div>
        <div>
          <div class="text-sm font-medium text-ak-cream">Caisse</div>
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
        >Sortir</button>
      </div>
    </header>

    <!-- Toast succès -->
    <transition name="fade">
      <div
        v-if="successMessage"
        class="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500/10 border border-green-500/50 text-green-400 px-5 py-2.5 rounded-lg text-sm"
      >
        ✓ {{ successMessage }}
      </div>
    </transition>

    <!-- Layout deux colonnes -->
    <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 p-6">

      <!-- Colonne gauche : commandes à encaisser -->
      <section>
        <div class="flex items-baseline justify-between mb-3">
          <h2 class="text-xs text-ak-mute uppercase tracking-wider">À encaisser</h2>
          <span class="text-[11px] text-ak-mute">{{ sortedOrders.length }} table<span v-if="sortedOrders.length > 1">s</span></span>
        </div>

        <div v-if="loading" class="text-center py-12 text-ak-mute text-sm">Chargement…</div>

        <div v-else-if="sortedOrders.length === 0" class="bg-ak-card/30 border border-ak-border border-dashed rounded-xl p-8 text-center text-ak-mute">
          <div class="text-4xl mb-3 opacity-30">∅</div>
          <p class="text-sm">Aucune commande en attente</p>
        </div>

        <div v-else class="space-y-2">
          <button
            v-for="order in sortedOrders"
            :key="order.id"
            @click="selectedId = order.id"
            class="w-full text-left bg-ak-card border rounded-xl p-4 transition-colors"
            :class="
              selectedId === order.id
                ? 'border-ak-gold'
                : 'border-ak-border hover:border-ak-gold-dim'
            "
          >
            <div class="flex items-baseline justify-between">
              <div class="serif text-lg text-ak-gold">#{{ order.numero_court }}</div>
              <div
                class="text-[9px] tracking-widest font-medium px-2 py-0.5 rounded uppercase"
                :class="statusBadge[order.statut]"
              >{{ statusLabel[order.statut] }}</div>
            </div>
            <div class="text-sm text-ak-cream mt-1.5">
              Table {{ order.table_numero }}
              <span class="text-ak-mute text-xs">· {{ itemsCount(order) }} article<span v-if="itemsCount(order) > 1">s</span></span>
            </div>
            <div class="flex items-baseline justify-between mt-2">
              <div class="serif text-lg text-ak-gold">{{ formatFCFA(order.total_fcfa) }}</div>
              <div class="text-[10px] text-ak-mute">{{ elapsedLabel(order) }}</div>
            </div>
          </button>
        </div>
      </section>

      <!-- Colonne droite : ticket + paiement -->
      <section v-if="selected" class="bg-ak-card border border-ak-border rounded-xl">
        <header class="px-6 pt-5 pb-4 border-b border-ak-border flex items-baseline justify-between">
          <div>
            <div class="serif text-2xl text-ak-gold">Commande #{{ selected.numero_court }}</div>
            <div class="text-sm text-ak-mute mt-1">
              Table {{ selected.table_numero }} · {{ elapsedLabel(selected) }}
            </div>
          </div>
          <div
            class="text-[9px] tracking-widest font-medium px-2 py-0.5 rounded uppercase"
            :class="statusBadge[selected.statut]"
          >{{ statusLabel[selected.statut] }}</div>
        </header>

        <!-- Lignes -->
        <div class="px-6 py-4 space-y-2 max-h-[40vh] overflow-y-auto">
          <div
            v-for="item in selected.items"
            :key="item.id"
            class="flex items-start justify-between gap-3 text-sm"
          >
            <div class="flex-1 min-w-0">
              <div class="text-ak-cream">
                <span class="serif text-ak-gold mr-2">{{ item.quantite }}×</span>
                {{ item.nom_snapshot }}
              </div>
              <div v-if="hasOptions(item)" class="text-[11px] text-ak-mute pl-7 mt-0.5">
                <span v-for="(v, k) in item.options" :key="k" class="inline-block mr-2">· {{ v }}</span>
              </div>
            </div>
            <div class="text-ak-mute whitespace-nowrap">
              {{ formatFCFA(item.prix_unitaire_fcfa * item.quantite) }}
            </div>
          </div>
        </div>

        <!-- Totaux -->
        <div class="px-6 py-4 border-t border-ak-border space-y-1">
          <div class="flex justify-between text-sm">
            <span class="text-ak-mute">Sous-total</span>
            <span class="text-ak-cream">{{ formatFCFA(selected.sous_total_fcfa) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-ak-mute">TVA 18% incluse</span>
            <span class="text-ak-mute">{{ formatFCFA(selected.tva_fcfa) }}</span>
          </div>
          <div class="flex justify-between items-baseline pt-3 mt-2 border-t border-ak-border">
            <span class="text-sm font-medium text-ak-cream">Total à encaisser</span>
            <span class="serif text-3xl text-ak-gold">{{ formatFCFA(selected.total_fcfa) }}</span>
          </div>
        </div>

        <!-- Transition prête → servie (raccourci pour la caissière) -->
        <div v-if="selected.statut === 'prete'" class="px-6 pb-4">
          <button
            @click="markServed(selected)"
            :disabled="transitioning"
            class="w-full border border-ak-border hover:border-ak-gold-dim rounded-lg py-2 text-sm text-ak-cream disabled:opacity-50"
          >
            Marquer comme servie
          </button>
        </div>

        <!-- Sélecteur de méthode de paiement -->
        <div class="px-6 pb-4">
          <div class="text-[10px] text-ak-mute uppercase tracking-widest mb-3">Mode de paiement</div>
          <div class="grid grid-cols-3 gap-2 mb-2">
            <button
              v-for="m in methods"
              :key="m.key"
              @click="paymentMethod = m.key"
              class="border rounded-lg py-2.5 text-xs transition-colors"
              :class="
                paymentMethod === m.key
                  ? 'bg-ak-bg border-ak-gold text-ak-gold font-medium'
                  : 'border-ak-border text-ak-cream hover:border-ak-gold-dim'
              "
            >{{ m.label }}</button>
          </div>
        </div>

        <!-- Bouton encaisser -->
        <div class="px-6 pb-6">
          <button
            @click="pay"
            :disabled="!paymentMethod || paying"
            class="w-full bg-ak-gold text-ak-bg font-medium py-3.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="paying">Encaissement en cours…</span>
            <span v-else-if="!paymentMethod">Choisir un mode de paiement</span>
            <span v-else>Encaisser {{ formatFCFA(selected.total_fcfa) }} · {{ methodLabel(paymentMethod) }}</span>
          </button>
          <div v-if="error" class="mt-3 text-xs text-red-400 text-center">{{ error }}</div>
        </div>
      </section>

      <!-- Placeholder colonne droite -->
      <section
        v-else
        class="bg-ak-card/20 border border-ak-border border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]"
      >
        <div class="serif text-5xl text-ak-mute/30 mb-3">←</div>
        <p class="text-sm text-ak-mute">Sélectionnez une commande à encaisser</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { io, Socket } from 'socket.io-client';
import { fetchActiveOrders, updateOrderStatus, recordPayment, formatFCFA, type PaymentMethod } from '../api';
import { useAuth } from '../stores/auth';

const router = useRouter();
const auth = useAuth();

const orders = ref<any[]>([]);
const selectedId = ref<string | null>(null);
const loading = ref(true);
const transitioning = ref(false);
const paying = ref(false);
const paymentMethod = ref<PaymentMethod | null>(null);
const error = ref('');
const successMessage = ref('');
const now = ref(currentTime());
let socket: Socket | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

const methods: Array<{ key: PaymentMethod; label: string }> = [
  { key: 'wave', label: 'Wave' },
  { key: 'orange_money', label: 'Orange' },
  { key: 'mtn_momo', label: 'MTN MoMo' },
  { key: 'carte', label: 'Carte' },
  { key: 'especes', label: 'Espèces' },
];

const statusLabel: Record<string, string> = {
  nouvelle: 'Nouvelle',
  en_cuisine: 'En cuisine',
  presque_prete: 'Presque prête',
  prete: 'Prête',
  servie: 'Servie',
};

const statusBadge: Record<string, string> = {
  nouvelle: 'bg-ak-gold/10 text-ak-gold border border-ak-gold/30',
  en_cuisine: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  presque_prete: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  prete: 'bg-green-500/10 text-green-400 border border-green-500/30',
  servie: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
};

// Priorité d'affichage : servie (prêt à payer) > prete > en_cuisine > nouvelle
const statusPriority: Record<string, number> = {
  servie: 0,
  prete: 1,
  presque_prete: 2,
  en_cuisine: 3,
  nouvelle: 4,
};

const sortedOrders = computed(() => {
  return [...orders.value].sort((a, b) => {
    const pa = statusPriority[a.statut] ?? 99;
    const pb = statusPriority[b.statut] ?? 99;
    if (pa !== pb) return pa - pb;
    // À statut égal, plus ancien d'abord
    return new Date(a.cree_at).getTime() - new Date(b.cree_at).getTime();
  });
});

const selected = computed(() => {
  if (!selectedId.value) return null;
  return orders.value.find((o: any) => o.id === selectedId.value) || null;
});

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
  if (m < 60) return `il y a ${m} min`;
  return `il y a ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
}

function itemsCount(order: any): number {
  return (order.items || []).reduce((s: number, i: any) => s + (i.quantite || 0), 0);
}

function hasOptions(item: any): boolean {
  return item.options && typeof item.options === 'object' && Object.keys(item.options).length > 0;
}

function methodLabel(m: PaymentMethod): string {
  return methods.find((x) => x.key === m)?.label || m;
}

function upsertOrder(order: any) {
  // Retirer les commandes payées/annulées
  if (['payee', 'annulee'].includes(order.statut)) {
    orders.value = orders.value.filter((o) => o.id !== order.id);
    if (selectedId.value === order.id) selectedId.value = null;
    return;
  }
  const idx = orders.value.findIndex((o) => o.id === order.id);
  if (idx >= 0) {
    orders.value[idx] = order;
  } else {
    orders.value = [order, ...orders.value];
  }
}

async function markServed(order: any) {
  if (transitioning.value) return;
  transitioning.value = true;
  try {
    const updated = await updateOrderStatus(order.id, 'servie');
    upsertOrder(updated);
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erreur transition';
  } finally {
    transitioning.value = false;
  }
}

async function pay() {
  if (!selected.value || !paymentMethod.value || paying.value) return;
  paying.value = true;
  error.value = '';
  try {
    const { order: updatedOrder } = await recordPayment({
      order_id: selected.value.id,
      methode: paymentMethod.value,
      montant_fcfa: selected.value.total_fcfa,
    });
    // Afficher feedback
    successMessage.value = `Commande #${updatedOrder.numero_court} encaissée (${formatFCFA(updatedOrder.total_fcfa)})`;
    setTimeout(() => (successMessage.value = ''), 3500);
    // Retirer la commande (déjà fait via order:update en WS, mais on s'assure)
    upsertOrder(updatedOrder);
    paymentMethod.value = null;
  } catch (err: any) {
    error.value = err?.response?.data?.message || err.message || 'Erreur d\'encaissement';
  } finally {
    paying.value = false;
  }
}

function onLogout() {
  auth.logout();
  socket?.disconnect();
  router.push({ name: 'staff-login' });
}

onMounted(async () => {
  try {
    orders.value = await fetchActiveOrders();
  } catch (err) {
    console.error('Failed to load orders', err);
  } finally {
    loading.value = false;
  }

  socket = io({ path: '/socket.io', transports: ['websocket', 'polling'] });
  socket.on('order:new', (order: any) => upsertOrder(order));
  socket.on('order:update', (order: any) => upsertOrder(order));

  timer = setInterval(() => {
    now.value = currentTime();
    orders.value = [...orders.value]; // force recompute des elapsed
  }, 30000);
});

onUnmounted(() => {
  socket?.disconnect();
  if (timer) clearInterval(timer);
});
</script>
