<script setup lang="ts">
import { ref, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useBreakpoint } from '../../composables/useBreakpoint';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    persistent?: boolean;
    initialSnap?: 'peek' | 'full';
    maxWidth?: number;
  }>(),
  {
    persistent: false,
    initialSnap: 'full',
    maxWidth: 640
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'close': [];
}>();

const { isOverlaySheet } = useBreakpoint();

const currentSnap = ref<'peek' | 'full'>(props.initialSnap);

watch(
  () => props.initialSnap,
  (val) => {
    currentSnap.value = val;
  }
);

const handleClose = () => {
  emit('update:modelValue', false);
  emit('close');
};

const toggleSnap = () => {
  currentSnap.value = currentSnap.value === 'peek' ? 'full' : 'peek';
};
</script>

<template>
  <!-- Mobile Bottom Sheet (< md) -->
  <v-bottom-sheet
    v-if="isOverlaySheet"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :persistent="persistent || false"
    inset
    class="adaptive-sheet"
    :class="currentSnap === 'peek' ? 'snap-peek' : 'snap-full'"
  >
    <div
      class="sw-glass-card border-t border-white/15 rounded-t-3xl overflow-hidden flex flex-col shadow-2xl transition-all duration-200 backdrop-blur-2xl"
      :style="{ maxHeight: currentSnap === 'peek' ? '45vh' : '90vh', minHeight: currentSnap === 'peek' ? '35vh' : '85vh' }"
      role="dialog"
      aria-modal="true"
    >
      <!-- Sheet Drag Handle / Header -->
      <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-terminal-surface-light/60 select-none">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="toggleSnap"
            class="w-10 h-1.5 bg-gray-400 hover:bg-white rounded-full cursor-pointer transition-colors"
            title="Toggle sheet height"
            aria-label="Toggle sheet snap point"
          />
          <h3 class="font-mono text-base font-bold text-gray-100 truncate">{{ title }}</h3>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="toggleSnap"
            class="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-white/15 text-gray-300 hover:text-white hover:bg-white/10"
          >
            {{ currentSnap === 'peek' ? '▲ FULL' : '▼ PEEK' }}
          </button>
          <button
            type="button"
            @click="emit('update:modelValue', false)"
            class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 flex items-center"
            aria-label="Close modal"
          >
            <X :size="16" />
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="p-5 overflow-y-auto flex-1 font-sans text-sm text-gray-300">
        <slot />
      </div>

      <!-- Footer / Actions -->
      <div v-if="$slots.actions" class="px-5 py-4 border-t border-white/10 bg-terminal-surface flex items-center justify-end space-x-3">
        <slot name="actions" />
      </div>
    </div>
  </v-bottom-sheet>

  <!-- Desktop Centered Dialog (>= md) -->
  <v-dialog
    v-else
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :persistent="persistent || false"
    :max-width="maxWidth || 600"
    scrollable
  >
    <div
      class="sw-glass-card border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-terminal-surface/90">
        <slot name="header">
          <h3 class="text-lg font-bold text-gray-100 font-mono">{{ title }}</h3>
        </slot>
        <button
          @click="handleClose"
          class="text-gray-400 hover:text-white p-1.5 rounded-lg transition-colors hover:bg-white/10 flex items-center"
          aria-label="Close dialog"
        >
          <X :size="16" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto flex-1 bg-terminal-bg/50">
        <slot />
      </div>

      <!-- Actions Footer -->
      <div v-if="$slots.actions" class="px-6 py-4 border-t border-white/10 bg-terminal-surface flex items-center justify-end space-x-3">
        <slot name="actions" />
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.adaptive-sheet {
  z-index: 2000;
}
</style>
