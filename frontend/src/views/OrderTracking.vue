<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
    <div v-if="!order" class="text-ak-mute">Chargement…</div>

    <template v-else>
      <div class="text-5xl mb-5">{{ statusEmoji }}</div>
      <h1 class="serif text-3xl text-ak-gold mb-1">
        Commande #{{ order.numero_court }}
      </h1>
      <p class="text-sm text-ak-mute mb-8 max-w-xs">{{ statusLabel }}</p>

      <!-- Stepper -->
      <div class="flex items-center gap-2 mb-10">
        <div
          v-for="(s, idx) in steps"
          :key="s.key"
          class="flex items-center"
        >
          <div
            class="w-2 h-2 rounded-full transition-colors"
            :class="reachedStep(s.key) ? 'bg-ak-gold' : 'bg-ak-border'"
          ></div>
          <div
            v-if="idx < steps.length - 1"
            class="w-8 h-px"
            :class="reachedStep(steps[idx + 1].key) ? 'bg-ak-gold' : 'bg-ak-border'"
          ></div>
        </div>
      </div>

      <!-- Récap -->
      <div class="bg-ak-card border border-ak-border rounded-xl w-full max-w-sm p-5 mb-6 text-left">
        <div
          v-for="item in order.items"
          :key="item.id"
          class="flex justify-between py-2 border-b border-ak-border last:border-none text-sm"
        >
          <span class="text-ak-cream">{{ item.quantite }}× {{ item.nom_snapshot }}</span>
          <span class="text-ak-mute">{{ formatFCFA(item.prix_unitaire_fcfa * item.quantite) }}</span>
        </div>
        <div class="flex justify-between pt-3 mt-1 items-baseline">
          <span class="text-sm font-medium text-ak-cream">Total</span>
          <span class="serif text-xl text-ak-gold">{{ formatFCFA(order.total_fcfa) }}</span>
        </div>
      </div>

      <button
        @click="goHome"
        class="text-xs text-ak-mute hover:text-ak-gold tracking-wide"
      >
        ← Retour au menu
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { io, Socket } from 'socket.io-client';
import { fetchOrder, formatFCFA } from '../api';

const route = useRoute();
const router = useRouter();
const order = ref<any>(null);
let socket: Socket | null = null;

const steps = [
  { key: 'nouvelle', label: 'Reçue' },
  { key: 'en_cuisine', label: 'En cuisine' },
  { key: 'prete', label: 'Prête' },
  { key: 'servie', label: 'Servie' },
  { key: 'payee', label: 'Payée' },
];

const statusMap: Record<string, { emoji: string; label: string }> = {
  nouvelle: { emoji: '📝', label: 'Commande reçue, la cuisine va commencer.' },
  en_cuisine: { emoji: '👨‍🍳', label: 'Vos plats sont en préparation.' },
  presque_prete: { emoji: '⏳', label: 'Presque prête.' },
  prete: { emoji: '🛎️', label: 'Prête à être servie.' },
  servie: { emoji: '🍽️', label: 'Servie. Bon appétit !' },
  payee: { emoji: '✓', label: 'Payée. Merci de votre visite.' },
};

const statusEmoji = computed(() => statusMap[order.value?.statut]?.emoji || '⋯');
const statusLabel = computed(() => statusMap[order.value?.statut]?.label || '…');

function reachedStep(key: string): boolean {
  if (!order.value) return false;
  const orderIdx = steps.findIndex((s) => s.key === order.value.statut);
  const stepIdx = steps.findIndex((s) => s.key === key);
  return stepIdx >= 0 && orderIdx >= stepIdx;
}

function goHome() {
  if (order.value?.table_numero) {
    router.push({ name: 'menu', params: { numero: order.value.table_numero } });
  } else {
    router.push('/');
  }
}

onMounted(async () => {
  const id = route.params.id as string;
  order.value = await fetchOrder(id);

  // WebSocket pour mise à jour temps réel
  socket = io({ path: '/socket.io' });
  socket.on('order:update', (updated: any) => {
    if (updated.id === id) order.value = updated;
  });
});

onUnmounted(() => {
  socket?.disconnect();
});
</script>
