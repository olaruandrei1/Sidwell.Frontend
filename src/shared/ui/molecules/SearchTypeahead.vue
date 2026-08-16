<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { api } from '../../api/client';
import type { TickerSummary } from '../../api/types';
import TagBadge from '../atoms/TagBadge.vue';

const router = useRouter();
const { t } = useI18n();
const query = ref('');
const results = ref<TickerSummary[]>([]);
const loading = ref(false);
const isOpen = ref(false);
const selectedIndex = ref(-1);

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

const performSearch = async (val: string) => {
  if (!val.trim()) {
    results.value = [];
    return;
  }
  loading.value = true;
  try {
    const data = await api.get<TickerSummary[]>('/tickers/search', { params: { q: val } });
    results.value = data;
    isOpen.value = true;
    selectedIndex.value = -1;
  } catch (e) {
    console.error('Search failed:', e);
  } finally {
    loading.value = false;
  }
};

watch(query, (newVal) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(newVal);
  }, 200);
});

const selectTicker = (symbol: string) => {
  isOpen.value = false;
  query.value = '';
  router.push({ name: 'ticker-detail', params: { symbol } });
};

const handleKeyDown = (e: KeyboardEvent) => {
  if (!isOpen.value || results.value.length === 0) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % results.value.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value - 1 + results.value.length) % results.value.length;
  } else if (e.key === 'Enter' && selectedIndex.value >= 0) {
    e.preventDefault();
    const item = results.value[selectedIndex.value];
    if (item) {
      selectTicker(item.symbol);
    }
  } else if (e.key === 'Escape') {
    isOpen.value = false;
  }
};

const handleGlobalShortcut = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const input = document.getElementById('global-ticker-search');
    input?.focus();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalShortcut);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalShortcut);
});
</script>

<template>
  <div class="relative w-full max-w-sm">
    <div class="relative">
      <input
        id="global-ticker-search"
        type="text"
        v-model="query"
        :placeholder="t('nav.searchPlaceholder')"
        @focus="isOpen = true"
        @keydown="handleKeyDown"
        class="w-full bg-terminal-surface/90 border border-white/10 rounded-xl pl-3.5 pr-14 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-terminal-accent focus:ring-2 focus:ring-terminal-accent/30 transition-all duration-200 font-mono shadow-inner"
      />
      <div class="absolute right-2.5 top-2 flex items-center space-x-1 pointer-events-none">
        <span class="text-[10px] text-gray-400 bg-terminal-bg/80 border border-white/10 px-1.5 py-0.5 rounded-md font-mono font-bold">⌘K</span>
      </div>
    </div>

    <!-- Dropdown results -->
    <div
      v-if="isOpen && (results.length > 0 || loading || query.trim().length > 0)"
      class="absolute left-0 right-0 mt-2 sw-glass-card border border-white/15 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto"
    >
      <div v-if="loading" class="p-4 text-xs text-gray-400 font-mono text-center animate-pulse">
        Searching tickers...
      </div>
      <div v-else-if="results.length === 0" class="p-4 text-xs text-gray-400 font-mono text-center">
        No tickers found for "{{ query }}"
      </div>
      <ul v-else class="divide-y divide-white/5">
        <li
          v-for="(t, idx) in results"
          :key="t.symbol"
          @click="selectTicker(t.symbol)"
          @mouseenter="selectedIndex = idx"
          class="px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors duration-150"
          :class="idx === selectedIndex ? 'bg-terminal-accent/15 text-terminal-accent font-bold' : 'hover:bg-white/10 text-gray-200'"
        >
          <div class="flex flex-col">
            <span class="font-mono font-bold text-sm">{{ t.symbol }}</span>
            <span class="text-xs text-gray-400 font-sans mt-0.5">{{ t.name }}</span>
          </div>
          <TagBadge variant="default" size="sm">{{ t.exchange }}</TagBadge>
        </li>
      </ul>
    </div>
  </div>
</template>
