<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'accent' | 'up' | 'down' | 'info';
    size?: 'sm' | 'md';
    pulse?: boolean;
  }>(),
  {
    variant: 'default',
    size: 'sm',
    pulse: false
  }
);
</script>

<template>
  <span
    class="inline-flex items-center font-mono font-black uppercase tracking-wider rounded-xl border transition-colors duration-200 select-none shadow-sm"
    :class="[
      size === 'sm' ? 'px-3 py-1 text-xs font-black' : 'px-4 py-1.5 text-sm font-black',
      variant === 'accent' ? 'bg-terminal-accent/20 text-terminal-accent border-terminal-accent/50 shadow-glow-accent/20' :
      variant === 'up' ? 'bg-terminal-up/20 text-terminal-up border-terminal-up/50 shadow-glow-up/20' :
      variant === 'down' ? 'bg-terminal-down/20 text-terminal-down border-terminal-down/50 shadow-glow-down/20' :
      variant === 'info' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
      'bg-terminal-surface-light text-gray-200 border-white/15'
    ]"
  >
    <span v-if="pulse" class="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse bg-current" />
    <slot />
  </span>
</template>
