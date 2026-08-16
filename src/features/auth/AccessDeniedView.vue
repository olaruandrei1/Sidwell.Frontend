<script setup lang="ts">
import { useRouter } from 'vue-router';
import AppButton from '../../shared/ui/atoms/AppButton.vue';

const router = useRouter();
</script>

<template>
  <div class="min-h-screen bg-terminal-bg flex items-center justify-center p-4 select-none font-sans relative overflow-hidden">
    <!-- Ambient decorative blobs -->
    <div class="absolute -top-40 -left-40 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-terminal-accent/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="max-w-lg w-full text-center space-y-8 relative z-10 sw-glass-card border border-white/15 rounded-3xl shadow-2xl p-8 sm:p-10">
      <!-- Icon -->
      <div class="flex justify-center">
        <div class="w-20 h-20 rounded-3xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shadow-lg">
          <svg class="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
      </div>

      <!-- Content -->
      <div class="space-y-3">
        <div class="inline-block px-3.5 py-1 bg-rose-500/15 border border-rose-500/30 rounded-full text-rose-300 font-mono text-xs font-bold uppercase tracking-widest shadow-sm">
          403 — Access Denied
        </div>
        <h1 class="text-3xl font-bold font-mono text-gray-100 tracking-tight">
          You don't have access
        </h1>
        <p class="text-gray-400 text-sm font-sans max-w-sm mx-auto leading-relaxed">
          Your account is not whitelisted for Sidwell Terminal.
          Contact an administrator to request access.
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3.5 justify-center pt-2">
        <AppButton
          variant="outline"
          @click="router.push({ name: 'login' })"
          id="btn-back-login"
          class="shadow-sm hover:border-white/40"
        >
          ← Back to Sign In
        </AppButton>
        <a
          href="mailto:admin@sidwell.app?subject=Access Request — Sidwell Terminal"
          class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-terminal-accent/40 bg-terminal-accent/10 text-terminal-accent font-mono font-bold text-xs uppercase tracking-wider hover:bg-terminal-accent/20 transition-colors shadow-glow-accent/20"
          id="link-request-access"
        >
          ✉ Request Access
        </a>
      </div>

      <!-- Footer -->
      <p class="text-xs text-gray-500 font-mono pt-4 border-t border-white/10">
        Sidwell v3 Terminal — Private access only
      </p>
    </div>
  </div>
</template>
