<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    subtitle?: string;
    highlight?: boolean;
    compact?: boolean;
  }>(),
  {
    highlight: false,
    compact: false
  }
);

const borderClass = computed(() =>
  props.highlight
    ? 'border border-terminal-accent/50 bg-terminal-surface shadow-glow-accent'
    : 'border border-terminal-border bg-terminal-surface'
);
</script>

<template>
  <div
    class="rounded-xl p-4 sm:p-5 flex flex-col justify-between select-none relative overflow-hidden transition-all duration-200 hover:border-terminal-accent/40"
    :class="borderClass"
  >
    <div class="flex items-center justify-between gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
      <span>{{ label }}</span>
      <div v-if="$slots.icon" class="text-terminal-accent shrink-0">
        <slot name="icon" />
      </div>
    </div>

    <div class="mt-2 text-2xl font-bold text-white tracking-tight tabular-nums font-mono">
      <slot />
    </div>

    <div v-if="subtitle" class="mt-2 text-xs text-gray-400 font-sans">
      {{ subtitle }}
    </div>
  </div>
</template>
