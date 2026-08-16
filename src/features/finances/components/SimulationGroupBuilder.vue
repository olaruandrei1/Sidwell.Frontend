<script setup lang="ts">
import { computed } from 'vue';
import { X } from '@lucide/vue';
import type {
  SimulationStockGroup,
  SimulationGroupMode,
  SimulationMemberConditionType,
} from '../../../shared/api/types';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import FormField from '../../../shared/ui/molecules/FormField.vue';
import TickerSearchInput from '../../../shared/ui/molecules/TickerSearchInput.vue';

const props = defineProps<{
  modelValue: SimulationStockGroup[];
}>();

const emit = defineEmits<{
  'update:modelValue': [groups: SimulationStockGroup[]];
}>();

const modeOptions: { value: SimulationGroupMode; label: string }[] = [
  { value: 'WEIGHTED', label: 'Hybrid / Weighted' },
  { value: 'SEQUENTIAL', label: 'Sequential' },
];

const conditionOptions: { value: SimulationMemberConditionType; label: string; placeholder: string }[] = [
  { value: 'ALWAYS', label: 'Always', placeholder: '' },
  { value: 'stock_count', label: 'Shares Target', placeholder: 'e.g. 400' },
  { value: 'invested_amount', label: 'Invested Target', placeholder: 'e.g. 10000' },
  { value: 'date', label: 'Until Date', placeholder: 'YYYY-MM' },
];

const totalWeight = computed(() => {
  return props.modelValue.reduce((sum, g) => sum + (Number(g.weightPct) || 0), 0);
});

const isPipelineMode = computed(() => totalWeight.value === 0 || Math.abs(totalWeight.value - 100) > 0.1);

function getGroupColorClass(idx: number): string {
  const colors = [
    'bg-emerald-500',
    'bg-sky-500',
    'bg-indigo-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-rose-500',
  ];
  return colors[idx % colors.length] || 'bg-gray-500';
}

function getMemberColorClass(idx: number): string {
  const colors = [
    'bg-emerald-400',
    'bg-amber-400',
    'bg-sky-400',
    'bg-indigo-400',
    'bg-purple-400',
    'bg-rose-400',
  ];
  return colors[idx % colors.length] || 'bg-gray-400';
}

function addGroup() {
  const stageNum = props.modelValue.length + 1;
  const newGroup: SimulationStockGroup = {
    id: `grp-${Date.now()}`,
    name: `Stage ${stageNum}: Core Allocation`,
    weightPct: 0,
    mode: stageNum === 1 ? 'SEQUENTIAL' : 'WEIGHTED',
    members: [
      {
        symbol: stageNum === 1 ? 'TLV.RO' : 'H2O.RO',
        weightPct: 100,
        condition: { type: 'stock_count', value: stageNum === 1 ? '400' : '75' },
      },
    ],
  };
  emit('update:modelValue', [...props.modelValue, newGroup]);
}

function removeGroup(idx: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== idx));
}

function updateGroup(idx: number, patch: Partial<SimulationStockGroup>) {
  const updated = props.modelValue.map((g, i) => (i === idx ? { ...g, ...patch } : g));
  emit('update:modelValue', updated);
}

function addMember(groupIdx: number) {
  const grp = props.modelValue[groupIdx];
  if (!grp) return;
  const count = grp.members.length + 1;
  const nextMember = {
    symbol: '',
    weightPct: 50,
    condition: { type: 'stock_count' as SimulationMemberConditionType, value: '100' },
  };
  updateGroup(groupIdx, { members: [...grp.members, nextMember] });
}

function removeMember(groupIdx: number, memberIdx: number) {
  const grp = props.modelValue[groupIdx];
  if (!grp) return;
  updateGroup(groupIdx, {
    members: grp.members.filter((_, i) => i !== memberIdx),
  });
}

function updateMemberSymbol(groupIdx: number, memberIdx: number, symbol: string) {
  const grp = props.modelValue[groupIdx];
  if (!grp) return;
  const updatedMembers = grp.members.map((m, i) =>
    i === memberIdx ? { ...m, symbol: symbol.trim().toUpperCase() } : m
  );
  updateGroup(groupIdx, { members: updatedMembers });
}

function updateMemberWeight(groupIdx: number, memberIdx: number, weightPct: number) {
  const grp = props.modelValue[groupIdx];
  if (!grp) return;
  const updatedMembers = grp.members.map((m, i) =>
    i === memberIdx ? { ...m, weightPct: Math.max(0, Math.min(100, weightPct)) } : m
  );
  updateGroup(groupIdx, { members: updatedMembers });
}

