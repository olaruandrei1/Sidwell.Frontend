import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export type ThemeMode = 'dark' | 'light';

export const useThemeStore = defineStore('theme', () => {
  const stored = localStorage.getItem('sidwell_theme');
  const initial: ThemeMode = stored === 'light' ? 'light' : 'dark';
  const mode = ref<ThemeMode>(initial);

  function applyTheme(newMode: ThemeMode) {
    document.documentElement.setAttribute('data-theme', newMode);
    localStorage.setItem('sidwell_theme', newMode);
  }

  function cycleTheme() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
  }

  watch(mode, (val) => {
    applyTheme(val);
  }, { immediate: true });

  return {
    mode,
    cycleTheme,
    setMode,
    applyTheme
  };
});
