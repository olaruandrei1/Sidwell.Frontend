<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button'
  }
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center font-sans font-semibold tracking-wide rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-terminal-accent/50 disabled:opacity-50 disabled:cursor-not-allowed select-none btn-press"
    :class="[
      block ? 'w-full' : '',
      size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-2.5 text-base' : 'px-4 py-2 text-sm',
      variant === 'primary' ? 'bg-terminal-accent text-terminal-bg font-bold hover:opacity-95 shadow-md shadow-glow-accent/25 hover:shadow-glow-accent/40' :
      variant === 'secondary' ? 'bg-terminal-surface text-gray-100 hover:bg-white/10 border border-terminal-border shadow-sm' :
      variant === 'outline' ? 'border border-terminal-border text-gray-200 hover:border-terminal-accent hover:text-terminal-accent bg-transparent' :
      variant === 'danger' ? 'bg-terminal-down/20 border border-terminal-down/50 text-terminal-down hover:bg-terminal-down/30 shadow-sm' :
      'text-gray-300 hover:text-white hover:bg-white/10'
    ]"
  >
    <span v-if="loading" class="mr-2 inline-block animate-spin">⟳</span>
    <slot />
  </button>
</template>
