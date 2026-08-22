<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import { useFinancesStore } from '../../../stores/finances';
import { useExportExpensesMutation } from '../../../queries/useFinancesQuery';
import { useToast } from '../../../shared/composables/useToast';

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const financesStore = useFinancesStore();
const toast = useToast();
const exportMutation = useExportExpensesMutation();

function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y || 2026, m || 1, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, '0')}` };
}

const onlyCurrentMonth = ref(true);
const startDate = ref('');
const endDate = ref('');
const downloadingFormat = ref<'pdf' | 'xlsx' | null>(null);

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const bounds = monthBounds(financesStore.selectedMonth);
      startDate.value = bounds.start;
      endDate.value = bounds.end;
      onlyCurrentMonth.value = true;
    }
  }
);

async function download(format: 'pdf' | 'xlsx') {
  if (downloadingFormat.value) return;
  downloadingFormat.value = format;
  try {
    const payload = onlyCurrentMonth.value
      ? { format, month: financesStore.selectedMonth }
      : { format, startDate: startDate.value, endDate: endDate.value };

    const { blob, fileName } = await exportMutation.mutateAsync(payload);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
    toast.success('Export descărcat', fileName);
    emit('update:modelValue', false);
  } catch {
    toast.error('Eroare', 'Nu s-a putut genera exportul.');
  } finally {
    downloadingFormat.value = null;
  }
}
</script>

<template>
  <AdaptiveOverlay
    :model-value="modelValue"
    title="Exportă Cheltuieli"
    :max-width="440"
    @update:model-value="(val) => emit('update:modelValue', val)"
  >
    <div class="space-y-5">
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider border transition-all"
        :class="onlyCurrentMonth
          ? 'bg-terminal-accent/15 border-terminal-accent text-terminal-accent'
          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300'"
        @click="onlyCurrentMonth = !onlyCurrentMonth"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="onlyCurrentMonth ? 'bg-terminal-accent' : 'bg-gray-500'" />
        Doar luna curentă ({{ financesStore.selectedMonth }})
      </button>

      <div class="grid grid-cols-2 gap-3" :class="onlyCurrentMonth ? 'opacity-40 pointer-events-none' : ''">
        <div>
          <label class="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">De la</label>
          <input
            v-model="startDate"
            type="date"
            :disabled="onlyCurrentMonth"
            class="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          />
        </div>
        <div>
          <label class="block text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">Până la</label>
          <input
            v-model="endDate"
            type="date"
            :disabled="onlyCurrentMonth"
            class="w-full bg-terminal-bg border border-terminal-border rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-terminal-accent"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          :disabled="downloadingFormat !== null"
          class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 sw-glass-card text-sm font-mono font-bold text-gray-200 hover:border-terminal-accent/50 hover:text-terminal-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
          @click="download('pdf')"
        >
          <span class="text-lg">📄</span>
          <span class="truncate">{{ downloadingFormat === 'pdf' ? 'Se generează…' : 'PDF' }}</span>
        </button>
        <button
          type="button"
          :disabled="downloadingFormat !== null"
          class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 sw-glass-card text-sm font-mono font-bold text-gray-200 hover:border-terminal-accent/50 hover:text-terminal-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
          @click="download('xlsx')"
        >
          <span class="text-lg">📊</span>
          <span class="truncate">{{ downloadingFormat === 'xlsx' ? 'Se generează…' : 'XLSX' }}</span>
        </button>
      </div>
    </div>
  </AdaptiveOverlay>
</template>
