<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string;
    height?: string;
    rounded?: 'sm' | 'md' | 'lg' | 'full';
  }>(),
  {
    width: '100%',
    height: '1rem',
    rounded: 'md'
  }
);
</script>

<template>
  <div
    class="shimmer-bg bg-terminal-surface-light/70 inline-block"
    :class="{
      'rounded-sm': rounded === 'sm',
      'rounded-md': rounded === 'md',
      'rounded-lg': rounded === 'lg',
      'rounded-full': rounded === 'full'
    }"
    :style="{ width, height }"
  />
</template>
