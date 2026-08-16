<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
  }>(),
  {
    required: false
  }
);
</script>

<template>
  <div class="mb-4">
    <label v-if="label" class="block text-xs font-mono font-bold uppercase tracking-wider text-gray-300 mb-1.5 select-none">
      {{ label }}
      <span v-if="required" class="text-terminal-accent ml-0.5">*</span>
    </label>
    <slot />
    <p v-if="error" class="mt-1.5 text-xs text-terminal-down font-mono font-semibold">
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-1.5 text-xs text-gray-400 font-sans">
      {{ hint }}
    </p>
  </div>
</template>
