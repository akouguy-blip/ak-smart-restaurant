<template>
  <div class="min-h-screen pb-28">
    <header class="sticky top-0 bg-ak-bg/95 backdrop-blur border-b border-ak-border z-10 px-5 py-4 flex items-center gap-4">
      <button @click="$router.back()" class="text-2xl text-ak-cream leading-none" aria-label="Retour">‹</button>
      <div>
        <div class="serif text-lg text-ak-gold">Votre commande</div>
        <div class="text-[11px] text-ak-mute mt-0.5">Table {{ numero }}</div>
      </div>
    </header>

    <main class="px-5 pt-4">
      <div v-if="cart.items.length === 0" class="text-center py-20 text-ak-mute">
        <div class="text-4xl mb-3 opacity-40">∅</div>
        <p>Votre panier est vide</p>
        <button
          @click="$router.push({ name: 'menu', params: { numero } })"
          class="mt-6 text-sm text-ak-gold underline underline-offset-4"
        >
          Voir le menu
        </button>
      </div>

      <article
        v-for="item in cart.items"
        :key="item.item_id"
        class="bg-ak-card border border-ak-border rounded-xl p-4 mb-3 flex items-center gap-3"
      >
        <div class="flex-1 min-w-0">
          <div class="font-medium text-ak-cream truncate">{{ item.nom }}</div>
          <div class="serif text-lg text-ak-gold mt-1">
            {{ formatFCFA(item.prix_fcfa * item.quantite) }}
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="cart.changeQty(item.item_id, -1)"
            class="w-8 h-8 rounded-full border border-ak-border text-ak-cream"
            aria-label="Diminuer"
          >−</button>
          <span class="font-medium text-ak-cream w-4 text-center">{{ item.quantite }}</span>
          <button
            @click="cart.changeQty(item.item_id, 1)"
            class="w-8 h-8 rounded-full border border-ak-border text-ak-cream"
            aria-label="Augmenter"
          >+</button>
        </div>
      </article>

      <div
        v-if="cart.items.length > 0"
        class="bg-ak-card border border-ak-border rounded-xl p-5 mt-6"
      >
        <div class="flex justify-between text-sm mb-2 text-ak-cream">
          <span class="text-ak-mute">Sous-total</span>
          <span>{{ formatFCFA(cart.total) }}</span>
        </div>
        <div class="flex justify-between text-xs mb-3">
          <span class="text-ak-mute">TVA 18% incluse</span>
          <span class="text-ak-mute">{{ formatFCFA(tvaPart) }}</span>
        </div>
        <div class="border-t border-ak-border pt-3 flex justify-between items-baseline">
          <span class="font-medium text-ak-cream text-sm">Total</span>
          <span class="serif text-2xl text-ak-gold">{{ formatFCFA(cart.total) }}</span>
        </div>
      </div>

      <div v-if="error" class="mt-4 text-sm text-red-400">{{ error }}</div>
    </main>

    <div
      v-if="cart.items.length > 0"
      class="fixed bottom-0 left-0 right-0 px-5 py-4 bg-ak-bg/95 backdrop-blur border-t border-ak-border"
    >
      <button
        @click="submit"
        :disabled="submitting"
        class="w-full bg-ak-gold text-ak-bg font-medium py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="submitting">Envoi en cours…</span>
        <span v-else>Commander · {{ formatFCFA(cart.total) }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { createOrder, fetchMenu, formatFCFA } from '../api';
import { getCachedMenu } from '../db';
import { useCart } from '../stores/cart';

const route = useRoute();
const router = useRouter();
const cart = useCart();
const numero = route.params.numero as string;

const submitting = ref(false);
const error = ref<string>('');

const tvaPart = computed(() => Math.round((cart.total * 18) / 118));

async function submit() {
  if (cart.items.length === 0 || submitting.value) return;
  submitting.value = true;
  error.value = '';
  try {
    // Récupérer le table_id (cache puis API)
    let menu = await getCachedMenu(numero);
    if (!menu) menu = await fetchMenu(numero);

    const order = await createOrder({
      table_id: menu.table.id,
      items: cart.items.map((i) => ({
        item_id: i.item_id,
        quantite: i.quantite,
      })),
    });

    cart.clear();
    router.push({ name: 'order', params: { id: order.id } });
  } catch (err: any) {
    error.value = err?.response?.data?.message || err.message || 'Erreur lors de l\'envoi';
  } finally {
    submitting.value = false;
  }
}
</script>
