<script setup lang="ts">
import AppButton from '../atoms/AppButton.vue';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    actionLabel?: string;
    compact?: boolean;
  }>(),
  {
    compact: false
  }
);

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-white/15 bg-terminal-surface/40 sw-glass-card select-none"
    :class="compact ? 'p-6' : 'p-10 sm:p-14'"
  >
    <div class="text-3xl text-gray-500 mb-2.5">
      <slot name="icon">∅</slot>
    </div>
    <h3 class="text-sm font-mono font-bold text-gray-200 uppercase tracking-wider">
      {{ title }}
    </h3>
    <p v-if="description" class="mt-1.5 text-xs text-gray-400 max-w-sm font-sans leading-relaxed">
      {{ description }}
    </p>
    <div v-if="actionLabel || $slots.action" class="mt-5">
      <slot name="action">
        <AppButton variant="outline" size="sm" @click="emit('action')">
          {{ actionLabel }}
        </AppButton>
      </slot>
    </div>
  </div>
</template>
