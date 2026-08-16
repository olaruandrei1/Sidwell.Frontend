import { registerSW } from 'virtual:pwa-register';

export function setupPwa() {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Auto-update or prompt could be hooked here
      updateSW(true);
    },
    onOfflineReady() {
      console.log('App is ready to work offline');
    }
  });
}
