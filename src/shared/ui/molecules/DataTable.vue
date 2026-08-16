<script setup lang="ts" generic="T extends object">
import { useBreakpoint } from '../../composables/useBreakpoint';

export interface ColumnDef<TItem extends object = object> {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  mobileCardTitle?: boolean;
  mobileCardSubtitle?: boolean;
  hideOnMobile?: boolean;
}

const props = defineProps<{
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  rowKey?: string;
}>();

const emit = defineEmits<{
  'row-click': [item: T, index: number];
}>();

defineSlots<{
  [key: string]: (props: { row: T; index: number; value?: unknown }) => any;
}>();

const { isMobile } = useBreakpoint();
</script>

<template>
  <div class="w-full">
    <!-- Desktop/Tablet Clean Table -->
    <div v-if="!isMobile" class="overflow-x-auto border border-terminal-border rounded-xl bg-terminal-surface shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-terminal-border bg-terminal-surface-light text-xs text-gray-400 uppercase tracking-wider font-semibold select-none">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 whitespace-nowrap"
              :class="[col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left']"
              :style="col.width ? { width: col.width } : {}"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-terminal-border text-sm font-sans">
          <tr v-if="loading" class="animate-pulse">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-gray-400 text-xs font-mono">
              Loading data...
            </td>
          </tr>
          <tr v-else-if="data.length === 0">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-gray-400 text-xs font-mono">
              {{ emptyMessage || 'No records available.' }}
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, idx) in data"
            :key="String((row as Record<string, unknown>)[rowKey ?? 'id'] ?? idx)"
            @click="emit('row-click', row, idx)"
            class="group hover:bg-terminal-surface-light/60 transition-colors duration-150 cursor-pointer"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 text-gray-200 whitespace-nowrap"
              :class="[col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left']"
            >
              <slot :name="`cell-${col.key}`" :row="row" :index="idx" :value="(row as Record<string, unknown>)[col.key]">
                {{ String((row as Record<string, unknown>)[col.key] ?? 'N/A') }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Horizontal Card Carousel (1 card == 1 row) -->
    <div v-else class="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-3 scrollbar-none px-1">
      <div v-if="loading" class="snap-start flex-shrink-0 w-[85vw] max-w-[320px] p-5 text-center text-xs text-gray-400 font-mono border border-terminal-border rounded-2xl bg-terminal-surface shadow-lg">
        Loading...
      </div>
      <div v-else-if="data.length === 0" class="snap-start flex-shrink-0 w-[85vw] max-w-[320px] p-5 text-center text-xs text-gray-400 font-mono border border-terminal-border rounded-2xl bg-terminal-surface shadow-lg">
        {{ emptyMessage || 'No records available.' }}
      </div>
      <div
        v-else
        v-for="(row, idx) in data"
        :key="String((row as Record<string, unknown>)[rowKey ?? 'id'] ?? idx)"
        @click="emit('row-click', row, idx)"
        class="snap-start flex-shrink-0 w-[88vw] max-w-[340px] bg-terminal-surface border border-terminal-border p-4 rounded-2xl space-y-3 active:scale-[0.99] cursor-pointer transition-all duration-150 select-none shadow-lg hover:border-terminal-accent/50"
      >
        <!-- Card Header -->
        <div class="flex items-start justify-between gap-2 border-b border-terminal-border/60 pb-3">
          <div class="flex flex-col min-w-0 pr-1">
            <slot name="mobile-header" :row="row" :index="idx">
              <span class="font-mono font-bold text-base text-gray-100 truncate">
                {{ String(('ticker' in row && row.ticker && typeof row.ticker === 'object' && 'symbol' in row.ticker ? row.ticker.symbol : null) || ('symbol' in row ? row.symbol : null) || ('name' in row ? row.name : null) || ('title' in row ? row.title : null) || `Row #${idx + 1}`) }}
              </span>
              <span
                v-if="('ticker' in row && row.ticker && typeof row.ticker === 'object' && 'name' in row.ticker) || ('subtitle' in row)"
                class="text-xs text-gray-400 font-sans truncate"
              >
                {{ String(('ticker' in row && row.ticker && typeof row.ticker === 'object' && 'name' in row.ticker ? (row.ticker as Record<string, unknown>).name : null) || ('subtitle' in row ? row.subtitle : null) || ('name' in row ? row.name : null)) }}
              </span>
            </slot>
          </div>
          <div class="flex-shrink-0 font-mono text-xs font-bold text-right">
            <slot name="mobile-badge" :row="row" :index="idx" />
          </div>
        </div>

        <!-- Key metrics list -->
        <div class="grid grid-cols-2 gap-3 text-xs font-mono">
          <div
            v-for="col in columns.filter(c => !c.mobileCardTitle && !c.mobileCardSubtitle && !c.hideOnMobile)"
            :key="col.key"
            class="flex flex-col min-w-0"
          >
            <span class="text-gray-400 uppercase text-[10px] font-mono font-bold tracking-wider truncate">{{ col.label }}</span>
            <div class="font-mono text-gray-100 font-bold text-xs sm:text-sm truncate mt-0.5">
              <slot :name="`cell-${col.key}`" :row="row" :index="idx" :value="(row as Record<string, unknown>)[col.key]">
                {{ String((row as Record<string, unknown>)[col.key] ?? 'N/A') }}
              </slot>
            </div>
          </div>
        </div>

        <!-- Optional footer slot (e.g. action buttons) -->
        <div v-if="$slots['mobile-footer']" class="pt-2.5 border-t border-terminal-border/40 mt-0.5">
          <slot name="mobile-footer" :row="row" :index="idx" />
        </div>
      </div>
    </div>
  </div>
</template>