function updateMemberConditionType(
  groupIdx: number,
  memberIdx: number,
  type: SimulationMemberConditionType
) {
  const grp = props.modelValue[groupIdx];
  if (!grp) return;
  const updatedMembers = grp.members.map((m, i) =>
    i === memberIdx
      ? {
          ...m,
          condition: {
            type,
            value: type === 'ALWAYS' ? '' : m.condition.value,
          },
        }
      : m
  );
  updateGroup(groupIdx, { members: updatedMembers });
}

function updateMemberConditionValue(groupIdx: number, memberIdx: number, value: string) {
  const grp = props.modelValue[groupIdx];
  if (!grp) return;
  const updatedMembers = grp.members.map((m, i) =>
    i === memberIdx
      ? {
          ...m,
          condition: {
            ...m.condition,
            value,
          },
        }
      : m
  );
  updateGroup(groupIdx, { members: updatedMembers });
}

function getGroupMemberWeightSum(grp: SimulationStockGroup): number {
  return grp.members.reduce((sum, m) => sum + (Number(m.weightPct) || 0), 0);
}
</script>

<template>
  <div class="space-y-4">
    <div class="p-3 bg-terminal-surface border border-terminal-border rounded-xl space-y-2">
      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-gray-300 font-bold flex items-center gap-1.5">
          <span>🎯</span> Pipeline Execution Mode:
          <span class="text-terminal-accent font-extrabold">
            {{ isPipelineMode ? 'Sequential Stages (100% flow per stage)' : 'Concurrent Weighted Groups' }}
          </span>
        </span>
        <span class="font-bold text-gray-400">
          {{ modelValue.length }} {{ modelValue.length === 1 ? 'Stage' : 'Stages' }}
        </span>
      </div>

      <div class="text-[11px] font-mono text-gray-400 bg-terminal-bg/80 p-2 rounded-lg border border-terminal-border/60 leading-relaxed">
        💡 <strong>Cum funcționează etapele:</strong> Faza 1 (ex: doar TLV până la 400 acțiuni) primește 100% din bugetul de acțiuni. La atingerea țintei, Faza 1 se încheie și bugetul trece automat 100% la Faza 2 (ex: coș hibrid H2O, SNP, SNG). Dacă un stock din Faza 2 își atinge ținta devreme, ponderea sa se redistribuie automat pro-rata între celelalte acțiuni active din grup!
      </div>
    </div>

    <div
      v-for="(group, groupIdx) in modelValue"
      :key="group.id || groupIdx"
      class="p-4 bg-terminal-surface/60 border border-terminal-border rounded-xl space-y-4 shadow-sm"
    >
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-terminal-border/60 pb-3">
        <div class="flex items-center space-x-2 flex-1 min-w-0">
          <span class="px-2 py-0.5 rounded bg-terminal-bg border border-terminal-border text-xs font-mono font-extrabold text-terminal-accent shrink-0">
            STAGE {{ groupIdx + 1 }}
          </span>
          <input
            type="text"
            :value="group.name || `Stage ${groupIdx + 1}`"
            @input="(e) => updateGroup(groupIdx, { name: (e.target as HTMLInputElement).value })"
            placeholder="Nume Etapă (ex: Titluri / Acțiuni US)"
            class="bg-terminal-bg border border-terminal-border hover:border-terminal-accent focus:border-terminal-accent text-xs font-mono font-bold text-gray-100 focus:outline-none rounded px-2.5 py-1 w-full sm:w-64 flex-1 min-w-0 shadow-inner transition-colors"
          />
        </div>

        <div class="flex items-center justify-between sm:justify-end space-x-2">
          <div class="flex items-center space-x-1 bg-terminal-bg border border-terminal-border rounded-lg p-0.5">
            <button
              v-for="opt in modeOptions"
              :key="opt.value"
              type="button"
              class="px-2.5 py-1 rounded-md text-xs font-mono transition-colors"
              :class="group.mode === opt.value ? 'bg-terminal-accent text-terminal-bg font-bold' : 'text-gray-400 hover:text-gray-200'"
              @click="updateGroup(groupIdx, { mode: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>

          <button
            type="button"
            class="text-gray-500 hover:text-red-400 transition-colors px-2 py-1 flex-shrink-0"
            @click="removeGroup(groupIdx)"
            title="Șterge Faza"
          >
            <X :size="13" />
          </button>
        </div>
      </div>

      <div v-if="group.mode === 'WEIGHTED' && group.members.length > 0" class="space-y-1.5 bg-terminal-bg/60 p-3 rounded-lg border border-terminal-border/50">
        <div class="flex items-center justify-between text-xs font-mono">
          <span class="text-gray-300 font-bold">Ponderi Membri în Fază (Barieră Vizuală Live):</span>
          <span class="font-extrabold" :class="getGroupMemberWeightSum(group) === 100 ? 'text-terminal-up' : 'text-terminal-accent'">
            {{ getGroupMemberWeightSum(group) }}% Total
          </span>
        </div>
        <div class="w-full h-3.5 bg-terminal-bg rounded-full overflow-hidden flex border border-terminal-border/80">
          <div
            v-for="(member, mIdx) in group.members"
            :key="mIdx"
            class="h-full transition-all duration-300 flex items-center justify-center text-[9px] font-mono font-bold text-black overflow-hidden"
            :class="getMemberColorClass(mIdx)"
            :style="{ width: `${getGroupMemberWeightSum(group) > 0 ? ((Number(member.weightPct) || 0) / getGroupMemberWeightSum(group)) * 100 : 0}%` }"
            :title="`${member.symbol || 'Stock'}: ${member.weightPct || 0}%`"
          >
            <span v-if="(Number(member.weightPct) || 0) >= 10" class="truncate px-0.5">
              {{ member.symbol || 'STK' }} {{ member.weightPct }}%
            </span>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center justify-between">
          <span>Membri / Acțiuni ({{ group.members.length }})</span>
          <span v-if="group.mode === 'WEIGHTED'" class="text-[11px] text-gray-400 hidden sm:inline">Ponderea se redistribuie automat pro-rata dacă un stock își atinge ținta!</span>
        </div>

        <div
          v-for="(member, memberIdx) in group.members"
          :key="memberIdx"
          class="p-3 bg-terminal-bg/80 border border-terminal-border rounded-xl space-y-2.5 shadow-sm"
        >
          <!-- Top row: Index + Symbol + Weight + Delete Button -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-black shrink-0" :class="getMemberColorClass(memberIdx)">
                {{ memberIdx + 1 }}
              </span>
              <TickerSearchInput
                :model-value="member.symbol"
                @update:model-value="(val) => updateMemberSymbol(groupIdx, memberIdx, val)"
                placeholder="Simbol (ex: TLV, MIC)..."
                class="w-32 sm:w-48"
              />
              <div v-if="group.mode === 'WEIGHTED'" class="flex items-center space-x-1 bg-terminal-surface border border-terminal-border rounded px-2 py-1">
                <span class="text-[11px] font-mono text-gray-400">Pondere:</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  :value="member.weightPct ?? 50"
                  @input="(e) => updateMemberWeight(groupIdx, memberIdx, Number((e.target as HTMLInputElement).value) || 0)"
                  class="w-10 bg-transparent text-xs font-mono font-bold text-terminal-accent text-right focus:outline-none"
                />
                <span class="text-xs font-mono text-terminal-accent">%</span>
              </div>
            </div>
            <button
              type="button"
              class="text-gray-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
              @click="removeMember(groupIdx, memberIdx)"
              title="Șterge Membru"
            >
              ✕
            </button>
          </div>

          <!-- Bottom row: Condition + Value -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <select
              :value="member.condition.type"
              @change="updateMemberConditionType(groupIdx, memberIdx, ($event.target as HTMLSelectElement).value as SimulationMemberConditionType)"
              class="w-full bg-terminal-surface border border-terminal-border rounded px-2 py-1 text-xs font-mono font-bold text-terminal-accent focus:outline-none focus:border-terminal-accent"
            >
              <option v-for="cOpt in conditionOptions" :key="cOpt.value" :value="cOpt.value">
                {{ cOpt.label }}
              </option>
            </select>

            <input
              v-if="member.condition.type !== 'ALWAYS'"
              type="text"
              :value="member.condition.value"
              @input="(e) => updateMemberConditionValue(groupIdx, memberIdx, (e.target as HTMLInputElement).value)"
              :placeholder="conditionOptions.find((o) => o.value === member.condition.type)?.placeholder || 'Valoare'"
              class="w-full bg-terminal-surface border border-terminal-border rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
            />
          </div>
        </div>

        <AppButton variant="secondary" @click="addMember(groupIdx)">
          + Adaugă Acțiune în Fază
        </AppButton>
      </div>
    </div>

    <div class="pt-2">
      <AppButton variant="secondary" @click="addGroup">
        + Adaugă Fază Nouă în Pipeline (Stage)
      </AppButton>
    </div>
  </div>
</template>
