<template>
  <AdminLayout>
    <main class="max-w-6xl mx-auto px-6 py-6 space-y-6">

      <div v-if="loading" class="text-center py-20 text-ak-mute">Chargement des statistiques…</div>

      <template v-else-if="stats">
        <!-- KPI row -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-ak-card border border-ak-border rounded-xl p-4">
            <div class="text-[10px] text-ak-mute uppercase tracking-[0.15em] font-medium">Chiffre d'affaires</div>
            <div class="serif text-2xl text-ak-gold mt-2">{{ formatFCFA(stats.kpis.ca_fcfa) }}</div>
            <div class="mt-2">
              <Delta v-if="stats.kpis.delta_ca_pct !== null" :value="stats.kpis.delta_ca_pct" suffix="% vs hier" />
              <span v-else class="text-[10px] text-ak-mute">— pas de donnée hier —</span>
            </div>
          </div>

          <div class="bg-ak-card border border-ak-border rounded-xl p-4">
            <div class="text-[10px] text-ak-mute uppercase tracking-[0.15em] font-medium">Transactions</div>
            <div class="serif text-2xl text-ak-cream mt-2">{{ stats.kpis.transactions }}</div>
            <div class="mt-2">
              <Delta :value="stats.kpis.delta_transactions" suffix=" vs hier" :raw="true" />
            </div>
          </div>

          <div class="bg-ak-card border border-ak-border rounded-xl p-4">
            <div class="text-[10px] text-ak-mute uppercase tracking-[0.15em] font-medium">Ticket moyen</div>
            <div class="serif text-2xl text-ak-cream mt-2">{{ formatFCFA(stats.kpis.ticket_moyen_fcfa) }}</div>
            <div class="mt-2 text-[10px] text-ak-mute">par couvert payé</div>
          </div>

          <div class="bg-ak-card border border-ak-border rounded-xl p-4">
            <div class="text-[10px] text-ak-mute uppercase tracking-[0.15em] font-medium">Plats vendus</div>
            <div class="serif text-2xl text-ak-cream mt-2">{{ stats.kpis.plats_vendus }}</div>
            <div class="mt-2">
              <Delta :value="stats.kpis.delta_plats" suffix=" vs hier" :raw="true" />
            </div>
          </div>
        </div>

        <!-- Chart + Top items -->
        <div class="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-3">
          <!-- Hourly chart -->
          <div class="bg-ak-card border border-ak-border rounded-xl p-5">
            <div class="flex items-baseline justify-between mb-4">
              <div>
                <div class="text-sm font-medium text-ak-cream">Chiffre d'affaires par heure</div>
                <div class="text-[11px] text-ak-mute mt-0.5">Aujourd'hui · service en cours</div>
              </div>
              <div v-if="peakHour" class="text-[11px] text-ak-mute">
                Pic à <span class="text-ak-gold font-medium">{{ peakHour.heure }}h</span>
              </div>
            </div>

            <div v-if="hourlyChart.length === 0" class="text-center py-12 text-ak-mute text-sm">
              Aucun encaissement aujourd'hui
            </div>

            <template v-else>
              <div class="flex items-end gap-1.5 h-32 pt-6">
                <div
                  v-for="bar in hourlyChart"
                  :key="bar.heure"
                  class="flex-1 rounded-t-sm relative"
                  :style="{
                    height: bar.pct + '%',
                    background: bar.isPeak ? '#C9A876' : '#5C4828',
                  }"
                >
                  <div
                    v-if="bar.isPeak"
                    class="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] text-ak-gold font-medium bg-ak-bg border border-ak-border rounded px-1.5 py-0.5 whitespace-nowrap"
                  >{{ formatFCFA(bar.ca) }}</div>
                </div>
              </div>
              <div class="flex gap-1.5 mt-2">
                <span
                  v-for="bar in hourlyChart"
                  :key="bar.heure"
                  class="flex-1 text-center text-[10px]"
                  :class="bar.isPeak ? 'text-ak-gold font-medium' : 'text-ak-mute'"
                >{{ bar.heure }}h</span>
              </div>
            </template>
          </div>

          <!-- Top items -->
          <div class="bg-ak-card border border-ak-border rounded-xl p-5">
            <div class="flex items-baseline justify-between mb-4">
              <div>
                <div class="text-sm font-medium text-ak-cream">Top plats</div>
                <div class="text-[11px] text-ak-mute mt-0.5">Par revenu généré</div>
              </div>
            </div>

            <div v-if="stats.top_items.length === 0" class="text-center py-8 text-ak-mute text-xs">
              Aucune vente aujourd'hui
            </div>

            <div v-else class="space-y-2.5">
              <div
                v-for="(item, idx) in stats.top_items"
                :key="item.id"
                class="flex items-center gap-3"
              >
                <div class="w-6 h-6 rounded bg-ak-bg border border-ak-border text-ak-gold text-xs flex items-center justify-center font-medium flex-shrink-0">
                  {{ idx + 1 }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm text-ak-cream truncate">{{ item.nom }}</div>
                  <div class="h-1 mt-1.5 bg-ak-bg rounded-full overflow-hidden">
                    <div
                      class="h-full bg-ak-gold rounded-full"
                      :style="{ width: barWidth(item.ca) + '%' }"
                    ></div>
                  </div>
                </div>
                <div class="text-right flex-shrink-0">
                  <div class="text-xs text-ak-gold font-medium">{{ formatFCFA(item.ca) }}</div>
                  <div class="text-[10px] text-ak-mute">{{ item.ventes }} ventes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Payment method breakdown -->
        <div class="bg-ak-card border border-ak-border rounded-xl p-5">
          <div class="text-sm font-medium text-ak-cream mb-1">Modes de paiement</div>
          <div class="text-[11px] text-ak-mute mb-4">Répartition des encaissements du jour</div>

          <div v-if="stats.payments_by_method.length === 0" class="text-center py-6 text-ak-mute text-xs">
            Aucun paiement enregistré
          </div>

          <div v-else class="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div
              v-for="m in stats.payments_by_method"
              :key="m.methode"
              class="border border-ak-border rounded-lg p-3"
            >
              <div class="text-[10px] text-ak-mute uppercase tracking-wider">{{ methodLabel(m.methode) }}</div>
              <div class="serif text-lg text-ak-cream mt-1">{{ formatFCFA(m.total) }}</div>
              <div class="text-[10px] text-ak-mute mt-1">{{ m.nb }} transaction<span v-if="m.nb > 1">s</span></div>
            </div>
          </div>
        </div>

      </template>
    </main>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, h } from 'vue';
