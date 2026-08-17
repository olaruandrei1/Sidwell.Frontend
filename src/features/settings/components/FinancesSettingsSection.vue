<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFinanceSettingsQuery, useUpdateFinanceSettingsMutation } from '../../../queries/useFinancesQuery';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AppInput from '../../../shared/ui/atoms/AppInput.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';
import { computed } from 'vue';
import type { FinanceCategoryType, FinanceCategoryDef, FinanceCategoryTypeDef } from '../../../shared/api/types';

const { t } = useI18n();
const { data: settings } = useFinanceSettingsQuery();
const updateSettingsMutation = useUpdateFinanceSettingsMutation();

const BUILTIN_TYPE_CODES: FinanceCategoryType[] = ['LOAN', 'SUBSCRIPTION', 'UTILITY', 'FOOD', 'VARIABLE', 'CIGARETTES', 'OTHER'];

const newCatName = ref('');
const newCatType = ref<FinanceCategoryType>('SUBSCRIPTION');

const editingCatId = ref<string | null>(null);
const editCatName = ref('');
const editCatType = ref<FinanceCategoryType>('SUBSCRIPTION');

const newBankName = ref('');
const newBrokerName = ref('');
const newTypeLabel = ref('');

// Builtin types keep their translated label; custom ones (from settings.categoryTypes) show
// the user-entered label as-is since they don't exist in any locale file.
const ALL_TYPES = computed<{ value: FinanceCategoryType; label: string }[]>(() => [
  ...BUILTIN_TYPE_CODES.map((code) => ({ value: code, label: t('enums.' + code, code) })),
  ...(settings.value?.categoryTypes ?? []).map((ct) => ({ value: ct.code, label: ct.label }))
]);

function getTypeLabel(type: FinanceCategoryType) {
  const custom = settings.value?.categoryTypes?.find((ct) => ct.code === type);
  if (custom) return custom.label;
  return t('enums.' + type, type);
}

const COMBINING_DIACRITICS = new RegExp('[̀-ͯ]', 'g');

function slugifyTypeCode(label: string): string {
  const base = label
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
  return base || `TYPE_${Date.now()}`;
}

function isTypeInUse(code: string): boolean {
  return (settings.value?.categories ?? []).some((c) => c.type === code);
}

async function handleAddType() {
  if (!settings.value || !newTypeLabel.value.trim()) return;
  const label = newTypeLabel.value.trim();
  let code = slugifyTypeCode(label);
  const existingCodes = new Set([...BUILTIN_TYPE_CODES, ...(settings.value.categoryTypes ?? []).map((ct) => ct.code)]);
  if (existingCodes.has(code)) code = `${code}_${Date.now().toString(36).toUpperCase()}`.slice(0, 20);

  const nextType: FinanceCategoryTypeDef = { code, label };
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    categoryTypes: [...(settings.value.categoryTypes ?? []), nextType]
  });
  newTypeLabel.value = '';
}

async function handleRemoveType(code: string) {
  if (!settings.value || isTypeInUse(code)) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    categoryTypes: (settings.value.categoryTypes ?? []).filter((ct) => ct.code !== code)
  });
}

function startEdit(cat: FinanceCategoryDef) {
  editingCatId.value = cat.id;
  editCatName.value = cat.name;
  editCatType.value = cat.type;
}

function cancelEdit() {
  editingCatId.value = null;
  editCatName.value = '';
}

async function handleAddCategory() {
  if (!settings.value || !newCatName.value) return;
  const nextCat: FinanceCategoryDef = {
    id: `cat-custom-${Date.now()}`,
    name: newCatName.value.trim(),
    type: newCatType.value,
    isDefault: false
  };
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    categories: [...settings.value.categories, nextCat]
  });
  newCatName.value = '';
}

async function handleUpdateCategory() {
  if (!settings.value || !editingCatId.value || !editCatName.value) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    categories: settings.value.categories.map((c) =>
      c.id === editingCatId.value
        ? { ...c, name: editCatName.value.trim(), type: editCatType.value }
        : c
    )
  });
  cancelEdit();
}

async function handleRemoveCategory(catId: string) {
  if (!settings.value) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    categories: settings.value.categories.filter((c) => c.id !== catId)
  });
  if (editingCatId.value === catId) cancelEdit();
}

async function handleAddBank() {
  if (!settings.value || !newBankName.value) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    banks: [...settings.value.banks, newBankName.value.trim()]
  });
  newBankName.value = '';
}

