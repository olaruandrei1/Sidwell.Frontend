<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAdminWhoamiQuery, useAdminUsersQuery, useGrantAccessMutation, useRevokeAccessMutation } from '../../../queries/useAdminQuery';
import { useToast } from '../../../shared/composables/useToast';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';

const toast = useToast();

// ── Whoami ──────────────────────────────────────────────────────────────────
const { data: whoami } = useAdminWhoamiQuery();
const isAdmin = computed(() => whoami.value?.isAdmin === true);

// ── Users ────────────────────────────────────────────────────────────────────
const { data: users, isLoading, refetch } = useAdminUsersQuery(isAdmin.value);

// ── Grant access form ────────────────────────────────────────────────────────
const showGrantForm = ref(false);
const grantEmail = ref('');
const { mutateAsync: grantAccess, isPending: granting } = useGrantAccessMutation();
const { mutateAsync: revokeAccess } = useRevokeAccessMutation();

const confirmRevoke = ref<string | null>(null);

async function handleGrant() {
  if (!grantEmail.value) return;
  try {
    await grantAccess(grantEmail.value);
    toast.success('Access Granted', `${grantEmail.value} has been whitelisted.`);
    grantEmail.value = '';
    showGrantForm.value = false;
    refetch();
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Failed to grant access';
    toast.error('Error', msg);
  }
}

async function handleRevoke(email: string) {
  try {
    await revokeAccess(email);
    toast.warning('Access Revoked', `${email} has been removed from whitelist.`);
    confirmRevoke.value = null;
    refetch();
  } catch (e: unknown) {
    const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Failed to revoke access';
    toast.error('Error', msg);
  }
}
</script>

<template>
  <!-- Only visible to admins -->
  <div v-if="isAdmin" class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="font-mono text-xs font-bold text-terminal-accent uppercase tracking-widest">
          Admin — User Management
        </h3>
        <p class="text-xs text-gray-500 mt-0.5">
          Manage access whitelist and user roles.
        </p>
      </div>
      <AppButton
        variant="primary"
        size="sm"
        @click="showGrantForm = !showGrantForm"
        id="btn-grant-access-toggle"
      >
        {{ showGrantForm ? '— Cancel' : '+ Grant Access' }}
      </AppButton>
    </div>

    <!-- Grant Access Form -->
    <transition name="fade">
      <div
        v-if="showGrantForm"
        class="border border-terminal-accent/30 bg-terminal-accent/5 rounded-lg p-4 space-y-3"
      >
        <p class="text-xs font-mono text-terminal-accent font-bold uppercase tracking-wider">
          Whitelist New Email
        </p>
        <div class="flex gap-2">
          <AppInput
            v-model="grantEmail"
            type="email"
            placeholder="user@domain.com"
            monospace
            class="flex-1"
            id="input-grant-email"
            @keydown.enter="handleGrant"
          />
          <AppButton
            variant="primary"
            :loading="granting"
            @click="handleGrant"
            id="btn-confirm-grant"
          >
            Grant
          </AppButton>
        </div>
      </div>
    </transition>

    <!-- Users Table -->
    <div class="border border-white/10 rounded-2xl overflow-x-auto sw-glass-card shadow-lg">
      <div v-if="isLoading" class="p-6 text-center text-xs text-gray-400 font-mono animate-pulse">
        Loading users...
      </div>
      <table v-else class="w-full text-left text-xs border-collapse">
        <thead class="bg-terminal-surface-light/60 border-b border-white/10">
          <tr class="text-gray-400 uppercase tracking-wider font-bold">
            <th class="px-4 py-3">Email</th>
            <th class="px-4 py-3">Display Name</th>
            <th class="px-4 py-3 text-center">Admin</th>
            <th class="px-4 py-3 text-center">Whitelisted</th>
            <th class="px-4 py-3">Created</th>
            <th class="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-white/5 font-mono">
          <tr v-if="!users || users.length === 0">
            <td colspan="6" class="px-4 py-6 text-center text-gray-500 font-mono">
              No users found.
            </td>
          </tr>
          <tr
            v-for="u in users"
            :key="u.id"
            class="hover:bg-terminal-surface/60 transition-colors"
          >
            <td class="px-4 py-2.5 font-mono text-gray-200">{{ u.email }}</td>
            <td class="px-4 py-2.5 text-gray-400">{{ u.displayName ?? '—' }}</td>
            <td class="px-4 py-2.5 text-center">
              <span
                v-if="u.isAdmin"
                class="inline-block px-2 py-0.5 rounded-full bg-terminal-accent/15 text-terminal-accent font-mono text-[10px] font-bold"
              >
                ADMIN
              </span>
              <span v-else class="text-gray-600">—</span>
            </td>
            <td class="px-4 py-2.5 text-center">
              <span
                class="inline-block px-2 py-0.5 rounded-full font-mono text-[10px] font-bold"
                :class="u.whitelisted
                  ? 'bg-terminal-up/15 text-terminal-up'
                  : 'bg-terminal-down/10 text-terminal-down'"
              >
                {{ u.whitelisted ? 'YES' : 'NO' }}
              </span>
            </td>
            <td class="px-4 py-2.5 text-gray-500 font-mono">
              {{ new Date(u.createdAt).toLocaleDateString() }}
            </td>
            <td class="px-4 py-2.5 text-right">
              <template v-if="u.whitelisted">
                <span v-if="confirmRevoke === u.email" class="flex items-center justify-end gap-2">
                  <span class="text-terminal-down text-[11px] font-mono">Confirm?</span>
                  <button
                    class="text-[11px] text-terminal-down font-mono hover:underline"
                    @click="handleRevoke(u.email)"
                  >Yes</button>
                  <button
                    class="text-[11px] text-gray-400 font-mono hover:underline"
                    @click="confirmRevoke = null"
                  >No</button>
                </span>
                <button
                  v-else
                  class="text-[11px] font-mono text-gray-400 hover:text-terminal-down transition-colors"
                  @click="confirmRevoke = u.email"
                  :id="`btn-revoke-${u.id}`"
                >
                  Revoke
                </button>
              </template>
              <button
                v-else
                class="text-[11px] font-mono text-terminal-accent hover:underline"
                @click="grantAccess(u.email).then(() => refetch())"
              >
                Grant
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