import { fetchTodayStats, formatFCFA, type AdminStats } from '../api';
import AdminLayout from '../components/AdminLayout.vue';

const stats = ref<AdminStats | null>(null);
const loading = ref(true);

// Component inline pour afficher un delta coloré
const Delta = (props: { value: number; suffix: string; raw?: boolean }) => {
  const v = props.value;
  if (v === 0) {
    return h('span', { class: 'text-[10px] text-ak-mute' }, '— stable —');
  }
  const positive = v > 0;
  const symbol = positive ? '↑' : '↓';
  const colorClass = positive ? 'text-green-400' : 'text-red-400';
  const display = props.raw ? Math.abs(v).toString() : Math.abs(v).toString();
  return h(
    'span',
    { class: `text-[10px] ${colorClass}` },
    `${symbol} ${display}${props.suffix}`,
  );
};

// Construit les barres du graphique horaire avec normalisation
const hourlyChart = computed(() => {
  if (!stats.value?.hourly?.length) return [] as Array<{ heure: number; ca: number; pct: number; isPeak: boolean }>;
  const max = Math.max(...stats.value.hourly.map((h) => h.ca));
  const peak = stats.value.hourly.find((h) => h.ca === max);
  return stats.value.hourly.map((h) => ({
    heure: h.heure,
    ca: h.ca,
    pct: max > 0 ? Math.round((h.ca / max) * 100) : 0,
    isPeak: h === peak,
  }));
});

const peakHour = computed(() => hourlyChart.value.find((b) => b.isPeak) || null);

function barWidth(ca: number): number {
  if (!stats.value?.top_items?.length) return 0;
  const max = stats.value.top_items[0].ca; // déjà trié desc
  return max > 0 ? Math.round((ca / max) * 100) : 0;
}

const methodLabels: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  moov_money: 'Moov Money',
  carte: 'Carte',
  especes: 'Espèces',
};
function methodLabel(m: string): string {
  return methodLabels[m] || m;
}

onMounted(async () => {
  try {
    stats.value = await fetchTodayStats();
  } catch (err) {
    console.error('Failed to load stats', err);
  } finally {
    loading.value = false;
  }
});
</script>
