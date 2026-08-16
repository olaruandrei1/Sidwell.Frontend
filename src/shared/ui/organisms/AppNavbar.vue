<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useBreakpoint } from '../../composables/useBreakpoint';
import { useSignalR } from '../../composables/useSignalR';
import { useThemeStore } from '../../../stores/theme';
import { useAuthStore } from '../../../stores/auth';
import { usePrivacyStore } from '../../../stores/privacy';
import AdaptiveOverlay from '../organisms/AdaptiveOverlay.vue';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { isMobile } = useBreakpoint();
const { isConnected, syncInProgress, currentProgress, lastAlert } = useSignalR();
const themeStore = useThemeStore();
const authStore = useAuthStore();
const privacyStore = usePrivacyStore();

const showMore = ref(false);

const navItems = computed(() => [
  { name: 'dashboard',  label: t('nav.dashboard'),   icon: dashboardIcon },
  { name: 'portfolio',  label: t('nav.portfolio'),   icon: portfolioIcon },
  { name: 'watchlist',  label: t('nav.watchlist'),   icon: watchlistIcon },
  { name: 'finances',   label: t('nav.finances'),    icon: financesIcon },
  { name: 'screener',   label: t('nav.screener'),    icon: screenerIcon },
  { name: 'alerts',     label: t('nav.alerts'),      icon: alertsIcon },
  { name: 'settings',   label: t('nav.settings'),    icon: settingsIcon },
]);

const mobilePrimaryItems = computed(() => navItems.value.slice(0, 4));
const mobileMoreItems = computed(() => navItems.value.slice(4));

const currentRouteName = computed(() => route.name || 'dashboard');

const syncLabel = computed(() => {
  if (syncInProgress.value && currentProgress.value)
    return `${currentProgress.value.symbol} ${currentProgress.value.percent ?? 0}%`;
  return isConnected.value ? 'LIVE' : 'OFFLINE';
});

function handleLogout() {
  authStore.logout();
  router.push({ name: 'login' });
}

// ── Liquid indicator position tracking ───────────────────────────────
const dockWidthPx = ref(0);
const totalMobileTabs = computed(() => mobilePrimaryItems.value.length + 1);

const activeTabIndex = computed(() => {
  if (showMore.value) return mobilePrimaryItems.value.length;
  const idx = mobilePrimaryItems.value.findIndex((i) => i.name === currentRouteName.value);
  return idx >= 0 ? idx : 0;
});

const tabWidthPct = computed(() => 100 / totalMobileTabs.value);
const activeTabOffsetPx = computed(() => {
  const usable = dockWidthPx.value - 12; // account for horizontal padding (px-1.5 both sides = 12px)
  return (usable / totalMobileTabs.value) * activeTabIndex.value;
});

function measureDock() {
  const dock = document.querySelector<HTMLElement>('.sw-liquid-dock__shell');
  if (dock) dockWidthPx.value = dock.getBoundingClientRect().width;
}
function onTabClick(_idx: number) {
  // reserved — route change already triggers indicator via computed
  showMore.value = false;
}
function onMoreClick() {
  showMore.value = !showMore.value;
}

onMounted(() => {
  nextTick(measureDock);
  window.addEventListener('resize', measureDock);
});
onUnmounted(() => {
  window.removeEventListener('resize', measureDock);
});
watch(isMobile, () => nextTick(measureDock));

