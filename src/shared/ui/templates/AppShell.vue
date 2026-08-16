<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { X } from '@lucide/vue';
import { useRoute } from 'vue-router';
import AppNavbar from '../organisms/AppNavbar.vue';
import PasskeySetupPrompt from '../../../features/auth/PasskeySetupPrompt.vue';
import { useToast } from '../../composables/useToast';
import { useAuthStore } from '../../../stores/auth';
import { computed } from 'vue';

const route = useRoute();
const authStore = useAuthStore();
const showNavbar = computed(() => !route.meta.public);

const { toasts, dismiss } = useToast();
const isOffline = ref(!navigator.onLine);

const showPasskeyPrompt = ref(false);
const passkeyPromptRef = ref<InstanceType<typeof PasskeySetupPrompt> | null>(null);

watch(() => authStore.isAuthenticated, (authed) => {
  if (authed && !localStorage.getItem('sw_passkey_prompt_dismissed')) {
    setTimeout(() => { showPasskeyPrompt.value = true; }, 1500);
  }
}, { immediate: true });

const handleOnline = () => { isOffline.value = false; };
const handleOffline = () => { isOffline.value = true; };

onMounted(() => {
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});
</script>

<template>
  <div class="min-h-screen bg-terminal-bg text-gray-100 flex flex-col font-sans selection:bg-terminal-accent/30 selection:text-white relative overflow-x-hidden">
    <!-- Ambient Aurora Neon Background Glows (Apex Aesthetic) -->
    <div class="pointer-events-none fixed -top-40 -left-40 w-96 h-96 rounded-full bg-terminal-accent/10 blur-[130px] z-0" />
    <div class="pointer-events-none fixed top-1/3 -right-40 w-96 h-96 rounded-full bg-terminal-purple/10 blur-[140px] z-0" />
    <div class="pointer-events-none fixed -bottom-40 left-1/3 w-96 h-96 rounded-full bg-emerald-500/10 blur-[130px] z-0" />

    <AppNavbar v-if="showNavbar" class="relative z-40" />

    <!-- Offline banner -->
    <div
      v-if="isOffline"
      class="bg-terminal-down/95 text-white text-center py-2.5 px-4 text-sm font-mono font-bold tracking-wide uppercase select-none shadow-lg flex items-center justify-center gap-2 animate-pulse relative z-50"
    >
      <span>⚠ OFFLINE MODE — NETWORK UNAVAILABLE. DATA MAY BE STALE AND WRITES ARE DISABLED.</span>
    </div>

    <!-- Main content — generous padding and large typography spacing -->
    <main
      :class="[
        showNavbar ? 'pb-52 md:pb-16' : '',
        'flex-1 py-6 md:py-8 px-4 sm:px-6 md:px-8 w-full max-w-none relative z-10',
      ]"
    >
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- Passkey setup prompt (shows after login) -->
    <PasskeySetupPrompt
      ref="passkeyPromptRef"
      v-model="showPasskeyPrompt"
    />

    <!-- Toast notifications -->
    <div class="fixed bottom-24 md:bottom-32 right-4 z-50 flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto rounded-2xl border shadow-2xl p-4 flex items-start justify-between gap-3 backdrop-blur-xl transition-all duration-300 font-sans text-sm"
          :class="[
            toast.type === 'success' ? 'bg-terminal-surface/95 border-terminal-up/40 text-terminal-up shadow-glow-up/20' :
            toast.type === 'error' ? 'bg-terminal-surface/95 border-terminal-down/40 text-terminal-down shadow-glow-down/20' :
            toast.type === 'warning' ? 'bg-terminal-surface/95 border-amber-500/40 text-amber-400' :
            'bg-terminal-surface/95 border-terminal-accent/40 text-terminal-accent shadow-glow-accent/20'
          ]"
        >
          <div class="flex flex-col">
            <span class="font-mono font-bold uppercase tracking-wider text-xs">{{ toast.title }}</span>
            <span v-if="toast.message" class="text-gray-300 text-xs mt-1 leading-relaxed">{{ toast.message }}</span>
          </div>
          <button
            @click="dismiss(toast.id)"
            class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center"
          >
            <X :size="14" />
          </button>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<style scoped>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.95);
}
</style>
