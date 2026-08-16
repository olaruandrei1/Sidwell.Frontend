<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { X } from '@lucide/vue';
import { request } from '@/shared/api/client';

export interface TickerSearchResult {
  symbol: string;
  companyName: string;
  exchange: string;
  country: string;
  currency: string;
  assetType: 'EQUITY' | 'ETF' | 'BOND' | string;
}

const props = defineProps<{
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'select', item: TickerSearchResult): void;
}>();

const searchQuery = ref(props.modelValue || '');
const isFocused = ref(false);
const isMobilePanelOpen = ref(false);
const isLoading = ref(false);
const results = ref<TickerSearchResult[]>([]);
const highlightedIndex = ref(-1);
const containerRef = ref<HTMLDivElement | null>(null);
const mobileInputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== undefined && newVal !== searchQuery.value) {
      searchQuery.value = newVal;
    }
  }
);

function triggerSearch(val: string) {
  searchQuery.value = val;
  emit('update:modelValue', val);
  highlightedIndex.value = -1;

  if (debounceTimer) clearTimeout(debounceTimer);

  if (val.trim().length < 3) {
    results.value = [];
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  debounceTimer = setTimeout(async () => {
    try {
      // Hit real backend API /tickers/search
      const data = await request<TickerSearchResult[]>(
        `/tickers/search?q=${encodeURIComponent(val.trim())}&limit=10`
      );
      results.value = Array.isArray(data) ? data : [];
    } catch {
      results.value = [];
    } finally {
      isLoading.value = false;
    }
  }, 150);
}

function onInput(e: Event) {
  const val = (e.target as HTMLInputElement).value;
  triggerSearch(val);
}

function handleInputFocus() {
  if (window.innerWidth < 640 && !props.disabled) {
    isMobilePanelOpen.value = true;
    setTimeout(() => mobileInputRef.value?.focus(), 100);
  } else {
    isFocused.value = true;
  }
}

function selectItem(item: TickerSearchResult) {
  searchQuery.value = item.symbol;
  emit('update:modelValue', item.symbol);
  emit('select', item);
  isFocused.value = false;
  isMobilePanelOpen.value = false;
  results.value = [];
}

function navigateDown() {
  if (results.value.length === 0) return;
  highlightedIndex.value = (highlightedIndex.value + 1) % results.value.length;
}

function navigateUp() {
  if (results.value.length === 0) return;
  highlightedIndex.value =
    (highlightedIndex.value - 1 + results.value.length) % results.value.length;
}

function selectHighlighted() {
  const targetItem = results.value[highlightedIndex.value];
  if (highlightedIndex.value >= 0 && targetItem) {
    selectItem(targetItem);
  } else {
    isFocused.value = false;
  }
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    isFocused.value = false;
  }
}

