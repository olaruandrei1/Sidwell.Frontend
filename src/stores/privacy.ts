import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const usePrivacyStore = defineStore('privacy', () => {
  const isPrivate = ref(true);

  function applyToDOM(val: boolean) {
    if (val) {
      document.documentElement.setAttribute('data-private', '');
    } else {
      document.documentElement.removeAttribute('data-private');
    }
  }

  function toggle() {
    isPrivate.value = !isPrivate.value;
  }

  watch(isPrivate, applyToDOM, { immediate: true });

  return { isPrivate, toggle };
});
