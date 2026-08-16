<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  subtitle?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 cubic-bezier(0.16, 1, 0.3, 1)"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none"
        @click.self="emit('close')"
      >
        <div class="sw-glass-card border border-white/15 rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden">
          <div class="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-terminal-bg/80">
            <div>
              <h3 class="text-base font-mono font-bold text-gray-100 uppercase tracking-wider">
                {{ title }}
              </h3>
              <p v-if="subtitle" class="text-xs text-gray-400 mt-0.5 font-mono">
                {{ subtitle }}
              </p>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 flex items-center"
              @click="emit('close')"
            >
              <X :size="16" />
            </button>
          </div>

          <div class="p-6">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
