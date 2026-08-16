<script setup lang="ts">
import { computed } from 'vue';
import type { Decimal } from '../../api/types';
import { useMoney } from '../../composables/useMoney';

const props = withDefaults(
  defineProps<{
    value: Decimal | null | undefined;
    mode?: 'currency' | 'number' | 'percent' | null | undefined;
    currency?: string | null | undefined;
    places?: number | null | undefined;
    showSign?: boolean | null | undefined;
    color?: boolean | null | undefined;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | null | undefined;
  }>(),
  {
    mode: 'currency',
    currency: 'RON',
    places: 2,
    showSign: false,
    color: false,
    size: 'md'
  }
);

const money = useMoney();

const formatted = computed(() => {
  if (props.mode === 'currency') {
    return money.formatCurrency(props.value, props.currency, props.places, 'en-US', props.showSign);
  }
  if (props.mode === 'percent') {
    return money.formatPct(props.value, props.places, props.showSign);
  }
  return money.formatNum(props.value, props.places);
});

const colorClass = computed(() => {
  if (!props.color) return 'text-gray-100';
  return money.getColorClass(props.value);
});

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-base font-mono font-bold';
    case 'lg':
      return 'text-xl sm:text-2xl font-mono font-black tracking-tight';
    case 'xl':
      return 'text-3xl sm:text-4xl font-mono font-black tracking-tight';
    case '2xl':
      return 'text-4xl sm:text-5xl font-mono font-black tracking-tight';
    case '3xl':
      return 'text-5xl sm:text-6xl font-mono font-black tracking-tighter';
    case '4xl':
      return 'text-6xl sm:text-7xl font-mono font-black tracking-tighter';
    default:
      return 'text-lg font-mono font-black';
  }
});
</script>

<template>
  <span
    class="font-mono tabular-nums transition-colors duration-200 inline-block select-text sw-private"
    :class="[colorClass, sizeClass]"
  >
    {{ formatted }}
  </span>
</template>