function getCountryFlag(countryCode: string): string {
  switch (countryCode?.toUpperCase()) {
    case 'RO':
      return '🇷🇴';
    case 'US':
      return '🇺🇸';
    case 'DE':
      return '🇩🇪';
    case 'NL':
      return '🇳🇱';
    case 'UK':
    case 'GB':
      return '🇬🇧';
    case 'SE':
      return '🇸🇪';
    case 'CH':
      return '🇨🇭';
    case 'DK':
      return '🇩🇰';
    case 'NO':
      return '🇳🇴';
    case 'FR':
      return '🇫🇷';
    default:
      return '🌐';
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <div class="relative w-full" ref="containerRef">
    <!-- Input Field -->
    <div class="relative flex items-center">
      <input
        type="text"
        :value="searchQuery"
        @input="onInput"
        @focus="handleInputFocus"
        @keydown.down.prevent="navigateDown"
        @keydown.up.prevent="navigateUp"
        @keydown.enter.prevent="selectHighlighted"
        @keydown.esc="isFocused = false"
        :disabled="disabled"
        :placeholder="placeholder || 'Căutare simbol / companie (ex: TLV, MIC, AAP)...'"
        class="w-full bg-terminal-surface border border-terminal-border rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-gray-100 placeholder-gray-500 uppercase focus:outline-none focus:border-terminal-accent transition-colors disabled:opacity-50"
      />
      <div v-if="isLoading && !isMobilePanelOpen" class="absolute right-3 text-terminal-accent animate-spin text-xs">
        ↻
      </div>
    </div>

    <!-- Desktop Dropdown Suggestions Menu (hidden on mobile) -->
    <div
      v-if="isFocused && searchQuery.length > 0 && !isMobilePanelOpen"
      class="hidden sm:block absolute left-0 right-0 top-full mt-1.5 z-50 bg-terminal-surface border border-terminal-border rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto animate-fadeIn"
    >
      <!-- Hint when less than 3 chars -->
      <div v-if="searchQuery.trim().length < 3" class="p-3 text-[11px] font-mono text-gray-400 text-center">
        💡 Tastați minim 3 caractere (ex: <strong class="text-terminal-accent">TLV</strong>, <strong class="text-terminal-accent">MIC</strong>, <strong class="text-terminal-accent">AAP</strong>)...
      </div>

      <!-- Loading State -->
      <div v-else-if="isLoading" class="p-3 text-xs font-mono text-gray-400 text-center flex items-center justify-center space-x-2">
        <span class="animate-spin text-terminal-accent">↻</span>
        <span>Caut în registrul bursier master...</span>
      </div>

      <!-- Empty / Fallback State -->
      <div v-else-if="results.length === 0" class="p-3 text-xs font-mono text-gray-400 text-center space-y-1">
        <div>Niciun rezultat salvat pentru „{{ searchQuery }}”.</div>
        <div class="text-[10px] text-terminal-accent">✓ Se va efectua verificare live la trimitere.</div>
      </div>

      <!-- Top 10 Ranked Results List -->
      <div v-else class="divide-y divide-terminal-border/40">
        <div
          v-for="(item, idx) in results"
          :key="item.symbol"
          @mousedown.prevent="selectItem(item)"
          class="p-3 flex items-center justify-between cursor-pointer transition-colors"
          :class="idx === highlightedIndex ? 'bg-terminal-accent/20 border-l-4 border-terminal-accent' : 'hover:bg-terminal-bg/60'"
        >
          <div class="min-w-0 pr-2">
            <div class="flex items-center space-x-2 font-mono">
              <span class="font-bold text-sm text-gray-100 tracking-wide">{{ item.symbol }}</span>
              <span
                class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                :class="item.assetType === 'ETF' ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'"
              >
                {{ item.assetType }}
              </span>
            </div>
            <div class="text-xs text-gray-300 font-sans truncate mt-0.5">
              {{ item.companyName }}
            </div>
          </div>

          <div class="text-right shrink-0 font-mono text-[11px]">
            <div class="font-bold text-gray-200 flex items-center space-x-1 justify-end">
              <span>{{ getCountryFlag(item.country) }}</span>
              <span>{{ item.exchange }}</span>
            </div>
            <div class="text-gray-500 text-[10px] uppercase">{{ item.currency }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Sliding Sheet Bottom Panel -->
    <Teleport to="body">
      <div
        v-if="isMobilePanelOpen"
        class="fixed inset-0 z-[120] flex flex-col justify-end bg-black/80 backdrop-blur-md sm:hidden transition-all"
        @click.self="isMobilePanelOpen = false"
      >
        <div
          class="w-full bg-terminal-surface border-t border-terminal-accent/40 rounded-t-3xl p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto pb-10 animate-slideUp"
        >
          <!-- Drag Handle -->
          <div class="w-12 h-1.5 bg-gray-600/60 rounded-full mx-auto mb-1"></div>

          <!-- Antet + Buton Închidere -->
          <div class="flex items-center justify-between border-b border-terminal-border/60 pb-3">
            <div>
              <span class="text-[10px] font-mono text-terminal-accent uppercase tracking-wider block">Căutare Master Ticker</span>
              <h3 class="text-base font-mono font-extrabold text-gray-100">
                🔍 Selectează Simbol / Companie
              </h3>
            </div>
            <button
              type="button"
              @click="isMobilePanelOpen = false"
              class="w-8 h-8 rounded-full bg-terminal-bg border border-terminal-border flex items-center justify-center text-gray-400 hover:text-white"
            >
              <X :size="15" />
            </button>
          </div>

          <!-- Mobile Search Input Box -->
          <div class="relative flex items-center">
            <input
              ref="mobileInputRef"
              type="text"
              :value="searchQuery"
              @input="onInput"
              placeholder="Scrie minim 3 caractere (ex: TLV, MIC, AAP)..."
              class="w-full bg-terminal-bg border-2 border-terminal-accent rounded-xl px-4 py-3 text-sm font-mono font-bold text-gray-100 placeholder-gray-500 uppercase focus:outline-none shadow-inner"
            />
            <button
              v-if="searchQuery.length > 0"
              @click="triggerSearch('')"
              class="absolute right-3 text-gray-400 hover:text-white p-1 flex items-center"
            >
              <X :size="14" />
            </button>
          </div>

          <!-- Mobile Results State & Cards List -->
          <div v-if="searchQuery.trim().length < 3" class="p-6 text-center text-xs font-mono text-gray-400 bg-terminal-bg/40 rounded-2xl border border-terminal-border/50">
            <div class="text-xl mb-1">💡</div>
            <span>Tastați minim 3 caractere pentru a căuta acțiuni, ETF-uri sau companii (ex: <strong class="text-terminal-accent">TLV</strong>, <strong class="text-terminal-accent">MIC</strong>, <strong class="text-terminal-accent">AAP</strong>)</span>
          </div>

          <div v-else-if="isLoading" class="p-6 text-center text-xs font-mono text-terminal-accent flex items-center justify-center space-x-2 bg-terminal-bg/40 rounded-2xl border border-terminal-border/50">
            <span class="animate-spin text-lg">↻</span>
            <span>Caut în registrul bursier master...</span>
          </div>

          <div v-else-if="results.length === 0" class="p-6 text-center text-xs font-mono text-gray-400 space-y-2 bg-terminal-bg/40 rounded-2xl border border-terminal-border/50">
            <div class="text-xl">🔍</div>
            <div>Niciun rezultat direct pentru „<strong class="text-gray-200">{{ searchQuery }}</strong>”.</div>
            <div class="text-[11px] text-terminal-accent font-bold">✓ Se va efectua verificare live la salvare.</div>
            <button
              type="button"
              @click="isMobilePanelOpen = false"
              class="mt-2 w-full py-2 bg-terminal-accent/20 text-terminal-accent border border-terminal-accent/40 rounded-xl font-bold text-xs"
            >
              Folosește „{{ searchQuery.toUpperCase() }}”
            </button>
          </div>

          <!-- Live Results Cards -->
          <div v-else class="space-y-2.5">
            <div class="text-[10px] font-mono text-gray-400 uppercase tracking-wider px-1">
              Rezultate găsite ({{ results.length }}):
            </div>
            <div
              v-for="item in results"
              :key="item.symbol"
              @click="selectItem(item)"
              class="p-3.5 bg-terminal-bg border border-terminal-border hover:border-terminal-accent/70 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer shadow-md"
            >
              <div class="min-w-0 pr-2 space-y-1">
                <div class="flex items-center space-x-2 font-mono">
                  <span class="font-bold text-base text-gray-100 tracking-wide">{{ item.symbol }}</span>
                  <span
                    class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                    :class="item.assetType === 'ETF' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'"
                  >
                    {{ item.assetType }}
                  </span>
                </div>
                <div class="text-xs text-gray-300 font-sans line-clamp-1">
                  {{ item.companyName }}
                </div>
              </div>

              <div class="text-right shrink-0 font-mono text-xs">
                <div class="font-bold text-gray-200 flex items-center space-x-1 justify-end">
                  <span class="text-base">{{ getCountryFlag(item.country) }}</span>
                  <span>{{ item.exchange }}</span>
                </div>
                <div class="text-gray-400 text-[10px] uppercase font-bold mt-0.5">{{ item.currency }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
