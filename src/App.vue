<script setup lang="ts">
import { onMounted } from 'vue';
import { useSettingsStore } from './stores/settings';
import { useThemeStore } from './stores/theme';
import { useSignalR } from './shared/composables/useSignalR';
import AppShell from './shared/ui/templates/AppShell.vue';

const settingsStore = useSettingsStore();
const signalR = useSignalR();
const themeStore = useThemeStore();

onMounted(async () => {
  await settingsStore.loadSettings();
  await signalR.start();
});
</script>

<template>
  <v-app class="bg-terminal-bg text-gray-200">
    <AppShell />
  </v-app>
</template>
