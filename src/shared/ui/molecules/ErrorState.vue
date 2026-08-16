<script setup lang="ts">
import AppButton from '../atoms/AppButton.vue';
import type { ApiError } from '../../api/types';

withDefaults(
  defineProps<{
    title?: string;
    message?: string;
    error?: ApiError | null;
    retryLabel?: string;
  }>(),
  {
    title: 'An error occurred',
    retryLabel: 'Retry'
  }
);

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <div class="rounded-2xl border border-terminal-down/40 bg-terminal-down/10 p-5 flex flex-col items-start space-y-2.5 select-none shadow-glow-down/10">
    <div class="flex items-center gap-2">
      <span class="text-terminal-down font-bold text-sm">⚠</span>
      <h4 class="text-sm font-mono font-bold text-terminal-down uppercase tracking-wide">
        {{ error ? `[${error.code}] ${title}` : title }}
      </h4>
    </div>
    <p class="text-xs text-gray-300 font-mono leading-relaxed">
      {{ error?.message || message || 'Request failed. Please verify your connection or try again.' }}
    </p>
    <div v-if="error?.fieldErrors" class="w-full text-xs text-gray-400 bg-terminal-bg/60 p-2.5 rounded-xl border border-white/5 font-mono">
      <div v-for="(msg, field) in error.fieldErrors" :key="field">
        • <span class="font-bold text-gray-200">{{ field }}:</span> {{ msg }}
      </div>
    </div>
    <div class="pt-2">
      <AppButton variant="danger" size="sm" @click="emit('retry')">
        {{ retryLabel }}
      </AppButton>
    </div>
  </div>
</template>
