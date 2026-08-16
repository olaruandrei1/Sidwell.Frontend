<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTickerNewsPaginatedQuery } from '../../../queries/useTickersQuery';
import { useBreakpoint } from '../../../shared/composables/useBreakpoint';
import { formatDateTime } from '../../../shared/utils/format';
import TagBadge from '../../../shared/ui/atoms/TagBadge.vue';
import type { NewsItem } from '../../../shared/api/types';

const props = defineProps<{ symbol: string }>();

const symbolRef = computed(() => props.symbol);
const { isMobile } = useBreakpoint();

const PAGE_SIZE = 9;
const page = ref(1);
const newsQuery = useTickerNewsPaginatedQuery(symbolRef, page, PAGE_SIZE);

const totalPages = computed(() => newsQuery.data.value?.totalPages ?? 1);
const total = computed(() => newsQuery.data.value?.totalCount ?? 0);
const isLoading = computed(() => newsQuery.isLoading.value);

// Mobile: accumulate pages so the swipe carousel lazy-loads more as you scroll.
const accumulated = ref<NewsItem[]>([]);

watch(
  () => newsQuery.data.value,
  (d) => {
    if (!d || !isMobile.value) return;
    const seen = new Set(accumulated.value.map((i) => i.url));
    d.items.forEach((i) => {
      if (!seen.has(i.url)) accumulated.value.push(i);
    });
  },
  { immediate: true }
);

// Reset paging when the ticker changes.
watch(symbolRef, () => {
  page.value = 1;
  accumulated.value = [];
});

const items = computed<NewsItem[]>(() =>
  isMobile.value ? accumulated.value : newsQuery.data.value?.items ?? []
);

const hasMore = computed(() => page.value < totalPages.value);

// Prefetch the next page well before the end — once the user is ~60% through the
// cards already loaded (e.g. viewing ~#15 of 20), not when they hit the last card.
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement;
  if (el.scrollWidth <= el.clientWidth) return;
  const fraction = (el.scrollLeft + el.clientWidth) / el.scrollWidth;
  if (fraction > 0.6 && hasMore.value && !newsQuery.isFetching.value) {
    page.value += 1;
  }
};

const getSentimentVariant = (val: string | null) => {
  if (!val) return 'default';
  const num = parseFloat(val);
  if (isNaN(num)) return 'default';
  if (num > 0.2) return 'up';
  if (num < -0.2) return 'down';
  return 'default';
};

const formatSentiment = (val: string | null) => {
  if (!val) return 'Neutral';
  const num = parseFloat(val);
  if (isNaN(num)) return 'Neutral';
  return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
};
</script>

<template>
  <section v-if="isLoading || items.length > 0" class="space-y-3">
    <!-- Title over the background -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-baseline gap-2">
        <h2 class="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">News</h2>
        <span v-if="total" class="text-[11px] text-gray-500 font-mono">{{ total }} articles</span>
      </div>

      <!-- Desktop: classic prev / next (you can't swipe on a PC) -->
      <div class="hidden sm:flex items-center gap-2">
        <button
          type="button"
          :disabled="page <= 1 || newsQuery.isFetching.value"
          class="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:border-terminal-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          @click="page > 1 && (page -= 1)"
        >← Prev</button>
        <span class="text-[11px] text-gray-500 font-mono tabular-nums">{{ page }} / {{ totalPages }}</span>
        <button
          type="button"
          :disabled="!hasMore || newsQuery.isFetching.value"
          class="px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:border-terminal-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          @click="hasMore && (page += 1)"
        >Next →</button>
      </div>
      <span class="sm:hidden text-[10px] text-gray-600 font-mono uppercase tracking-wider">swipe →</span>
    </div>

    <div v-if="isLoading" class="py-6 text-center text-xs text-gray-400 animate-pulse font-mono">
      Loading articles...
    </div>

    <!-- Cards sit directly on the background; mobile swipes & lazy-loads more -->
    <div
      v-else
      class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scrollbar-none -mx-1 px-1"
      @scroll.passive="onScroll"
    >
      <a
        v-for="(item, idx) in items"
        :key="`${item.url}-${idx}`"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="snap-start shrink-0 w-[82vw] sm:w-[340px] border border-white/10 rounded-2xl bg-terminal-surface/80 p-4 flex flex-col hover:border-terminal-accent/50 transition-colors duration-200 shadow-lg"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-mono text-gray-400 font-bold truncate">{{ item.source }}</span>
          <TagBadge :variant="getSentimentVariant(item.sentiment)" size="sm">
            {{ formatSentiment(item.sentiment) }}
          </TagBadge>
        </div>
        <span class="text-sm font-bold text-gray-100 line-clamp-4 leading-snug flex-1 font-sans">
          {{ item.title }}
        </span>
        <div class="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 font-mono">
          <span>{{ formatDateTime(item.publishedAt) }}</span>
          <span class="text-terminal-accent font-bold">Read →</span>
        </div>
      </a>

      <!-- Mobile: lazy-load spinner card at the tail -->
      <div
        v-if="isMobile && hasMore"
        class="snap-start shrink-0 w-[40vw] flex items-center justify-center text-[11px] text-gray-500 font-mono animate-pulse"
      >
        Loading more…
      </div>
    </div>
  </section>
</template>
