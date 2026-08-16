import { useDisplay } from 'vuetify';
import { computed } from 'vue';

export function useBreakpoint() {
  const display = useDisplay();

  const isMobile = computed(() => display.smAndDown.value);
  const isTablet = computed(() => display.mdAndDown.value && !display.smAndDown.value);
  const isDesktop = computed(() => display.lgAndUp.value || (!display.smAndDown.value && !isTablet.value));

  // Breakpoint helper for AdaptiveOverlay: < md is mobile sheet, >= md is desktop dialog
  const isOverlaySheet = computed(() => display.smAndDown.value);

  return {
    isMobile,
    isTablet,
    isDesktop,
    isOverlaySheet,
    name: computed(() => display.name.value),
    width: computed(() => display.width.value)
  };
}
