<template>
  <div class="min-h-screen bg-ak-bg">
    <!-- Header -->
    <header class="border-b border-ak-border px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="serif text-2xl text-ak-gold tracking-[0.2em]">AK</div>
        <div class="h-6 w-px bg-ak-border"></div>
        <div>
          <div class="text-sm font-medium text-ak-cream">Administration</div>
          <div class="text-[11px] text-ak-mute mt-0.5">Chez Aïsha</div>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <div class="text-xs font-medium text-ak-cream">
            {{ auth.user?.prenom || '' }} {{ auth.user?.nom || '' }}
          </div>
          <div class="text-[10px] text-ak-mute capitalize">{{ auth.user?.role || '' }}</div>
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

    <!-- Onglets admin -->
    <nav class="px-6 py-3 flex gap-2 border-b border-ak-border bg-ak-card/30">
      <router-link
        v-for="t in tabs"
        :key="t.to"
        :to="t.to"
        class="px-4 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors"
        :class="
          $route.path.startsWith(t.match)
            ? 'bg-ak-card text-ak-gold border border-ak-gold/40'
            : 'text-ak-mute hover:text-ak-cream border border-transparent'
        "
      >{{ t.label }}</router-link>
    </nav>

    <!-- Contenu -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuth } from '../stores/auth';

const router = useRouter();
const auth = useAuth();

const tabs = [
  { to: '/admin/dashboard', match: '/admin/dashboard', label: 'Aperçu' },
  { to: '/admin/menus', match: '/admin/menus', label: 'Menus' },
  { to: '/admin/tables', match: '/admin/tables', label: 'Tables · QR' },
];

function onLogout() {
  auth.logout();
  router.push({ name: 'staff-login' });
}
</script>
