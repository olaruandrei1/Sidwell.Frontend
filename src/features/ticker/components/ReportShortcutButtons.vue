<script setup lang="ts">
import { ref, computed } from 'vue';
import { api } from '../../../shared/api/client';
import { useToast } from '../../../shared/composables/useToast';
import { useTickerNotesQuery } from '../../../queries/useTickerNotesQuery';

const props = defineProps<{ symbol: string }>();

const toast = useToast();
const { data: notes } = useTickerNotesQuery(computed(() => props.symbol));

type ReportFormat = 'pdf' | 'xlsx';
const downloadingFormat = ref<ReportFormat | null>(null);

const latestNote = computed(() =>
  (notes.value ?? []).slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null
);
const disabled = computed(() => latestNote.value === null);
const disabledReason = computed(() =>
  disabled.value ? 'Adaugă o notă înainte de a descărca raportul.' : ''
);

async function download(format: ReportFormat) {
  const note = latestNote.value;
  if (!note || downloadingFormat.value) return;
  downloadingFormat.value = format;
  try {
    const { blob, fileName } = await api.postBlob(
      `/tickers/${encodeURIComponent(props.symbol)}/notes/${note.id}/report`,
      { format, includeAttachments: true }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success('Raport descărcat', fileName);
  } catch {
    toast.error('Eroare', 'Nu s-a putut genera raportul.');
  } finally {
    downloadingFormat.value = null;
  }
}
</script>

<template>
  <div class="grid grid-cols-2 gap-2 w-full">
    <button
      type="button"
      :disabled="disabled || downloadingFormat !== null"
      :title="disabledReason"
      class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 sw-glass-card text-sm font-mono font-bold text-gray-200 hover:border-terminal-accent/50 hover:text-terminal-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-gray-200 shadow-sm active:scale-[0.98]"
      @click="download('pdf')"
    >
      <span class="text-lg">📄</span>
      <span class="truncate">{{ downloadingFormat === 'pdf' ? 'Se generează…' : 'Descarcă PDF' }}</span>
    </button>

    <button
      type="button"
      :disabled="disabled || downloadingFormat !== null"
      :title="disabledReason"
      class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/10 sw-glass-card text-sm font-mono font-bold text-gray-200 hover:border-terminal-accent/50 hover:text-terminal-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:text-gray-200 shadow-sm active:scale-[0.98]"
      @click="download('xlsx')"
    >
      <span class="text-lg">📊</span>
      <span class="truncate">{{ downloadingFormat === 'xlsx' ? 'Se generează…' : 'Descarcă XLSX' }}</span>
    </button>
  </div>
</template>
