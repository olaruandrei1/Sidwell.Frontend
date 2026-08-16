<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Check } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { api } from '../../shared/api/client';
import { useToast } from '../../shared/composables/useToast';
import PageHeader from '../../shared/ui/templates/PageHeader.vue';
import EmptyState from '../../shared/ui/molecules/EmptyState.vue';
import TagBadge from '../../shared/ui/atoms/TagBadge.vue';
import AppButton from '../../shared/ui/atoms/AppButton.vue';
import { formatDateTime } from '../../shared/utils/format';
import type { NotificationDto } from '../../shared/api/types';

const { t } = useI18n();
const toast = useToast();
const notifications = ref<NotificationDto[]>([]);
const loading = ref(false);

const fetchNotifications = async () => {
  loading.value = true;
  try {
    const data = await api.get<NotificationDto[]>('/notifications');
    notifications.value = data;
  } catch (e) {
    console.error('Failed to load notifications:', e);
  } finally {
    loading.value = false;
  }
};

const handleMarkRead = async (id: string) => {
  try {
    await api.post(`/notifications/${id}/read`);
    notifications.value = notifications.value.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    toast.info('Marked Read', 'Notification status updated.');
  } catch (e: unknown) {
    toast.error('Update Failed', e instanceof Error ? e.message : 'Error marking notification read');
  }
};

const handleMarkAllRead = async () => {
  for (const n of notifications.value.filter((x) => !x.isRead)) {
    await handleMarkRead(n.id);
  }
};

onMounted(() => {
  fetchNotifications();
});
</script>

<template>
  <div class="space-y-6 w-full max-w-none select-none font-sans">
    <PageHeader
      :title="t('alerts.title')"
      :subtitle="t('alerts.subtitle')"
    >
      <template #actions>
        <AppButton
          variant="outline"
          size="md"
          @click="handleMarkAllRead"
          :disabled="notifications.every((n) => n.isRead)"
          class="shadow-sm font-bold"
        >
          {{ t('alerts.markAllRead') }}
        </AppButton>
      </template>
    </PageHeader>

    <div v-if="loading" class="py-12 text-center text-sm text-gray-300 font-mono animate-pulse">
      {{ t('alerts.loading') }}
    </div>

    <EmptyState
      v-else-if="notifications.length === 0"
      :title="t('alerts.emptyTitle')"
      :description="t('alerts.emptyDesc')"
    />

    <div v-else class="space-y-4">
      <!-- Status summary banner (Large Print) -->
      <div class="flex items-center justify-between px-5 py-4 sw-glass-card border border-white/15 rounded-2xl text-sm sm:text-base font-mono text-gray-300 shadow-md">
        <div class="flex items-center gap-3">
          <span>🔔 Total notificări: <strong class="text-white font-black">{{ notifications.length }}</strong></span>
          <span>·</span>
          <span>Necitite: <strong class="text-terminal-accent font-black">{{ notifications.filter(n => !n.isRead).length }}</strong></span>
        </div>
      </div>

      <div
        v-for="item in notifications"
        :key="item.id"
        class="border rounded-3xl p-6 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-5 select-none card-hover"
        :class="item.isRead ? 'border-white/10 bg-white/[0.02] opacity-60' : 'sw-glass-card border-white/15 shadow-xl hover:border-terminal-accent/50'"
      >
        <div class="space-y-2 flex-1 min-w-0">
          <div class="flex items-center flex-wrap gap-3">
            <span class="font-mono font-black text-lg text-white">{{ item.title }}</span>
            <TagBadge
              :variant="item.type === 'JOB_FAILED' ? 'down' : item.type === 'ALERT' ? 'accent' : 'default'"
              size="sm"
            >
              {{ item.type }}
            </TagBadge>
          </div>
          <p class="text-base text-gray-300 font-sans font-medium leading-relaxed">{{ item.body }}</p>
          <span class="block text-xs font-mono text-gray-400 uppercase tracking-wider">{{ formatDateTime(item.createdAt) }}</span>
        </div>

        <div v-if="!item.isRead" class="flex-shrink-0 self-start sm:self-center">
          <button
            @click="handleMarkRead(item.id)"
            class="px-4 py-2 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-terminal-accent/50 text-sm font-mono font-bold text-white transition-all duration-200 shadow-sm"
          >
            <span class="flex items-center gap-1.5"><Check :size="14" /> {{ t('alerts.markRead') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
