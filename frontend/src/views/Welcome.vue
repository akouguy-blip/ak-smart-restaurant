<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center">
    <div class="serif text-7xl tracking-[0.2em] text-ak-gold mb-2">AK</div>
    <div class="text-xs text-ak-mute tracking-[0.3em] uppercase mb-12">Smart Restaurant</div>

    <div class="card bg-ak-card border border-ak-border rounded-2xl px-8 py-7 mb-10 w-full max-w-xs">
      <div class="text-[10px] text-ak-mute uppercase tracking-[0.2em] mb-3">Vous êtes à</div>
      <div class="serif text-5xl text-ak-gold mb-1">
        Table {{ data?.table?.numero || numero }}
      </div>
      <div class="text-sm text-ak-mute mt-1">
        {{ data?.table?.zone || 'Salle' }} · {{ data?.restaurant?.nom || '…' }}
      </div>
    </div>

    <button
      @click="goMenu"
      class="bg-ak-gold text-ak-bg font-medium px-10 py-3.5 rounded-full text-sm tracking-wide"
    >
      Découvrir le menu
    </button>

    <p class="mt-10 text-xs text-ak-mute max-w-[260px] leading-relaxed">
      Commandez directement depuis votre téléphone. La cuisine est notifiée en temps réel.
    </p>

    <div v-if="error" class="mt-6 text-xs text-red-400">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchMenu } from '../api';
import { cacheMenu, getCachedMenu } from '../db';

const route = useRoute();
const router = useRouter();
const numero = route.params.numero as string;
const data = ref<any>(null);
const error = ref<string>('');

onMounted(async () => {
  try {
    data.value = await fetchMenu(numero);
    await cacheMenu(numero, data.value);
  } catch (err: any) {
    const cached = await getCachedMenu(numero);
    if (cached) {
      data.value = cached;
    } else {
      error.value = err?.response?.data?.message || 'Impossible de charger le menu';
    }
  }
});

function goMenu() {
  router.push({ name: 'menu', params: { numero } });
}
</script>
