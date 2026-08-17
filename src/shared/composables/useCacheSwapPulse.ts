import { ref, watch, type Ref } from 'vue';

// Pulses `true` for ~700ms whenever `dataUpdatedAt` moves. If a query was seeded with cached
// data (`initialData`), `dataUpdatedAt` already starts non-zero at mount, so the *next* change —
// the background refetch landing — correctly triggers the pulse. A query with no cached seed
// starts at 0/undefined, so its first (only) transition is the normal initial load and is
// silently skipped; any later change (a live Sync update) still pulses.
export function useCacheSwapPulse(dataUpdatedAt: Ref<number>) {
  const justUpdated = ref(false);
  const armed = ref(Boolean(dataUpdatedAt.value));

  watch(dataUpdatedAt, () => {
    if (armed.value) {
      justUpdated.value = true;
      setTimeout(() => {
        justUpdated.value = false;
      }, 700);
    }
    armed.value = true;
  });

  return justUpdated;
}