/* ── Modern Vector Icons ────────────────────────────────────────────────── */
const dashboardIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const portfolioIcon  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`;
const watchlistIcon  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/></svg>`;
const financesIcon   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`;
const screenerIcon   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>`;
const alertsIcon     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const settingsIcon   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const moonIcon       = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const sunIcon        = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const eyeIcon        = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeOffIcon     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const logoutIcon     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
const moreIcon       = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>`;
</script>

<template>
  <!-- ══════════════════════════════════════════════════════════════
       DESKTOP — Clean, Modern Header Bar (h-16)
  ══════════════════════════════════════════════════════════════ -->
  <header
    v-if="!isMobile"
    class="sticky top-0 z-50 w-full bg-terminal-bg/95 backdrop-blur-md border-b border-terminal-border select-none"
  >
    <div class="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      <!-- Left: Logo & Status -->
      <div class="flex items-center gap-4">
        <router-link to="/portfolio" class="flex items-center gap-2.5 group">
          <div class="w-8 h-8 rounded-lg bg-terminal-accent/15 border border-terminal-accent/30 flex items-center justify-center">
            <img src="/favicon.svg?v=sw2026" alt="Sidwell" class="w-5 h-5" />
          </div>
          <span class="font-sans font-bold text-base tracking-tight text-terminal-accent group-hover:text-white transition-colors">
            SIDWELL
          </span>
        </router-link>

        <div v-if="syncInProgress" class="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-terminal-surface border border-terminal-border text-xs font-medium">
          <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse" />
          <span class="text-gray-300 font-mono">{{ syncLabel }}</span>
        </div>
      </div>

      <!-- Center: Navigation Tabs -->
      <nav class="flex items-center gap-1">
        <router-link
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="relative flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-150 text-xs font-semibold uppercase tracking-wider"
          :class="currentRouteName === item.name
            ? 'bg-terminal-accent/15 text-terminal-accent border border-terminal-accent/30 font-bold'
            : 'text-gray-400 hover:text-gray-100 hover:bg-terminal-surface-light'"
          :title="item.label"
        >
          <span class="w-4 h-4 flex-shrink-0" v-html="item.icon" />
          <span>{{ item.label }}</span>
          <span
            v-if="item.name === 'alerts' && lastAlert"
            class="w-2 h-2 rounded-full bg-terminal-up animate-ping"
          />
        </router-link>
      </nav>

      <!-- Right: Actions -->
      <div class="flex items-center gap-2">
        <!-- Privacy toggle -->
        <button
          type="button"
          @click="privacyStore.toggle()"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-terminal-surface border border-terminal-border transition-colors"
          :class="privacyStore.isPrivate ? 'text-terminal-accent border-terminal-accent/40' : 'text-gray-400 hover:text-gray-100'"
          :title="privacyStore.isPrivate ? 'Preseting activ — click pentru a vedea datele' : 'Click pentru a ascunde datele'"
        >
          <span class="w-4 h-4" v-html="privacyStore.isPrivate ? eyeOffIcon : eyeIcon" />
        </button>

        <!-- Theme toggle -->
        <button
          type="button"
          @click="themeStore.cycleTheme()"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-terminal-surface border border-terminal-border text-gray-400 hover:text-gray-100 transition-colors"
          :title="themeStore.mode === 'dark' ? 'iOS 26 Dark — click pentru Light' : 'iOS 26 Light — click pentru Dark'"
        >
          <span class="w-4 h-4" v-html="themeStore.mode === 'dark' ? moonIcon : sunIcon" />
        </button>

        <button
          type="button"
          @click="handleLogout"
          class="w-9 h-9 flex items-center justify-center rounded-xl bg-terminal-surface border border-terminal-border text-gray-400 hover:text-terminal-down transition-colors"
          title="Sign out"
        >
          <span class="w-4 h-4" v-html="logoutIcon" />
        </button>
      </div>
    </div>
  </header>

  <!-- ══════════════════════════════════════════════════════════════
       MOBILE — Clean Top Bar + Non-Colliding Dock Bar
  ══════════════════════════════════════════════════════════════ -->
  <header
    v-if="isMobile"
    class="sticky top-0 z-40 flex items-center justify-between px-4 h-14
           bg-terminal-bg/95 backdrop-blur-md border-b border-terminal-border select-none"
  >
    <router-link to="/portfolio" class="flex items-center gap-2">
      <img src="/favicon.svg?v=sw2026" alt="Sidwell" class="w-7 h-7 rounded-md" />
      <span class="font-sans font-bold text-sm tracking-tight text-white">SIDWELL</span>
    </router-link>

    <div class="flex items-center gap-2">
      <div v-if="syncInProgress" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-terminal-surface border border-terminal-border text-xs">
        <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse" />
        <span class="font-mono text-gray-300">{{ syncLabel }}</span>
      </div>
      <!-- Privacy toggle mobile -->
      <button
        type="button"
        @click="privacyStore.toggle()"
        class="w-8 h-8 flex items-center justify-center rounded-lg bg-terminal-surface border border-terminal-border"
        :class="privacyStore.isPrivate ? 'text-terminal-accent border-terminal-accent/40' : 'text-gray-400'"
      >
        <span class="w-4 h-4" v-html="privacyStore.isPrivate ? eyeOffIcon : eyeIcon" />
      </button>
      <!-- Theme toggle mobile -->
      <button
        type="button"
        @click="themeStore.cycleTheme()"
        class="w-8 h-8 flex items-center justify-center rounded-lg bg-terminal-surface border border-terminal-border text-gray-400"
      >
        <span class="w-4 h-4" v-html="themeStore.mode === 'dark' ? moonIcon : sunIcon" />
      </button>
    </div>
  </header>

  <!-- Mobile Liquid Glass Dock (iOS 26 style) — animated pill indicator -->
  <nav
    v-if="isMobile"
    class="sw-liquid-dock fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] max-w-md h-16 select-none"
    :aria-label="t('nav.dashboard')"
  >
    <div class="sw-liquid-dock__shell relative h-full flex items-stretch px-1.5 gap-0" role="tablist">
      <!-- Animated liquid indicator (moves + morphs) -->
      <div
        class="sw-liquid-dock__pill"
        :style="{
          transform: `translate3d(${activeTabOffsetPx}px, 0, 0)`,
          width: `${tabWidthPct}%`
        }"
      />

      <router-link
        v-for="(item, idx) in mobilePrimaryItems"
        :key="item.name"
        :to="{ name: item.name }"
        role="tab"
        :aria-selected="currentRouteName === item.name"
        class="sw-liquid-dock__tab relative flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 rounded-2xl transition-colors duration-200"
        :class="currentRouteName === item.name ? 'sw-liquid-dock__tab--active' : ''"
        @click="onTabClick(idx)"
      >
        <span class="w-[22px] h-[22px] flex-shrink-0 transition-transform duration-300 ease-out"
              :style="currentRouteName === item.name ? 'transform: scale(1.08) translateY(-1px)' : ''"
              v-html="item.icon" />
        <span class="text-[10px] leading-tight font-semibold tracking-tight truncate max-w-full block w-full text-center">
          {{ item.label }}
        </span>
      </router-link>

      <button
        type="button"
        role="tab"
        :aria-selected="showMore"
        @click="onMoreClick"
        class="sw-liquid-dock__tab relative flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0 rounded-2xl transition-colors duration-200"
        :class="showMore ? 'sw-liquid-dock__tab--active' : ''"
      >
        <span class="w-[22px] h-[22px] flex-shrink-0" v-html="moreIcon" />
        <span class="text-[10px] leading-tight font-semibold tracking-tight truncate max-w-full block w-full text-center">
          {{ t('common.more') || 'More' }}
        </span>
      </button>
    </div>
  </nav>

  <!-- Mobile Bottom Sliding Panel Sheet for "Mai Multe" -->
  <AdaptiveOverlay
    v-if="isMobile"
    v-model="showMore"
    title="Navigare & Opțiuni"
    :max-width="420"
  >
    <div class="space-y-4 p-1">
      <div class="grid grid-cols-2 gap-2.5">
        <router-link
          v-for="item in mobileMoreItems"
          :key="item.name"
          :to="{ name: item.name }"
          @click="showMore = false"
          class="flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors"
          :class="currentRouteName === item.name
            ? 'bg-terminal-accent/15 text-terminal-accent border-terminal-accent/40 font-bold'
            : 'text-gray-200'"
        >
          <span class="w-5 h-5 flex-shrink-0" v-html="item.icon" />
          <span class="text-sm font-medium">{{ item.label }}</span>
        </router-link>
      </div>

      <div class="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
        <!-- Privacy toggle in drawer -->
        <button
          type="button"
          @click="privacyStore.toggle(); showMore = false"
          class="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl border font-medium text-xs transition-colors"
          :class="privacyStore.isPrivate
            ? 'bg-terminal-accent/10 border-terminal-accent/30 text-terminal-accent'
            : 'bg-white/[0.04] border-white/10 text-gray-200 hover:bg-white/[0.08]'"
        >
          <span class="w-4 h-4" v-html="privacyStore.isPrivate ? eyeOffIcon : eyeIcon" />
          <span>{{ privacyStore.isPrivate ? 'Preseting ON' : 'Preseting OFF' }}</span>
        </button>

        <!-- Theme toggle in drawer -->
        <button
          type="button"
          @click="themeStore.cycleTheme(); showMore = false"
          class="flex-shrink-0 flex items-center justify-center gap-2 px-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-gray-200 font-medium text-xs hover:bg-white/[0.08] transition-colors"
        >
          <span class="w-4 h-4" v-html="themeStore.mode === 'dark' ? moonIcon : sunIcon" />
        </button>

        <button
          type="button"
          @click="handleLogout(); showMore = false"
          class="flex-shrink-0 flex items-center justify-center gap-2.5 px-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 font-medium text-xs hover:bg-rose-500/20 transition-colors"
        >
          <span class="w-4 h-4" v-html="logoutIcon" />
        </button>
      </div>
    </div>
  </AdaptiveOverlay>
</template>

<style scoped>
.pop-enter-active,
.pop-leave-active {
  transition: all 0.15s ease-out;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.95);
}

/* ─── iOS 26 Liquid Glass Mobile Dock ───────────────────────────── */
.sw-liquid-dock {
  bottom: calc(env(safe-area-inset-bottom, 0px) + 12px);
  filter: drop-shadow(0 20px 40px rgba(0, 0, 0, 0.35));
}

.sw-liquid-dock__shell {
  background: var(--dock-bg);
  border: 1px solid var(--dock-border);
  border-radius: 28px;
  backdrop-filter: saturate(180%) blur(28px);
  -webkit-backdrop-filter: saturate(180%) blur(28px);
  box-shadow:
    inset 0 1px 0 var(--dock-inner-top),
    inset 0 -1px 0 var(--dock-inner-bottom),
    var(--dock-shadow);
  overflow: hidden;
}

.sw-liquid-dock__pill {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  background: var(--dock-pill-bg);
  border-radius: 22px;
  box-shadow:
    inset 0 1px 0 var(--dock-pill-inner-top),
    var(--dock-pill-glow);
  transition:
    transform 0.55s cubic-bezier(0.22, 1.2, 0.36, 1),
    width 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform, width;
  pointer-events: none;
  z-index: 0;
}

.sw-liquid-dock__tab {
  position: relative;
  z-index: 1;
  color: var(--dock-tab-inactive);
  padding: 0 4px;
  transition: color 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.sw-liquid-dock__tab--active {
  color: var(--dock-tab-active);
}

.sw-liquid-dock__tab:active {
  transform: scale(0.94);
  transition: transform 0.1s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .sw-liquid-dock__pill {
    transition: transform 0.15s linear, width 0.15s linear;
  }
}
</style>
