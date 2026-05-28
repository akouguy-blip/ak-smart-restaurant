<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-10">
    <!-- Logo -->
    <div class="serif text-6xl tracking-[0.2em] text-ak-gold mb-1">AK</div>
    <div class="text-[10px] text-ak-mute tracking-[0.3em] uppercase mb-10">Espace personnel</div>

    <!-- Phase 1 : choix de l'utilisateur -->
    <div v-if="!selected" class="w-full max-w-md">
      <h1 class="serif text-xl text-ak-cream text-center mb-1">Qui se connecte ?</h1>
      <p class="text-xs text-ak-mute text-center mb-8">Sélectionnez votre profil</p>

      <div v-if="loadingStaff" class="text-center text-ak-mute text-sm py-12">Chargement…</div>
      <div v-else-if="staff.length === 0" class="text-center text-ak-mute text-sm py-12">
        Aucun compte staff disponible.<br/>
        Vérifiez que le backend a bien démarré.
      </div>

      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          v-for="u in staff"
          :key="u.id"
          @click="pickUser(u)"
          class="bg-ak-card border border-ak-border hover:border-ak-gold/60 rounded-xl p-4 flex flex-col items-center transition-colors"
        >
          <div
            class="w-14 h-14 rounded-full bg-ak-bg border border-ak-gold/40 flex items-center justify-center text-ak-gold text-lg font-medium mb-3"
          >{{ initialsOf(u) }}</div>
          <div class="text-sm font-medium text-ak-cream text-center">
            {{ u.prenom || '' }} {{ u.nom }}
          </div>
          <div class="text-[10px] text-ak-mute uppercase tracking-wider mt-1">
            {{ roleLabel(u.role) }}
          </div>
        </button>
      </div>

      <div v-if="expired" class="mt-6 text-center text-xs text-amber-400/80">
        Votre session a expiré. Reconnectez-vous.
      </div>
    </div>

    <!-- Phase 2 : entrée du PIN -->
    <div v-else class="w-full max-w-xs">
      <button
        @click="reset"
        class="text-xs text-ak-mute hover:text-ak-cream mb-6 flex items-center gap-1"
      >‹ Choisir un autre profil</button>

      <div class="text-center mb-6">
        <div
          class="w-16 h-16 rounded-full bg-ak-card border border-ak-gold/60 mx-auto flex items-center justify-center text-ak-gold text-xl font-medium mb-3"
        >{{ initialsOf(selected) }}</div>
        <div class="text-sm text-ak-cream">Bonjour {{ selected.prenom || selected.nom }}</div>
        <div class="text-[11px] text-ak-mute mt-1">Code PIN à 4 chiffres</div>
      </div>

      <!-- Indicateurs de digits saisis -->
      <div class="flex justify-center gap-3 mb-7">
        <div
          v-for="i in 4"
          :key="i"
          class="w-3 h-3 rounded-full border transition-colors"
          :class="
            pin.length >= i
              ? 'bg-ak-gold border-ak-gold'
              : error
                ? 'border-red-400/60'
                : 'border-ak-border'
          "
        ></div>
      </div>

      <!-- Pavé numérique -->
      <div class="grid grid-cols-3 gap-2 mb-4">
        <button
          v-for="n in [1,2,3,4,5,6,7,8,9]"
          :key="n"
          @click="press(n)"
          :disabled="submitting"
          class="bg-ak-card border border-ak-border rounded-xl py-4 text-xl text-ak-cream font-medium disabled:opacity-50 active:bg-ak-bg"
        >{{ n }}</button>
        <div></div>
        <button
          @click="press(0)"
          :disabled="submitting"
          class="bg-ak-card border border-ak-border rounded-xl py-4 text-xl text-ak-cream font-medium disabled:opacity-50 active:bg-ak-bg"
        >0</button>
        <button
          @click="backspace"
          :disabled="submitting || pin.length === 0"
          class="bg-ak-card border border-ak-border rounded-xl py-4 text-ak-mute disabled:opacity-30 active:bg-ak-bg flex items-center justify-center"
          aria-label="Effacer"
        >⌫</button>
      </div>

      <!-- Feedback -->
      <div class="h-6 text-center">
        <div v-if="submitting" class="text-xs text-ak-mute">Vérification…</div>
        <div v-else-if="error" class="text-xs text-red-400">{{ error }}</div>
      </div>
    </div>

    <p class="mt-12 text-[10px] text-ak-mute text-center max-w-xs leading-relaxed">
      Comptes de démo · PIN <span class="text-ak-gold">1234</span> (Chef Aïsha · cuisine)
      · <span class="text-ak-gold">5678</span> (Aline · caisse)
      · <span class="text-ak-gold">9999</span> (Yacouba · gérant)
    </p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchStaff, loginPin } from '../api';
import { useAuth } from '../stores/auth';

interface StaffMember {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

const route = useRoute();
const router = useRouter();
const auth = useAuth();

const staff = ref<StaffMember[]>([]);
const loadingStaff = ref(true);
const selected = ref<StaffMember | null>(null);
const pin = ref('');
const submitting = ref(false);
const error = ref('');
const expired = ref(route.query.expired === '1');

const roleLabels: Record<string, string> = {
  cuisine: 'Cuisine',
  caisse: 'Caisse',
  gerant: 'Gérant',
  admin: 'Admin',
  serveur: 'Service',
};

function roleLabel(r: string): string {
  return roleLabels[r] || r;
}

function initialsOf(u: StaffMember): string {
  const first = u.prenom?.[0] || '';
  const last = u.nom?.[0] || '';
  return (first + last).toUpperCase() || u.nom[0].toUpperCase();
}

function pickUser(u: StaffMember) {
  selected.value = u;
  pin.value = '';
  error.value = '';
}

function reset() {
  selected.value = null;
  pin.value = '';
  error.value = '';
}

function press(digit: number) {
  if (submitting.value) return;
  if (pin.value.length >= 4) return;
  error.value = '';
  pin.value += String(digit);
  if (pin.value.length === 4) {
    submit();
  }
}

function backspace() {
  if (submitting.value) return;
  pin.value = pin.value.slice(0, -1);
  error.value = '';
}

async function submit() {
  if (!selected.value || pin.value.length !== 4) return;
  submitting.value = true;
  error.value = '';
  try {
    const { token, user } = await loginPin(selected.value.id, pin.value);
    auth.setSession(token, user as any);
    const redirect = (route.query.redirect as string) || auth.defaultRouteForRole();
    router.push(redirect);
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Code PIN incorrect';
    // Reset pour permettre un nouvel essai
    pin.value = '';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    staff.value = await fetchStaff();
  } catch (err) {
    console.error('Failed to load staff', err);
  } finally {
    loadingStaff.value = false;
  }
});
</script>
