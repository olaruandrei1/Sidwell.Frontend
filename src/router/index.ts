import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../features/auth/LoginView.vue'),
    meta: { public: true }
  },
  {
    path: '/access-denied',
    name: 'access-denied',
    component: () => import('../features/auth/AccessDeniedView.vue'),
    meta: { public: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../features/dashboard/DashboardView.vue')
  },
  {
    path: '/portfolio',
    name: 'portfolio',
    component: () => import('../features/portfolio/PortfolioView.vue')
  },
  {
    path: '/watchlist',
    name: 'watchlist',
    component: () => import('../features/watchlist/WatchlistView.vue')
  },
  {
    path: '/ticker/:symbol',
    name: 'ticker-detail',
    component: () => import('../features/ticker/TickerDetailView.vue')
  },
  {
    path: '/screener',
    name: 'screener',
    component: () => import('../features/screener/ScreenerView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../features/settings/SettingsView.vue')
  },
  {
    path: '/finances',
    name: 'finances',
    component: () => import('../features/finances/FinancesView.vue')
  },
  {
    path: '/alerts',
    name: 'alerts',
    component: () => import('../features/alerts/AlertsView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard'
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Wait for Firebase auth state to resolve on first load (avoids flicker)
  // authReady is set by initAuthListener() which resolves before app mount.
  // This guard runs after mount so authReady should already be true, but
  // the check is defensive for any edge cases.
  if (!authStore.authReady) {
    // Shouldn't normally happen since initAuthListener awaits in main.ts
    await new Promise<void>((resolve) => {
      const stop = setInterval(() => {
        if (authStore.authReady) {
          clearInterval(stop);
          resolve();
        }
      }, 50);
    });
  }

  if (!to.meta.public && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

router.onError((error, to) => {
  if (
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Importing a module script failed')
  ) {
    console.warn('Chunk loading failed after PWA update, auto reloading page...');
    const target = to.fullPath ? `?redirect=${encodeURIComponent(to.fullPath)}` : '';
    window.location.href = window.location.origin + window.location.pathname + target;
  }
});

export default router;
