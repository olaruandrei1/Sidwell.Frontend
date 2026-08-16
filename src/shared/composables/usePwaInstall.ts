import { ref, onMounted } from 'vue';

const deferredPrompt = ref<any>(null);
const isInstallable = ref(false);
const isInstalled = ref(false);

let initialized = false;

export function usePwaInstall() {
  const checkInstalled = () => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) {
      isInstalled.value = true;
      isInstallable.value = false;
    }
  };

  if (!initialized && typeof window !== 'undefined') {
    initialized = true;
    checkInstalled();

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      deferredPrompt.value = e;
      isInstallable.value = true;
    });

    window.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      isInstallable.value = false;
      deferredPrompt.value = null;
    });
  }

  async function install() {
    if (deferredPrompt.value) {
      deferredPrompt.value.prompt();
      const { outcome } = await deferredPrompt.value.userChoice;
      if (outcome === 'accepted') {
        isInstalled.value = true;
        isInstallable.value = false;
        deferredPrompt.value = null;
      }
    }
  }

  return {
    isInstallable,
    isInstalled,
    install
  };
}
