<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useVapidKeyQuery, useWebPushSubscribeMutation } from '../../../queries/useWebPushQuery';
import { useToast } from '../../../shared/composables/useToast';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';

const toast = useToast();
const { data: vapidData } = useVapidKeyQuery();
const { mutateAsync: subscribeWebPush, isPending: subscribing } = useWebPushSubscribeMutation();

const permissionState = ref<NotificationPermission>('default');
const showOverlay = ref(false);

onMounted(() => {
  if ('Notification' in window) {
    permissionState.value = Notification.permission;
  }
});

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function handleEnablePush() {
  showOverlay.value = false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    toast.error('Not Supported', 'WebPush notifications are not supported by this browser.');
    return;
  }

  try {
    const perm = await Notification.requestPermission();
    permissionState.value = perm;

    if (perm === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      const key = vapidData.value?.publicKey || 'BEl62iUYgUivxIkv69yViEuiBIa45b8h...'; // Fallback
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });

      await subscribeWebPush(subscription.toJSON());
      toast.success('Notifications Enabled', 'You will receive critical financial and price drop alerts.');
    } else if (perm === 'denied') {
      toast.warning('Permission Denied', 'Notifications were blocked in your browser settings.');
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to enable push notifications';
    toast.error('Setup Error', msg);
  }
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-mono text-sm font-bold text-gray-100 uppercase tracking-wider">
        WebPush Notifications
      </h3>
      <p class="text-xs text-gray-400 mt-1 font-sans">
        Receive real-time alerts for SEC filings, price drops, and dividend updates.
      </p>
    </div>

    <div class="border border-white/10 sw-glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-2xl bg-terminal-accent/15 border border-terminal-accent/30 flex items-center justify-center text-terminal-accent shadow-sm">
          🔔
        </div>
        <div>
          <p class="text-sm font-mono font-bold text-gray-200">
            Push Notification Status
          </p>
          <p class="text-xs font-mono text-gray-400 mt-0.5">
            Current permission: 
            <span
              class="font-bold uppercase"
              :class="{
                'text-emerald-400': permissionState === 'granted',
                'text-amber-400': permissionState === 'default',
                'text-rose-400': permissionState === 'denied'
              }"
            >
              {{ permissionState }}
            </span>
          </p>
        </div>
      </div>

      <AppButton
        v-if="permissionState !== 'granted'"
        variant="primary"
        size="sm"
        @click="showOverlay = true"
        id="btn-enable-push"
        class="self-start sm:self-auto shadow-glow-accent/20"
      >
        Enable Notifications
      </AppButton>
      <span v-else class="text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
        ✓ Active
      </span>
    </div>

    <!-- Custom AdaptiveOverlay dialog -->
    <AdaptiveOverlay
      v-model="showOverlay"
      title="Enable Real-Time Alerts"
    >
      <div class="space-y-4 p-1">
        <p class="text-xs text-gray-300">
          Sidwell Terminal can send you instant push notifications for:
        </p>
        <ul class="text-xs text-gray-400 space-y-1.5 list-disc list-inside font-mono">
          <li>Critical price drops on your watchlist tickers</li>
          <li>New SEC filings &amp; earnings announcements</li>
          <li>Dividend payment execution &amp; broker fee updates</li>
        </ul>
        <p class="text-[11px] text-gray-500">
          You can revoke this permission anytime from your browser settings.
        </p>
        <div class="pt-2 flex justify-end gap-2">
          <AppButton variant="ghost" size="sm" @click="showOverlay = false">
            Cancel
          </AppButton>
          <AppButton variant="primary" size="sm" :loading="subscribing" @click="handleEnablePush">
            Allow Notifications
          </AppButton>
        </div>
      </div>
    </AdaptiveOverlay>
  </div>
</template>
