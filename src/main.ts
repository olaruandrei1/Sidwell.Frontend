import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { pinia } from './app/plugins/pinia';
import { vuetify } from './app/plugins/vuetify';
import { vueQueryPlugin } from './app/plugins/vue-query';
import { i18n } from './app/plugins/i18n';
import { setupMocks } from './mocks/browser';
import { useAuthStore } from './stores/auth';
import { setOnUnauthorizedCallback } from './shared/api/client';
import { registerSW } from 'virtual:pwa-register';

// Register Service Worker with immediate auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New PWA content available, auto reloading...');
    window.location.reload();
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  }
});

// Styles
import './app/styles/tailwind.css';
import './app/styles/tokens.css';
import 'vuetify/styles';

async function bootstrap() {
  await setupMocks();

  const app = createApp(App);

  // Plugins must be registered before store access
  app.use(pinia);
  app.use(router);
  app.use(vuetify);
  app.use(vueQueryPlugin);
  app.use(i18n);

  // ── Firebase Auth init ──────────────────────────────────────────────────
  // Must happen BEFORE the app mounts so the router guard can read authReady.
  const authStore = useAuthStore();

  // Wire the API client's 401 handler to the auth store
  setOnUnauthorizedCallback(() => {
    authStore.onUnauthorized();
    router.push({ name: 'login' });
  });

  // Initialize Firebase listener and wait for first auth state resolution.
  // In mock mode this resolves immediately with the dev user.
  await authStore.initAuthListener();

  app.mount('#app');
}

bootstrap().catch((err) => {
  console.error('Fatal error bootstrapping Sidwell v3:', err);
});
