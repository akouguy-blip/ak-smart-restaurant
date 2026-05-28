import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface CartItem {
  item_id: string;
  nom: string;
  prix_fcfa: number;
  quantite: number;
  options?: Record<string, string>;
  notes?: string;
}

export const useCart = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);

  const count = computed(() =>
    items.value.reduce((sum, i) => sum + i.quantite, 0),
  );

  const total = computed(() =>
    items.value.reduce((sum, i) => sum + i.prix_fcfa * i.quantite, 0),
  );

  function add(item: Omit<CartItem, 'quantite'>) {
    const existing = items.value.find((i) => i.item_id === item.item_id);
    if (existing) {
      existing.quantite += 1;
    } else {
      items.value.push({ ...item, quantite: 1 });
    }
  }

  function remove(item_id: string) {
    items.value = items.value.filter((i) => i.item_id !== item_id);
  }

  function changeQty(item_id: string, delta: number) {
    const item = items.value.find((i) => i.item_id === item_id);
    if (!item) return;
    item.quantite += delta;
    if (item.quantite <= 0) remove(item_id);
  }

  function clear() {
    items.value = [];
  }

  return { items, count, total, add, remove, changeQty, clear };
});
