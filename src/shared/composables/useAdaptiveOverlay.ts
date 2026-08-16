import { ref } from 'vue';

export interface OverlayStackItem {
  id: string;
  isOpen: boolean;
  title?: string;
  snap?: 'peek' | 'full';
}

const activeOverlayId = ref<string | null>(null);

export function useAdaptiveOverlay(overlayId = Math.random().toString(36).substring(2, 9)) {
  const isOpen = ref(false);

  const open = () => {
    activeOverlayId.value = overlayId;
    isOpen.value = true;
  };

  const close = () => {
    if (activeOverlayId.value === overlayId) {
      activeOverlayId.value = null;
    }
    isOpen.value = false;
  };

  const toggle = () => {
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  };

  return {
    id: overlayId,
    isOpen,
    open,
    close,
    toggle,
    isActive: () => activeOverlayId.value === overlayId
  };
}
