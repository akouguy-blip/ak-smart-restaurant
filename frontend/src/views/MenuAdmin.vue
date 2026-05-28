<template>
  <AdminLayout>
    <main class="max-w-5xl mx-auto px-6 py-6 space-y-5">

      <div v-if="loading" class="text-center py-20 text-ak-mute">Chargement…</div>

      <template v-else>
        <!-- Section catégories -->
        <section class="bg-ak-card border border-ak-border rounded-xl p-5">
          <div class="flex items-baseline justify-between mb-3">
            <div>
              <div class="text-sm font-medium text-ak-cream">Catégories</div>
              <div class="text-[11px] text-ak-mute mt-0.5">{{ categories.length }} catégorie<span v-if="categories.length > 1">s</span></div>
            </div>
            <button
              @click="showNewCategoryForm = !showNewCategoryForm"
              class="text-xs text-ak-gold border border-ak-gold/40 hover:bg-ak-gold/10 px-3 py-1.5 rounded-full"
            >+ Catégorie</button>
          </div>

          <div v-if="showNewCategoryForm" class="mb-4 p-3 bg-ak-bg rounded-lg flex gap-2">
            <input
              v-model="newCategoryName"
              placeholder="Nom de la catégorie"
              class="flex-1 bg-transparent border border-ak-border rounded px-3 py-1.5 text-sm focus:border-ak-gold outline-none text-ak-cream"
              @keyup.enter="addCategory"
            />
            <button
              @click="addCategory"
              :disabled="!newCategoryName.trim()"
              class="bg-ak-gold text-ak-bg text-xs px-4 py-1.5 rounded font-medium disabled:opacity-50"
            >Ajouter</button>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in categories"
              :key="c.id"
              @click="activeCategoryId = c.id"
              class="px-3 py-1.5 rounded-md text-xs flex items-center gap-2 transition-colors border"
              :class="
                activeCategoryId === c.id
                  ? 'bg-ak-bg text-ak-gold border-ak-gold/40'
                  : 'border-ak-border text-ak-mute hover:text-ak-cream'
              "
            >
              <span>{{ c.nom }}</span>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded"
                :class="activeCategoryId === c.id ? 'bg-ak-gold text-ak-bg' : 'bg-ak-border text-ak-mute'"
              >{{ countInCategory(c.id) }}</span>
            </button>
          </div>
        </section>

        <!-- Section items -->
        <section class="bg-ak-card border border-ak-border rounded-xl p-5">
          <div class="flex items-baseline justify-between mb-4">
            <div>
              <div class="text-sm font-medium text-ak-cream">Plats</div>
              <div class="text-[11px] text-ak-mute mt-0.5">
                {{ filteredItems.length }} plat<span v-if="filteredItems.length > 1">s</span> · {{ activeCategoryName }}
              </div>
            </div>
            <button
              @click="openNew"
              class="bg-ak-gold text-ak-bg text-xs font-medium px-4 py-1.5 rounded-full"
            >+ Nouveau plat</button>
          </div>

          <!-- Formulaire de création -->
          <div v-if="newItem" class="mb-4 p-4 bg-ak-bg border border-ak-gold/40 rounded-lg">
            <ItemForm
              v-model:nom="newItem.nom"
              v-model:description="newItem.description"
              v-model:prix_fcfa="newItem.prix_fcfa"
              v-model:category_id="newItem.category_id"
              v-model:temps_prep_minutes="newItem.temps_prep_minutes"
              v-model:est_vedette="newItem.est_vedette"
              :categories="categories"
            />
            <div class="flex justify-end gap-2 mt-3">
              <button @click="newItem = null" class="text-xs text-ak-mute hover:text-ak-cream px-3 py-1.5">
                Annuler
              </button>
              <button
                @click="saveNew"
                :disabled="!newItem.nom || !newItem.prix_fcfa || saving"
                class="bg-ak-gold text-ak-bg text-xs font-medium px-4 py-1.5 rounded disabled:opacity-50"
              >
                {{ saving ? 'Création…' : 'Créer le plat' }}
              </button>
            </div>
          </div>

          <div v-if="filteredItems.length === 0" class="text-center py-12 text-ak-mute text-sm">
            Aucun plat dans cette catégorie
          </div>

          <ul v-else class="divide-y divide-ak-border">
            <li v-for="item in filteredItems" :key="item.id" class="py-3">
              <!-- Mode lecture -->
              <div v-if="editingId !== item.id" class="flex items-center gap-4">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-medium text-ak-cream">{{ item.nom }}</span>
                    <span v-if="item.est_vedette" class="text-[9px] text-ak-gold border border-ak-gold/40 px-1.5 py-0.5 rounded tracking-wider">★ TOP</span>
                    <span v-if="!item.disponible" class="text-[9px] text-red-400 border border-red-400/40 px-1.5 py-0.5 rounded uppercase tracking-wider">indispo</span>
                  </div>
                  <p v-if="item.description" class="text-[11px] text-ak-mute mt-0.5 truncate">{{ item.description }}</p>
                </div>
                <div class="serif text-ak-gold text-base whitespace-nowrap">{{ formatFCFA(item.prix_fcfa) }}</div>

                <!-- Toggle dispo -->
                <button
                  @click="toggleDispo(item)"
                  class="relative w-10 h-5 rounded-full transition-colors flex-shrink-0"
                  :class="item.disponible ? 'bg-ak-gold' : 'bg-ak-border'"
                  :title="item.disponible ? 'Disponible' : 'Indisponible'"
                >
                  <span
                    class="absolute top-0.5 w-4 h-4 rounded-full bg-ak-bg transition-transform"
                    :class="item.disponible ? 'translate-x-5' : 'translate-x-0.5'"
                  ></span>
                </button>

                <button
                  @click="startEdit(item)"
                  class="text-[10px] text-ak-mute hover:text-ak-gold uppercase tracking-wider"
                >Modifier</button>
                <button
                  @click="onDelete(item)"
                  class="text-[10px] text-ak-mute hover:text-red-400 uppercase tracking-wider"
                >Suppr.</button>
              </div>

              <!-- Mode édition -->
              <div v-else class="p-4 bg-ak-bg border border-ak-gold/40 rounded-lg">
                <ItemForm
                  v-model:nom="editingDraft.nom"
                  v-model:description="editingDraft.description"
                  v-model:prix_fcfa="editingDraft.prix_fcfa"
                  v-model:category_id="editingDraft.category_id"
                  v-model:temps_prep_minutes="editingDraft.temps_prep_minutes"
                  v-model:est_vedette="editingDraft.est_vedette"
                  :categories="categories"
                />
                <div class="flex justify-end gap-2 mt-3">
                  <button @click="cancelEdit" class="text-xs text-ak-mute hover:text-ak-cream px-3 py-1.5">
                    Annuler
                  </button>
                  <button
                    @click="saveEdit(item.id)"
                    :disabled="saving"
                    class="bg-ak-gold text-ak-bg text-xs font-medium px-4 py-1.5 rounded disabled:opacity-50"
                  >
                    {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <!-- Erreur globale -->
        <div v-if="error" class="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {{ error }}
        </div>
      </template>
    </main>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import {
  fetchAdminMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createCategory as apiCreateCategory,
  formatFCFA,
  type AdminItem,
  type AdminCategory,
} from '../api';
import AdminLayout from '../components/AdminLayout.vue';

const items = ref<AdminItem[]>([]);
const categories = ref<AdminCategory[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref('');

const activeCategoryId = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editingDraft = ref<any>({});
const newItem = ref<any>(null);

const showNewCategoryForm = ref(false);
const newCategoryName = ref('');

const filteredItems = computed(() =>
  activeCategoryId.value
    ? items.value.filter((i) => i.category_id === activeCategoryId.value)
    : items.value,
);

const activeCategoryName = computed(() => {
  const c = categories.value.find((c) => c.id === activeCategoryId.value);
  return c?.nom || 'Tous';
});

function countInCategory(categoryId: string): number {
  return items.value.filter((i) => i.category_id === categoryId).length;
}

function startEdit(item: AdminItem) {
  editingId.value = item.id;
  editingDraft.value = {
    nom: item.nom,
    description: item.description || '',
    prix_fcfa: item.prix_fcfa,
    category_id: item.category_id,
    temps_prep_minutes: item.temps_prep_minutes,
    est_vedette: item.est_vedette,
  };
}

function cancelEdit() {
  editingId.value = null;
  editingDraft.value = {};
}

async function saveEdit(id: string) {
  saving.value = true;
  error.value = '';
  try {
    const updated = await updateMenuItem(id, {
      nom: editingDraft.value.nom,
      description: editingDraft.value.description || null,
      prix_fcfa: Number(editingDraft.value.prix_fcfa),
      category_id: editingDraft.value.category_id,
      temps_prep_minutes: Number(editingDraft.value.temps_prep_minutes),
      est_vedette: !!editingDraft.value.est_vedette,
    });
    const idx = items.value.findIndex((i) => i.id === id);
    if (idx >= 0) items.value[idx] = updated;
    editingId.value = null;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erreur lors de l\'enregistrement';
  } finally {
    saving.value = false;
  }
}

function openNew() {
  newItem.value = {
    nom: '',
    description: '',
    prix_fcfa: 0,
    category_id: activeCategoryId.value || categories.value[0]?.id,
    temps_prep_minutes: 15,
    est_vedette: false,
  };
}

async function saveNew() {
  if (!newItem.value || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const created = await createMenuItem({
      nom: newItem.value.nom,
      description: newItem.value.description || undefined,
      prix_fcfa: Number(newItem.value.prix_fcfa),
      category_id: newItem.value.category_id,
      temps_prep_minutes: Number(newItem.value.temps_prep_minutes),
      est_vedette: !!newItem.value.est_vedette,
    });
    items.value.push(created);
    newItem.value = null;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erreur lors de la création';
  } finally {
    saving.value = false;
  }
}

async function toggleDispo(item: AdminItem) {
  try {
    const updated = await updateMenuItem(item.id, { disponible: !item.disponible });
    const idx = items.value.findIndex((i) => i.id === item.id);
    if (idx >= 0) items.value[idx] = updated;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erreur';
  }
}

async function onDelete(item: AdminItem) {
  if (!window.confirm(`Supprimer "${item.nom}" ? Cette action est définitive.`)) return;
  error.value = '';
  try {
    await deleteMenuItem(item.id);
    items.value = items.value.filter((i) => i.id !== item.id);
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erreur de suppression';
  }
}

async function addCategory() {
  const name = newCategoryName.value.trim();
  if (!name) return;
  try {
    const created = await apiCreateCategory({ nom: name, ordre: categories.value.length + 1 });
    categories.value.push(created);
    newCategoryName.value = '';
    showNewCategoryForm.value = false;
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Erreur';
  }
}

// Composant inline pour le formulaire item (factorise add + edit)
const ItemForm = (props: any) => {
  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' }, [
    h('div', { class: 'sm:col-span-2' }, [
      h('label', { class: 'text-[10px] text-ak-mute uppercase tracking-wider' }, 'Nom du plat'),
      h('input', {
        value: props.nom,
        onInput: (e: any) => props['onUpdate:nom']?.(e.target.value),
        class: 'w-full bg-ak-bg border border-ak-border rounded px-3 py-2 text-sm mt-1 focus:border-ak-gold outline-none text-ak-cream',
      }),
    ]),
    h('div', { class: 'sm:col-span-2' }, [
      h('label', { class: 'text-[10px] text-ak-mute uppercase tracking-wider' }, 'Description'),
      h('textarea', {
        value: props.description,
        onInput: (e: any) => props['onUpdate:description']?.(e.target.value),
        rows: 2,
        class: 'w-full bg-ak-bg border border-ak-border rounded px-3 py-2 text-sm mt-1 focus:border-ak-gold outline-none text-ak-cream resize-none',
      }),
    ]),
    h('div', null, [
      h('label', { class: 'text-[10px] text-ak-mute uppercase tracking-wider' }, 'Prix (F)'),
      h('input', {
        type: 'number',
        value: props.prix_fcfa,
        onInput: (e: any) => props['onUpdate:prix_fcfa']?.(Number(e.target.value)),
        class: 'w-full bg-ak-bg border border-ak-border rounded px-3 py-2 text-sm mt-1 focus:border-ak-gold outline-none text-ak-cream',
      }),
    ]),
    h('div', null, [
      h('label', { class: 'text-[10px] text-ak-mute uppercase tracking-wider' }, 'Catégorie'),
      h(
        'select',
        {
          value: props.category_id,
          onChange: (e: any) => props['onUpdate:category_id']?.(e.target.value),
          class: 'w-full bg-ak-bg border border-ak-border rounded px-3 py-2 text-sm mt-1 focus:border-ak-gold outline-none text-ak-cream',
        },
        props.categories.map((c: any) => h('option', { value: c.id }, c.nom)),
      ),
    ]),
    h('div', null, [
      h('label', { class: 'text-[10px] text-ak-mute uppercase tracking-wider' }, 'Temps prép. (min)'),
      h('input', {
        type: 'number',
        value: props.temps_prep_minutes,
        onInput: (e: any) => props['onUpdate:temps_prep_minutes']?.(Number(e.target.value)),
        class: 'w-full bg-ak-bg border border-ak-border rounded px-3 py-2 text-sm mt-1 focus:border-ak-gold outline-none text-ak-cream',
      }),
    ]),
    h('div', { class: 'flex items-end' }, [
      h(
        'label',
        { class: 'flex items-center gap-2 cursor-pointer text-sm text-ak-cream' },
        [
          h('input', {
            type: 'checkbox',
            checked: props.est_vedette,
            onChange: (e: any) => props['onUpdate:est_vedette']?.(e.target.checked),
            class: 'accent-ak-gold',
          }),
          h('span', null, 'Plat vedette (★ TOP)'),
        ],
      ),
    ]),
  ]);
};

onMounted(async () => {
  try {
    const data = await fetchAdminMenu();
    items.value = data.items;
    categories.value = data.categories;
    if (categories.value.length > 0) activeCategoryId.value = categories.value[0].id;
  } catch (err) {
    console.error('Failed to load menu', err);
  } finally {
    loading.value = false;
  }
});
</script>
