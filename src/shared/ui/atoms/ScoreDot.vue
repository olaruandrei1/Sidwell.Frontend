<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    pulse?: boolean;
  }>(),
  {
    color: '#38BDF8',
    size: 'md',
    pulse: false
  }
);

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'w-2 h-2';
    case 'lg':
      return 'w-3.5 h-3.5';
    default:
      return 'w-2.5 h-2.5';
  }
});
</script>

<template>
  <span class="inline-flex items-center justify-center">
    <span
      class="rounded-full inline-block shadow-sm"
      :class="[sizeClasses, pulse ? 'animate-pulse' : '']"
      :style="{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }"
    />
  </span>
</template>
