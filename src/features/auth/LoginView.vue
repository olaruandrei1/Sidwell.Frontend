<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../shared/composables/useToast';
import AppButton from '../../shared/ui/atoms/AppButton.vue';

interface RememberedAccount {
  email: string;
  displayName: string;
  photoUrl?: string | null;
  lastLoginMethod: 'google' | 'passkey';
  timestamp: number;
}

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toast = useToast();

const errorMsg = ref('');
const activeMethod = ref<'google' | 'passkey' | null>(null);
const rememberedAccount = ref<RememberedAccount | null>(null);
const showSwitchAccount = ref(false);
const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

const REMEMBERED_KEY = 'sw_remembered_account';

onMounted(() => {
  try {
    const raw = localStorage.getItem(REMEMBERED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RememberedAccount;
      if (parsed && parsed.email) {
        rememberedAccount.value = parsed;
      }
    }
  } catch {
    /* ignore parse errors */
  }
});

function saveRememberedAccount(method: 'google' | 'passkey') {
  if (!authStore.user || !authStore.user.email) return;
  const email = authStore.user.email;
  const displayName: string = authStore.user.displayName || (email.includes('@') ? email.split('@')[0] : email) || 'User';
  const acc: RememberedAccount = {
    email,
    displayName,
    photoUrl: (authStore.firebaseUser as { photoURL?: string })?.photoURL || null,
    lastLoginMethod: method,
    timestamp: Date.now(),
  };
  rememberedAccount.value = acc;
  localStorage.setItem(REMEMBERED_KEY, JSON.stringify(acc));
}

function forgetAccount() {
  localStorage.removeItem(REMEMBERED_KEY);
  rememberedAccount.value = null;
  showSwitchAccount.value = false;
}

function getRedirectTarget() {
  const redirect = route.query.redirect as string | undefined;
  return redirect && redirect !== '/login' ? redirect : '/dashboard';
}

function handleApiError(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return e instanceof Error ? e.message : 'Authentication failed';
}