async function handleRemoveBank(bankName: string) {
  if (!settings.value) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    banks: settings.value.banks.filter((b) => b !== bankName)
  });
}

async function handleAddBroker() {
  if (!settings.value || !newBrokerName.value) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    brokers: [...settings.value.brokers, newBrokerName.value.trim()]
  });
  newBrokerName.value = '';
}

async function handleRemoveBroker(brokerName: string) {
  if (!settings.value) return;
  await updateSettingsMutation.mutateAsync({
    ...settings.value,
    brokers: settings.value.brokers.filter((b) => b !== brokerName)
  });
}
</script>

<template>
  <section id="finances" class="space-y-4 select-none">
    <div class="flex items-center gap-3 border-b border-white/8 pb-3">
      <span class="text-xl">💰</span>
      <div>
        <h2 class="text-lg font-sans font-bold uppercase tracking-wide text-gray-100">
          {{ t('settings.financesEnumsTitle') }}
        </h2>
        <p class="text-xs text-gray-500 font-sans mt-0.5">
          {{ t('settings.financesEnumsSubtitle') }}
        </p>
      </div>
    </div>

    <div v-if="!settings" class="py-6 text-center text-sm text-gray-500 font-mono animate-pulse">
      Se încarcă setările...
    </div>

    <template v-else>
      <!-- ── Categories ─────────────────────────────────────────────── -->
      <div class="sw-glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <h3 class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider">
          {{ t('settings.categoriesTitle') }}
        </h3>

        <!-- Add form -->
        <form @submit.prevent="handleAddCategory" class="flex flex-col sm:flex-row items-end gap-3 pb-4 border-b border-white/10">
          <div class="flex-1 w-full">
            <FormField :label="t('settings.newCategoryName')">
              <AppInput v-model="newCatName" placeholder="ex: Google One / Factură Apa Nova / OMV" />
            </FormField>
          </div>
          <div class="w-full sm:w-52">
            <FormField :label="t('settings.typeSection')">
              <select
                v-model="newCatType"
                class="w-full bg-terminal-bg/70 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 h-[38px] focus:outline-none focus:border-terminal-accent transition-colors"
              >
                <option v-for="opt in ALL_TYPES" :key="opt.value" :value="opt.value">
                  {{ getTypeLabel(opt.value) }}
                </option>
              </select>
            </FormField>
          </div>
          <AppButton type="submit" variant="primary" :disabled="!newCatName" class="w-full sm:w-auto">
            {{ t('settings.addCategoryBtn') }}
          </AppButton>
        </form>

        <!-- Category list -->
        <div class="space-y-2">
          <div
            v-for="cat in settings.categories"
            :key="cat.id"
          >
            <!-- Edit mode -->
            <div
              v-if="editingCatId === cat.id"
              class="flex flex-col sm:flex-row items-end gap-2 p-3 rounded-xl bg-terminal-accent/10 border border-terminal-accent/40"
            >
              <div class="flex-1 w-full">
                <AppInput v-model="editCatName" class="text-xs" />
              </div>
              <div class="w-full sm:w-44">
                <select
                  v-model="editCatType"
                  class="w-full bg-terminal-bg border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 h-[34px] focus:outline-none focus:border-terminal-accent transition-colors"
                >
                  <option v-for="opt in ALL_TYPES" :key="opt.value" :value="opt.value">
                    {{ getTypeLabel(opt.value) }}
                  </option>
                </select>
              </div>
              <div class="flex gap-2 shrink-0">
                <AppButton type="button" variant="primary" size="sm" :disabled="!editCatName" @click="handleUpdateCategory">
                  Salvează
                </AppButton>
                <AppButton type="button" variant="outline" size="sm" @click="cancelEdit">
                  Anulează
                </AppButton>
              </div>
            </div>

            <!-- Read mode -->
            <div
              v-else
              class="flex items-center justify-between px-3.5 py-2 rounded-xl border bg-white/5 border-white/10 hover:border-white/20 transition-all duration-200 group cursor-pointer"
              @click="startEdit(cat)"
              :title="'Click pentru a edita'"
            >
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-mono font-bold text-gray-200 truncate">{{ cat.name }}</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/8 text-gray-400 uppercase shrink-0">
                  {{ getTypeLabel(cat.type) }}
                </span>
                <span v-if="cat.isDefault" class="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-terminal-accent/20 text-terminal-accent uppercase shrink-0">
                  default
                </span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] text-gray-600 group-hover:text-gray-400 font-mono transition-colors hidden sm:inline">
                  ✎ edit
                </span>
                <button
                  type="button"
                  class="text-gray-500 hover:text-rose-400 font-bold text-xs transition-colors px-1"
                  @click.stop="handleRemoveCategory(cat.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div v-if="settings.categories.length === 0" class="py-4 text-center text-xs text-gray-500 font-mono">
            Nicio categorie definită. Adaugă prima categorie mai sus.
          </div>
        </div>
      </div>

      <!-- ── Custom TIP / SECȚIUNE values ──────────────────────────────── -->
      <div class="sw-glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
        <h3 class="text-xs font-mono font-bold text-terminal-accent uppercase tracking-wider">
          {{ t('settings.typesTitle') }}
        </h3>
        <p class="text-[11px] text-gray-500 font-sans -mt-2">{{ t('settings.typesSubtitle') }}</p>

        <form @submit.prevent="handleAddType" class="flex items-center gap-2">
          <AppInput v-model="newTypeLabel" :placeholder="t('settings.newTypeName')" class="flex-1" />
          <AppButton type="submit" variant="secondary" size="sm" :disabled="!newTypeLabel.trim()">
            {{ t('settings.addTypeBtn') }}
          </AppButton>
        </form>

        <div class="flex flex-wrap gap-2">
          <div
            v-for="ct in settings.categoryTypes"
            :key="ct.code"
            class="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-gray-200 hover:border-white/20 transition-all"
          >
            <span>{{ ct.label }}</span>
            <button
              type="button"
              class="font-bold transition-colors"
              :class="isTypeInUse(ct.code) ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-rose-400'"
              :disabled="isTypeInUse(ct.code)"
              :title="isTypeInUse(ct.code) ? t('settings.typeInUse') : ''"
              @click="handleRemoveType(ct.code)"
            >✕</button>
          </div>
          <div v-if="!settings.categoryTypes || settings.categoryTypes.length === 0" class="text-xs text-gray-500 font-mono py-1">
            {{ t('settings.noCustomTypes') }}
          </div>
        </div>
      </div>

      <!-- ── Banks & Brokers ─────────────────────────────────────────── -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Banks -->
        <div class="sw-glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
            {{ t('settings.banksTitle') }}
          </h3>
          <form @submit.prevent="handleAddBank" class="flex items-center gap-2">
            <AppInput v-model="newBankName" placeholder="ex: Raiffeisen / CEC Bank" class="flex-1" />
            <AppButton type="submit" variant="secondary" size="sm" :disabled="!newBankName">
              {{ t('settings.addBankBtn') }}
            </AppButton>
          </form>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="bank in settings.banks"
              :key="bank"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-gray-200 hover:border-white/20 transition-all"
            >
              <span>🏦 {{ bank }}</span>
              <button type="button" class="text-gray-500 hover:text-rose-400 font-bold transition-colors" @click="handleRemoveBank(bank)">✕</button>
            </div>
            <div v-if="settings.banks.length === 0" class="text-xs text-gray-500 font-mono py-1">
              Nicio bancă adăugată.
            </div>
          </div>
        </div>

        <!-- Brokers -->
        <div class="sw-glass-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-lg">
          <h3 class="text-xs font-mono font-bold text-gray-300 uppercase tracking-wider">
            {{ t('settings.brokersTitle') }}
          </h3>
          <form @submit.prevent="handleAddBroker" class="flex items-center gap-2">
            <AppInput v-model="newBrokerName" placeholder="ex: Trading212 / Swissquote" class="flex-1" />
            <AppButton type="submit" variant="secondary" size="sm" :disabled="!newBrokerName">
              {{ t('settings.addBrokerBtn') }}
            </AppButton>
          </form>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="broker in settings.brokers"
              :key="broker"
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono text-gray-200 hover:border-white/20 transition-all"
            >
              <span>📈 {{ broker }}</span>
              <button type="button" class="text-gray-500 hover:text-rose-400 font-bold transition-colors" @click="handleRemoveBroker(broker)">✕</button>
            </div>
            <div v-if="settings.brokers.length === 0" class="text-xs text-gray-500 font-mono py-1">
              Niciun broker adăugat.
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
