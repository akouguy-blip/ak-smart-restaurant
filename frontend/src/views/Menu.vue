<template>
  <div class="min-h-screen pb-28">
    <!-- Header -->
    <header class="sticky top-0 bg-ak-bg/95 backdrop-blur border-b border-ak-border z-10">
      <div class="px-5 pt-4 pb-3 flex items-center justify-between">
        <div>
          <div class="serif text-lg text-ak-gold">
            AK · {{ data?.restaurant?.nom || '…' }}
          </div>
          <div class="text-[11px] text-ak-mute mt-0.5">
            Table {{ data?.table?.numero }} · {{ data?.table?.zone }}
          </div>
        </div>
        <div class="text-[11px] text-ak-mute">
          {{ filteredItems.length }} plat<span v-if="filteredItems.length > 1">s</span>
        </div>
      </div>

      <!-- Onglets de catégorie -->
      <div class="px-5 pb-4 flex gap-2 overflow-x-auto scrollbar-none">
        <button
          v-for="cat in data?.categories || []"
          :key="cat.id"
          @click="activeCat = cat.id"
          class="px-4 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors"
          :class="
            activeCat === cat.id
              ? 'bg-ak-gold text-ak-bg border-ak-gold font-medium'
              : 'border-ak-border text-ak-cream/80 hover:border-ak-gold-dim'
          "
        >
          {{ cat.nom }}
        </button>
      </div>
    </header>

    <!-- Liste des plats -->
    <main class="px-5 pt-4 space-y-3">
      <article
        v-for="item in filteredItems"
        :key="item.id"
        class="bg-ak-card border border-ak-border rounded-xl p-4 flex gap-3"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-medium text-ak-cream">{{ item.nom }}</h3>
            <span
              v-if="item.est_vedette"
              class="text-[9px] text-ak-gold border border-ak-gold/50 px-1.5 py-0.5 rounded tracking-wider"
            >★ TOP</span>
          </div>
          <p
            v-if="item.description"
            class="text-xs text-ak-mute mt-1 line-clamp-2 leading-relaxed"
          >
            {{ item.description }}
          </p>
          <div class="flex items-center gap-3 mt-3">
            <span class="serif text-lg text-ak-gold">{{ formatFCFA(item.prix_fcfa) }}</span>
            <span class="text-ak-mute text-xs">·</span>
            <span class="text-[11px] text-ak-mute">{{ item.temps_prep_minutes }} min</span>
          </div>
        </div>
        <button
          @click="addItem(item)"
          class="self-start bg-ak-gold text-ak-bg w-9 h-9 rounded-full text-xl leading-none font-medium flex items-center justify-center"
          aria-label="Ajouter au panier"
        >
          +
        </button>
      </article>

      <div v-if="!loading && filteredItems.length === 0" class="text-center py-16 text-ak-mute">
        Aucun plat dans cette catégorie
      </div>
    </main>

    <!-- Panier flottant -->
    <transition name="fade">
      <div
        v-if="cart.count > 0"
        class="fixed bottom-0 left-0 right-0 px-5 py-4 bg-ak-bg/95 backdrop-blur border-t border-ak-border"
      >
        <button
          @click="goCart"
          class="w-full bg-ak-gold text-ak-bg font-medium py-3 rounded-full flex items-center justify-between px-6"
        >
          <span class="text-sm">Voir le panier ({{ cart.count }})</span>
          <span class="serif text-base">{{ formatFCFA(cart.total) }}</span>
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchMenu, formatFCFA } from '../api';
import { cacheMenu, getCachedMenu } from '../db';
import { useCart } from '../stores/cart';

const route = useRoute();
const router = useRouter();
const cart = useCart();
const numero = route.params.numero as string;

const data = ref<any>(null);
const activeCat = ref<string | null>(null);
const loading = ref(true);

const filteredItems = computed<any[]>(() => {
  const items = data.value?.items || [];
  return activeCat.value
    ? items.filter((i: any) => i.category_id === activeCat.value)
    : items;
});

function addItem(item: any) {
  cart.add({
    item_id: item.id,
    nom: item.nom,
    prix_fcfa: item.prix_fcfa,
  });
}

function goCart() {
  router.push({ name: 'cart', params: { numero } });
}

onMounted(async () => {
  try {
    const fresh = await fetchMenu(numero);
    data.value = fresh;
    await cacheMenu(numero, fresh);
  } catch {
    const cached = await getCachedMenu(numero);
    if (cached) data.value = cached;
  } finally {
    loading.value = false;
    if (data.value?.categories?.[0]) {
      activeCat.value = data.value.categories[0].id;
    }
  }
});
</script>
