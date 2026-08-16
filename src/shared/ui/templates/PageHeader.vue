<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    badge?: string;
  }>(),
  {}
);
</script>

<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-terminal-border pb-4 mb-6 gap-4 select-none">
    <div>
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-terminal-accent font-sans">
          {{ title }}
        </h1>
        <span
          v-if="badge"
          class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-terminal-accent/15 text-terminal-accent border border-terminal-accent/30 uppercase tracking-wider"
        >
          {{ badge }}
        </span>
      </div>
      <p v-if="subtitle" class="mt-1 text-sm text-gray-400 font-sans leading-relaxed">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
      <slot name="actions" />
    </div>
  </div>
</template>
