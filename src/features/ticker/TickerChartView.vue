<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTickerDetailQuery } from '../../queries/useTickersQuery';
import PriceChart from '../../shared/ui/organisms/PriceChart.vue';

// Mobile-only dedicated chart page: the inline chart's CSS-fullscreen mode is fine on desktop but
// cramped one-handed on a phone, so PriceChart's expand button routes mobile users here instead —
// full viewport, built for landscape/horizontal use, with every chart feature (indicators, periods,
// recommendation cards) intact since it's the same PriceChart component, just given the whole page.

const route = useRoute();
const router = useRouter();

const symbol = computed(() => String(route.params.symbol || ''));
const { data: detail } = useTickerDetailQuery(symbol);

const viewportHeight = ref(window.innerHeight);
const isPortrait = ref(window.matchMedia('(orientation: portrait)').matches);

function updateViewport() {
  viewportHeight.value = window.innerHeight;
  isPortrait.value = window.matchMedia('(orientation: portrait)').matches;
}

onMounted(() => {
  window.addEventListener('resize', updateViewport);
  window.addEventListener('orientationchange', updateViewport);
  try {
    (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.('landscape');
  } catch {
    // Best-effort only — most browsers require an active Fullscreen API element to honor this.
  }
});
onUnmounted(() => {
  window.removeEventListener('resize', updateViewport);
  window.removeEventListener('orientationchange', updateViewport);
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.();
  } catch {
    /* ignore */
  }
});

const chartHeight = computed(() => Math.max(360, viewportHeight.value - 110));

function goBack() {
  router.push({ name: 'ticker-detail', params: { symbol: symbol.value } });
}
</script>

<template>
  <div class="min-h-screen bg-terminal-bg font-mono select-none">
    <!-- Minimal header -->
    <div class="sticky top-0 z-10 flex items-center gap-3 px-3 py-2.5 bg-terminal-bg/95 backdrop-blur-md border-b border-white/10">
      <button
        type="button"
        class="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-gray-300 active:scale-95 transition-all"
        @click="goBack"
      >
        <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13L5 8l5-5" />
        </svg>
      </button>
      <div class="min-w-0">
        <div class="text-sm font-black text-gray-50 truncate">{{ detail?.ticker.symbol || symbol }}</div>
      </div>
      <span v-if="isPortrait" class="ml-auto text-[10px] text-terminal-accent font-bold uppercase tracking-wider flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="7" y="2" width="10" height="20" rx="2" transform="rotate(90 12 12)" />
        </svg>
        rotește telefonul
      </span>
    </div>

    <!-- Chart, given the whole page -->
    <div class="p-2">
      <PriceChart
        :bars="detail?.price.history || []"
        :height="chartHeight"
        :symbol="symbol"
        :currency="detail?.ticker.currency || 'USD'"
      />
    </div>
  </div>
</template>
