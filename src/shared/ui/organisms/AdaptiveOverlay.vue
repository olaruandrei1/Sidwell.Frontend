<script setup lang="ts">
import { ref } from 'vue';
import { X } from '@lucide/vue';
import { useBreakpoint } from '../../composables/useBreakpoint';

withDefaults(
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

const handleClose = () => {
  emit('update:modelValue', false);
  emit('close');
};

// ── drag-to-close on mobile bottom sheet ─────────────────────────────
const dragOffset = ref(0);
const isDragging = ref(false);
const sheetRef = ref<HTMLElement | null>(null);
let dragStartY = 0;

function pointerY(e: TouchEvent | MouseEvent): number | null {
  if ('touches' in e) return e.touches[0]?.clientY ?? null;
  return (e as MouseEvent).clientY;
}
function onDragStart(e: TouchEvent | MouseEvent) {
  const y = pointerY(e);
  if (y === null) return;
  dragStartY = y;
  isDragging.value = true;
  dragOffset.value = 0;
}
function onDragMove(e: TouchEvent | MouseEvent) {
  if (!isDragging.value) return;
  const currentY = pointerY(e);
  if (currentY === null) return;
  const delta = currentY - dragStartY;
  if (delta > 0) dragOffset.value = delta;
}
function onDragEnd() {
  if (!isDragging.value) return;
  const sheetHeight = sheetRef.value?.getBoundingClientRect().height ?? 400;
  if (dragOffset.value > sheetHeight * 0.28) {
    handleClose();
  }
  isDragging.value = false;
  dragOffset.value = 0;
}
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
  >
    <div
      ref="sheetRef"
      class="sw-glass-card border-t border-white/15 rounded-t-3xl overflow-hidden flex flex-col shadow-2xl backdrop-blur-2xl w-full"
      :style="{
        maxHeight: '92vh',
        minHeight: '55vh',
        transform: `translateY(${dragOffset}px)`,
        transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
      }"
      role="dialog"
      aria-modal="true"
    >
      <!-- Draggable handle area (top ~40px, includes title) -->
      <div
        class="px-5 pt-3 pb-3 border-b border-white/10 flex flex-col gap-2 bg-terminal-surface-light/60 select-none touch-none cursor-grab active:cursor-grabbing"
        @touchstart.passive="onDragStart"
        @touchmove.passive="onDragMove"
        @touchend="onDragEnd"
        @mousedown="onDragStart"
        @mousemove="onDragMove"
        @mouseup="onDragEnd"
        @mouseleave="onDragEnd"
      >
        <div class="w-12 h-1.5 bg-gray-500/70 rounded-full mx-auto" aria-hidden="true" />
        <div class="flex items-center justify-between gap-3">
          <h3 class="font-mono text-base font-bold text-gray-100 truncate flex-1">{{ title }}</h3>
          <button
            type="button"
            @click.stop="handleClose"
            class="shrink-0 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="p-5 overflow-y-auto flex-1 font-sans text-sm text-gray-300 overscroll-contain">
        <slot />
      </div>

      <!-- Footer / Actions -->
      <div v-if="$slots.actions" class="px-5 py-4 border-t border-white/10 bg-terminal-surface flex flex-wrap items-center justify-end gap-2">
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
          class="shrink-0 w-9 h-9 flex items-center justify-center text-gray-300 hover:text-white rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all"
          aria-label="Close dialog"
        >
          <X :size="18" />
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
