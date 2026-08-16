<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../shared/composables/useToast';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import AdaptiveOverlay from '../../shared/ui/organisms/AdaptiveOverlay.vue';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const authStore = useAuthStore();
const toast = useToast();
const registering = ref(false);

const DISMISS_KEY = 'sw_passkey_prompt_dismissed';

function dismiss() {
  localStorage.setItem(DISMISS_KEY, 'true');
  emit('update:modelValue', false);
}

async function registerPasskey() {
  registering.value = true;
  try {
    const ok = await authStore.registerPasskey();
    if (ok) {
      toast.success('Passkey Saved', 'You can now sign in instantly with biometrics');
      localStorage.setItem(DISMISS_KEY, 'true');
      emit('update:modelValue', false);
    } else {
      toast.warning('Cancelled', 'Passkey registration was cancelled');
    }
  } catch (err: any) {
    const msg = err?.message || 'Could not register passkey. Try again later.';
    if (msg.includes('not implemented')) {
      toast.info('Feature Coming Soon', 'Passkey support will be activated in a future backend release.');
      localStorage.setItem(DISMISS_KEY, 'true');
      emit('update:modelValue', false);
    } else {
      toast.error('Registration Failed', msg);
    }
  } finally {
    registering.value = false;
  }
}

function shouldPrompt(): boolean {
  return !localStorage.getItem(DISMISS_KEY);
}

defineExpose({ shouldPrompt });
</script>

<template>
  <AdaptiveOverlay
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    title="Set Up Passkey"
    :max-width="440"
    initial-snap="peek"
  >
    <div class="space-y-5">
      <div class="flex justify-center">
        <div class="w-16 h-16 rounded-2xl bg-terminal-accent/10 border border-terminal-accent/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-terminal-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.399 8.017M12 10.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12 10.5v.75a1.5 1.5 0 01-3 0V10.5" />
          </svg>
        </div>
      </div>

      <div class="text-center space-y-2">
        <h3 class="text-lg font-bold text-gray-100 font-mono">Skip the password next time</h3>
        <p class="text-sm text-gray-400 leading-relaxed">
          Save a passkey to sign in instantly with your fingerprint, face, or device PIN.
          Faster, safer, and no passwords to remember.
        </p>
      </div>

      <div class="space-y-2 text-xs text-gray-500">
        <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03]">
          <span class="text-terminal-accent font-mono font-bold text-sm">01</span>
          <span>Works across all your synced devices</span>
        </div>
        <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03]">
          <span class="text-terminal-accent font-mono font-bold text-sm">02</span>
          <span>Phishing-resistant — tied to this site only</span>
        </div>
        <div class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03]">
          <span class="text-terminal-accent font-mono font-bold text-sm">03</span>
          <span>Your biometrics never leave your device</span>
        </div>
      </div>
    </div>

    <template #actions>
      <AppButton variant="ghost" size="sm" @click="dismiss">
        Not Now
      </AppButton>
      <AppButton variant="primary" size="sm" :loading="registering" @click="registerPasskey">
        Save Passkey
      </AppButton>
    </template>
  </AdaptiveOverlay>
</template>
