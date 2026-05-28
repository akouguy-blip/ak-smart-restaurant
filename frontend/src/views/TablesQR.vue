<template>
  <AdminLayout>
    <main class="max-w-6xl mx-auto px-6 py-6 print:max-w-none print:p-0 print:m-0">

      <div class="flex items-baseline justify-between mb-6 print:hidden">
        <div>
          <h1 class="serif text-2xl text-ak-gold">QR codes des tables</h1>
          <p class="text-sm text-ak-mute mt-1">
            Imprimez et plastifiez ces placards pour chaque table. Le QR code est signé — invalidé si le secret est régénéré.
          </p>
        </div>
        <button
          @click="doPrint"
          class="bg-ak-gold text-ak-bg px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2"
        >
          <span>🖨</span>
          <span>Imprimer</span>
        </button>
      </div>

      <div v-if="loading" class="text-center py-20 text-ak-mute print:hidden">Génération des QR codes…</div>

      <div
        v-if="!loading"
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-2 gap-4 print:gap-3"
      >
        <article
          v-for="t in tables"
          :key="t.id"
          class="bg-white border border-ak-border print:border-black/15 rounded-2xl print:rounded-xl p-5 flex flex-col items-center text-black break-inside-avoid"
        >
          <div class="serif text-[10px] tracking-[0.35em] text-amber-700 mb-2">
            AK · CHEZ AÏSHA
          </div>

          <div
            class="qr-wrap w-full max-w-[200px] aspect-square mb-3 flex items-center justify-center"
            v-html="qrSvgs[t.id] || ''"
          ></div>

          <div class="serif text-4xl text-black leading-none">
            Table <span class="text-amber-700">{{ t.numero }}</span>
          </div>
          <div class="text-[11px] text-gray-500 mt-1.5">
            {{ t.zone || 'Salle' }} · {{ t.capacite }} couverts
          </div>

          <div class="mt-3 text-center text-[11px] text-gray-600 italic">
            Scannez pour découvrir le menu<br />et passer commande
          </div>

          <button
            @click="regen(t)"
            :disabled="regenerating === t.id"
            class="mt-4 text-[10px] tracking-wider uppercase text-gray-400 hover:text-red-500 disabled:opacity-50 print:hidden border-t border-gray-200 pt-3 w-full"
          >
            {{ regenerating === t.id ? 'Régénération…' : '↻ Régénérer le QR' }}
          </button>
        </article>
      </div>
    </main>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import { fetchAdminTables, regenerateTableQR, type AdminTable } from '../api';
import AdminLayout from '../components/AdminLayout.vue';

const tables = ref<AdminTable[]>([]);
const qrSvgs = ref<Record<string, string>>({});
const loading = ref(true);
const regenerating = ref<string | null>(null);

async function generateQRForTable(t: AdminTable): Promise<string> {
  const fullUrl = `${window.location.origin}${t.signed_path}`;
  return QRCode.toString(fullUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
}

async function regen(t: AdminTable) {
  if (regenerating.value) return;
  const ok = window.confirm(
    `Régénérer le QR de la Table ${t.numero} ?\n\n` +
      `L'ancien QR sera immédiatement invalide. Les clients qui scannent une vieille impression verront une erreur. ` +
      `Pensez à réimprimer le nouveau placard.`,
  );
  if (!ok) return;

  regenerating.value = t.id;
  try {
    const updated = await regenerateTableQR(t.id);
    const idx = tables.value.findIndex((x) => x.id === t.id);
    if (idx >= 0) {
      tables.value[idx] = { ...tables.value[idx], signed_path: updated.signed_path };
      qrSvgs.value[t.id] = await generateQRForTable(tables.value[idx]);
    }
  } catch (err) {
    console.error('Failed to regenerate QR', err);
    alert('Erreur lors de la régénération du QR');
  } finally {
    regenerating.value = null;
  }
}

function doPrint() {
  window.print();
}

onMounted(async () => {
  try {
    tables.value = await fetchAdminTables();
    const entries = await Promise.all(
      tables.value.map(async (t) => [t.id, await generateQRForTable(t)] as const),
    );
    qrSvgs.value = Object.fromEntries(entries);
  } catch (err) {
    console.error('Failed to load tables', err);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.qr-wrap :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 12mm;
  }

  :global(body),
  :global(#app) {
    background: white !important;
    color: black !important;
  }

  article {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>