function getUserInitials(name?: string | null): string {
  if (!name) return 'S';
  const parts = name.trim().split(' ');
  if (parts.length >= 2 && parts[0] && parts[1] && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const handleGoogleLogin = async () => {
  errorMsg.value = '';
  activeMethod.value = 'google';
  try {
    await authStore.loginWithGoogle();
    saveRememberedAccount('google');
    toast.success('Signed In', `Welcome back, ${authStore.user?.displayName || 'User'}`);
    router.push(getRedirectTarget());
  } catch (e) {
    const msg = handleApiError(e);
    errorMsg.value = msg.includes('popup-closed') ? 'Sign-in popup was closed.' : msg;
    toast.error('Google Login Error', errorMsg.value);
  } finally {
    activeMethod.value = null;
  }
};

const handlePasskeyLogin = async () => {
  errorMsg.value = '';
  activeMethod.value = 'passkey';
  try {
    await authStore.loginWithPasskey();
    saveRememberedAccount('passkey');
    toast.success('Signed In via Passkey', `Welcome back, ${authStore.user?.displayName || 'User'}`);
    router.push(getRedirectTarget());
  } catch (e) {
    const msg = handleApiError(e);
    errorMsg.value = msg.includes('cancelled') ? 'Passkey authentication was cancelled.' : msg;
    toast.error('Passkey Error', errorMsg.value);
  } finally {
    activeMethod.value = null;
  }
};
</script>

<template>
  <div class="min-h-[100dvh] w-full bg-terminal-bg flex flex-col items-center justify-center p-4 py-6 sm:p-6 select-none font-sans relative overflow-x-hidden overflow-y-auto">
    <!-- Ambient glowing backgrounds wrapped in fixed pointer-events-none container -->
    <div class="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div class="absolute -top-40 -left-40 sm:-top-72 sm:-left-72 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[180px] animate-pulse duration-10000"></div>
      <div class="absolute -bottom-40 -right-40 sm:-bottom-72 sm:-right-72 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-emerald-500/10 rounded-full blur-[100px] sm:blur-[180px] animate-pulse duration-7000"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] sm:w-[400px] h-[250px] sm:h-[400px] bg-purple-600/5 rounded-full blur-[90px] sm:blur-[140px]"></div>
    </div>

    <div class="max-w-md w-full my-auto space-y-5 sm:space-y-7 relative z-10">
      <!-- Top Brand Header -->
      <div class="text-center space-y-3 flex flex-col items-center">
        <div class="relative group cursor-default">
          <div class="absolute -inset-1 bg-gradient-to-r from-terminal-accent to-emerald-400 rounded-2xl blur-lg opacity-40 group-hover:opacity-75 transition duration-500"></div>
          <div class="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-terminal-card border border-white/10 flex items-center justify-center p-2 shadow-2xl">
            <img src="/favicon.svg?v=sw2026" alt="Sidwell Logo" class="w-full h-full object-contain" />
          </div>
        </div>

        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-extrabold font-mono text-gray-50 tracking-tight flex items-center justify-center gap-2">
            Sidwell
          </h1>
          <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-terminal-accent/10 border border-terminal-accent/25 rounded-full">
            <span class="w-1.5 h-1.5 rounded-full bg-terminal-accent animate-ping"></span>
            <span class="text-terminal-accent font-mono text-[10px] font-bold uppercase tracking-[0.2em]">v3 Terminal</span>
          </div>
        </div>
        <p class="text-xs text-gray-400 font-sans max-w-[280px] leading-relaxed">
          Senior-level financial intelligence & portfolio cockpit
        </p>
      </div>

      <!-- MAIN CARD AREA -->
      <div class="bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-white/[0.01] border border-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl p-5 sm:p-8 space-y-5 relative">
        
        <!-- ERROR NOTIFICATION -->
        <div v-if="errorMsg" class="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
          <svg class="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span class="text-xs text-rose-300 font-mono leading-tight">{{ errorMsg }}</span>
        </div>

        <!-- MODE 1: REMEMBERED ACCOUNT (PASSKEY FIRST) -->
        <template v-if="rememberedAccount && !showSwitchAccount">
          <div class="text-center space-y-4">
            <!-- Avatar Ring -->
            <div class="flex justify-center">
              <div class="relative">
                <div class="absolute -inset-1 bg-gradient-to-tr from-terminal-accent via-emerald-400 to-cyan-500 rounded-full blur opacity-50"></div>
                <div class="relative w-16 h-16 rounded-full bg-terminal-bg border-2 border-terminal-accent/50 flex items-center justify-center overflow-hidden shadow-xl">
                  <img
                    v-if="rememberedAccount.photoUrl"
                    :src="rememberedAccount.photoUrl"
                    :alt="rememberedAccount.displayName"
                    class="w-full h-full object-cover"
                  />
                  <span v-else class="text-lg font-bold font-mono text-terminal-accent">
                    {{ getUserInitials(rememberedAccount.displayName) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="space-y-1">
              <span class="text-[11px] font-mono uppercase tracking-widest text-terminal-accent font-semibold">Detected Account</span>
              <h2 class="text-lg font-bold text-gray-100 font-sans">
                {{ rememberedAccount.displayName }}
              </h2>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full">
                <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span class="text-xs font-mono text-gray-300 truncate max-w-[220px]">{{ rememberedAccount.email }}</span>
              </div>
            </div>
          </div>

          <!-- PRIMARY ACTION: PASSKEY BIOMETRIC -->
          <div class="space-y-3 pt-2">
            <AppButton
              type="button"
              variant="primary"
              block
              size="lg"
              :loading="activeMethod === 'passkey'"
              :disabled="!!activeMethod"
              @click="handlePasskeyLogin"
              id="btn-passkey-primary"
              class="relative overflow-hidden group shadow-lg shadow-terminal-accent/20 hover:shadow-terminal-accent/40 transition-all duration-300"
            >
              <span class="flex items-center justify-center gap-3 font-semibold text-sm">
                <!-- Biometric Fingerprint Icon -->
                <svg class="w-5 h-5 text-black group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.399 8.017M12 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 10.5v.75a1.5 1.5 0 01-3 0V10.5" />
                </svg>
                Sign In with Passkey
              </span>
            </AppButton>
            <p class="text-[11px] text-center text-gray-400 font-mono">
              ⚡ One-touch biometric sign-in (FaceID / Fingerprint / Device PIN)
            </p>

            <!-- SECONDARY ACTION: GOOGLE -->
            <AppButton
              type="button"
              variant="outline"
              block
              :loading="activeMethod === 'google'"
              :disabled="!!activeMethod"
              @click="handleGoogleLogin"
              id="btn-google-secondary"
            >
              <span class="flex items-center justify-center gap-2.5 text-xs">
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                </svg>
                Continue with Google
              </span>
            </AppButton>

            <div class="pt-2 flex justify-between items-center text-[11px] text-gray-500 font-mono">
              <button type="button" @click="showSwitchAccount = true" class="hover:text-terminal-accent transition-colors flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m-9-13.5L16.5 3.5m0 0L12 8m4.5-4.5H3" />
                </svg>
                Switch Account
              </button>
              <button type="button" @click="forgetAccount" class="hover:text-rose-400 transition-colors">
                Forget
              </button>
            </div>
          </div>
        </template>

        <!-- MODE 2: STANDARD / ALL LOGIN OPTIONS -->
        <template v-else>
          <div v-if="showSwitchAccount" class="flex justify-between items-center pb-1 border-b border-white/5">
            <span class="text-xs font-mono text-gray-400">Select Login Method</span>
            <button type="button" @click="showSwitchAccount = false" class="text-[11px] font-mono text-terminal-accent hover:underline">
              Back to remembered account
            </button>
          </div>

          <!-- Google Sign-In (Primary) -->
          <AppButton
            type="button"
            variant="primary"
            block
            size="lg"
            :loading="activeMethod === 'google'"
            :disabled="!!activeMethod"
            @click="handleGoogleLogin"
            id="btn-google-signin"
            class="shadow-lg shadow-terminal-accent/15 hover:shadow-terminal-accent/30 transition-all duration-300"
          >
            <span class="flex items-center justify-center gap-3 font-semibold text-sm">
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </span>
          </AppButton>

          <!-- Divider -->
          <div class="flex items-center gap-3">
            <div class="flex-1 h-px bg-white/10"></div>
            <span class="text-[10px] text-gray-400 font-mono uppercase tracking-[0.2em]">or use passkey</span>
            <div class="flex-1 h-px bg-white/10"></div>
          </div>

          <!-- Passkey Button -->
          <AppButton
            type="button"
            variant="outline"
            block
            size="lg"
            :loading="activeMethod === 'passkey'"
            :disabled="!!activeMethod"
            @click="handlePasskeyLogin"
            id="btn-passkey-signin"
            class="group hover:border-terminal-accent/60 transition-all duration-300"
          >
            <span class="flex items-center justify-center gap-2.5 font-medium text-sm text-gray-200">
              <svg class="w-5 h-5 text-terminal-accent group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              Sign In with Passkey
            </span>
          </AppButton>
        </template>

        <!-- SECURITY BADGES FOOTER -->
        <div class="pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-[10px] font-mono text-gray-400 text-center">
          <div class="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white/[0.02]">
            <span class="text-terminal-accent text-sm">🔒</span>
            <span class="leading-tight">256-bit Encrypted</span>
          </div>
          <div class="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white/[0.02]">
            <span class="text-terminal-accent text-sm">🛡️</span>
            <span class="leading-tight">WebAuthn Security</span>
          </div>
          <div class="flex flex-col items-center gap-1 p-1.5 rounded-xl bg-white/[0.02]">
            <span class="text-terminal-accent text-sm">⚡</span>
            <span class="leading-tight">Instant Auth</span>
          </div>
        </div>

      </div>

      <!-- Bottom Footer Info -->
      <div class="space-y-2 text-center">
        <p class="text-[10px] text-gray-500 font-mono">
          Protected by Google OAuth 2.0 & FIDO2 WebAuthn Passkeys
        </p>
        <p v-if="useMocks" class="text-[11px] text-amber-400/80 font-mono font-medium">
          ⚡ Mock mode active — Development auth active
        </p>
      </div>

    </div>
  </div>
</template>
