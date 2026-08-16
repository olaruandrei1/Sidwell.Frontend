<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import { useToast } from '../../../shared/composables/useToast';
import AppButton from '../../../shared/ui/atoms/AppButton.vue';
import AdaptiveOverlay from '../../../shared/ui/organisms/AdaptiveOverlay.vue';
import {
  useTickerNotesQuery,
  useCreateTickerNoteMutation,
  useUpdateTickerNoteMutation,
  useDeleteTickerNoteMutation,
} from '../../../queries/useTickerNotesQuery';
import type { TickerNoteDto, TickerNoteSectionDto, TickerNoteAttachmentDto } from '../../../shared/api/types';

const props = defineProps<{ symbol: string }>();

const auth = useAuthStore();
const toast = useToast();

const { data: notes, isLoading } = useTickerNotesQuery(computed(() => props.symbol));
const createMutation = useCreateTickerNoteMutation(computed(() => props.symbol));
const updateMutation = useUpdateTickerNoteMutation(computed(() => props.symbol));
const deleteMutation = useDeleteTickerNoteMutation(computed(() => props.symbol));

// ── modal + mode ─────────────────────────────────────────────────────────────
type Mode = 'view' | 'edit' | 'new';
const isModalOpen = ref(false);
const mode = ref<Mode>('view');
const activeNote = ref<TickerNoteDto | null>(null);

interface Draft {
  title: string;
  sections: TickerNoteSectionDto[];
  attachments: TickerNoteAttachmentDto[];
}
const draft = ref<Draft>({ title: '', sections: [{ id: newId(), content: '' }], attachments: [] });

function newId(): string {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Date.now() + Math.random());
}

const modalTitle = computed(() => {
  if (mode.value === 'new') return 'New Note';
  if (mode.value === 'edit') return 'Edit Note';
  return activeNote.value?.title || 'Note';
});

function openNew() {
  mode.value = 'new';
  activeNote.value = null;
  draft.value = { title: '', sections: [{ id: newId(), content: '' }], attachments: [] };
  isModalOpen.value = true;
}

function openView(note: TickerNoteDto) {
  mode.value = 'view';
  activeNote.value = note;
  isModalOpen.value = true;
}

function startEdit() {
  const note = activeNote.value;
  if (!note) return;
  mode.value = 'edit';
  draft.value = {
    title: note.title,
    sections: note.sections.length ? note.sections.map((s) => ({ ...s })) : [{ id: newId(), content: '' }],
    attachments: note.attachments.map((a) => ({ ...a })),
  };
}

// ── sections / attachments ─────────────────────────────────────────────────
function addSection() {
  draft.value.sections.push({ id: newId(), content: '' });
}
function removeSection(id: string) {
  if (draft.value.sections.length <= 1) return;
  draft.value.sections = draft.value.sections.filter((s) => s.id !== id);
}
function updateSectionContent(id: string, value: string) {
  const sec = draft.value.sections.find((s) => s.id === id);
  if (sec) sec.content = value;
}
function removeAttachment(id: string) {
  draft.value.attachments = draft.value.attachments.filter((a) => a.id !== id);
}
function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files) return;
  Array.from(input.files).forEach((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1] ?? '';
      draft.value.attachments.push({ id: newId(), name: file.name, mimeType: file.type || 'application/octet-stream', dataBase64: base64 });
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

// ── save / delete ────────────────────────────────────────────────────────────
const isSaving = computed(() => createMutation.isPending.value || updateMutation.isPending.value);

async function handleSave() {
  const payload = {
    title: draft.value.title.trim(),
    sections: draft.value.sections.filter((s) => s.content.trim()),
    attachments: draft.value.attachments,
  };
  if (!payload.title) {
    toast.error('Titlu lipsă', 'Adaugă un titlu pentru notă.');
    return;
  }
  try {
    if (mode.value === 'edit' && activeNote.value) {
      const updated = await updateMutation.mutateAsync({ id: activeNote.value.id, payload });
      activeNote.value = updated;
      mode.value = 'view';
    } else {
      await createMutation.mutateAsync(payload);
      isModalOpen.value = false;
    }
    toast.success('Notă salvată', '');
  } catch {
    toast.error('Eroare', 'Nu s-a putut salva nota.');
  }
}

async function handleDelete(id: string) {
  try {
    await deleteMutation.mutateAsync(id);
    isModalOpen.value = false;
  } catch {
    toast.error('Eroare', 'Nu s-a putut șterge nota.');
  }
}

// ── share via mailto ─────────────────────────────────────────────────────────
function senderName(): string {
  const user = auth.user;
  if (user?.displayName) return user.displayName;
  if (!user?.email) return 'Sidwell User';
  const local = user.email.split('@')[0] ?? '';
  return local.split(/[._\-,]+/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
function shareNote(note: TickerNoteDto) {
  const lines: string[] = [`${note.title}`, `${props.symbol} — Research Note`, ''];
  note.sections.forEach((s, i) => {
    if (s.content.trim()) {
      if (i > 0) lines.push('');
      lines.push(s.content.trim());
    }
  });
  if (note.attachments.length) {
    lines.push('', `Anexe: ${note.attachments.map((a) => a.name).join(', ')}`);
  }
  lines.push('', '──────────────────────────────', senderName(), 'Report generated from Sidwell — Trading & Financial Cockpit');
  window.location.href = `mailto:?subject=${encodeURIComponent(`${note.title} — ${props.symbol}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

// ── helpers ────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
}
function previewText(note: TickerNoteDto): string {
  const first = note.sections.find((s) => s.content.trim());
  if (!first) return '—';
  return first.content.length > 120 ? first.content.slice(0, 120) + '…' : first.content;
}
function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️';
  if (mime === 'application/pdf') return '📄';
  if (mime.includes('csv') || mime.includes('sheet') || mime.includes('excel')) return '📊';
  return '📎';
}
</script>

<template>
  <div class="space-y-3 select-none">
    <!-- Title on the background + primary action -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-2">
        <span class="text-base">📓</span>
        <h2 class="text-sm font-bold font-mono text-gray-100 uppercase tracking-wider">Journal</h2>
        <span v-if="notes?.length" class="text-[11px] font-mono text-gray-500 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10">
          {{ notes.length }}
        </span>
      </div>
      <AppButton variant="secondary" size="sm" @click="openNew">+ New note</AppButton>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="py-6 text-center text-xs text-gray-500 font-mono animate-pulse">
      Se încarcă jurnalul...
    </div>

    <!-- Empty -->
    <div v-else-if="!notes?.length" class="py-6 text-center space-y-2 border border-dashed border-white/10 rounded-2xl">
      <div class="text-3xl opacity-20">📓</div>
      <p class="text-xs text-gray-500 font-mono">Nicio notă de cercetare pentru {{ symbol }}</p>
    </div>

    <!-- Note "pages" as cards directly on the background; tap a page to open it -->
    <div v-else class="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 scrollbar-none -mx-1 px-1">
      <button
        v-for="note in notes"
        :key="note.id"
        type="button"
        class="snap-start shrink-0 w-[80vw] sm:w-[320px] text-left bg-terminal-surface border border-white/10 rounded-2xl p-4 space-y-2.5 shadow-lg hover:border-terminal-accent/40 transition-colors"
        @click="openView(note)"
      >
        <h4 class="text-sm font-bold text-gray-100 font-mono leading-snug line-clamp-2">{{ note.title }}</h4>
        <p class="text-[12px] font-sans text-gray-400 leading-relaxed line-clamp-4">{{ previewText(note) }}</p>
        <div class="flex items-center gap-2 flex-wrap">
          <span v-if="note.sections.filter(s => s.content.trim()).length > 1" class="text-[10px] text-gray-500 font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            {{ note.sections.filter(s => s.content.trim()).length }} secțiuni
          </span>
          <span v-if="note.attachments.length" class="text-[10px] text-gray-500 font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
            📎 {{ note.attachments.length }}
          </span>
        </div>
        <div class="pt-2 border-t border-white/10 text-[11px] text-gray-600 font-mono">{{ formatDate(note.createdAt) }}</div>
      </button>
    </div>

    <!-- ── Per-note modal / bottom sheet ─────────────────────────────────── -->
    <AdaptiveOverlay v-model="isModalOpen" :title="modalTitle" :max-width="640">
      <!-- VIEW MODE -->
      <div v-if="mode === 'view' && activeNote" class="space-y-4">
        <div v-for="sec in activeNote.sections.filter(s => s.content.trim())" :key="sec.id" class="p-3 bg-terminal-bg/60 rounded-xl border border-white/10 text-sm text-gray-200 font-sans whitespace-pre-wrap leading-relaxed">
          {{ sec.content }}
        </div>
        <div v-if="activeNote.attachments.length" class="flex flex-wrap gap-2">
          <span v-for="att in activeNote.attachments" :key="att.id" class="text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
            {{ fileIcon(att.mimeType) }} {{ att.name }}
          </span>
        </div>
        <div class="text-[11px] text-gray-600 font-mono">{{ formatDate(activeNote.createdAt) }}</div>
      </div>

      <!-- EDIT / NEW MODE -->
      <div v-else class="space-y-4">
        <input
          v-model="draft.title"
          placeholder="Titlu..."
          class="w-full bg-terminal-bg/70 border border-white/10 rounded-xl px-4 py-3 text-base font-mono font-bold text-gray-100 placeholder-gray-600 focus:outline-none focus:border-terminal-accent transition-colors"
        />
        <div class="space-y-2.5">
          <div v-for="sec in draft.sections" :key="sec.id" class="relative">
            <textarea
              :value="sec.content"
              @input="updateSectionContent(sec.id, ($event.target as HTMLTextAreaElement).value)"
              rows="4"
              placeholder="Scrie o observație, teză sau nivel țintă..."
              class="w-full bg-terminal-bg/50 border border-white/10 rounded-xl p-3.5 text-sm font-sans text-gray-200 placeholder-gray-600 focus:outline-none focus:border-terminal-accent resize-none transition-colors pr-9"
            />
            <button
              v-if="draft.sections.length > 1"
              type="button"
              class="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center text-gray-500 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors"
              @click="removeSection(sec.id)"
            >✕</button>
          </div>
        </div>
        <div class="flex items-center gap-2.5 flex-wrap">
          <button type="button" class="px-3.5 py-2 text-sm font-mono font-bold text-gray-300 rounded-xl border border-white/15 bg-white/5 hover:border-terminal-accent/40 hover:text-terminal-accent transition-colors" @click="addSection">
            + Secțiune
          </button>
          <label class="px-3.5 py-2 text-sm font-mono font-bold text-gray-300 rounded-xl border border-white/15 bg-white/5 hover:border-terminal-accent/40 hover:text-terminal-accent transition-colors cursor-pointer">
            📎 Atașament
            <input type="file" accept="image/*,.pdf,.csv,.xlsx" multiple class="hidden" @change="onFileChange" />
          </label>
        </div>
        <div v-if="draft.attachments.length" class="flex flex-wrap gap-2">
          <span v-for="att in draft.attachments" :key="att.id" class="text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 flex items-center gap-2">
            {{ fileIcon(att.mimeType) }} {{ att.name }}
            <button type="button" class="text-gray-500 hover:text-rose-400 font-bold transition-colors" @click="removeAttachment(att.id)">✕</button>
          </span>
        </div>
      </div>

      <!-- Footer actions -->
      <template #actions>
        <template v-if="mode === 'view' && activeNote">
          <button type="button" class="px-4 py-2 text-sm font-mono font-bold text-gray-300 rounded-xl border border-white/15 bg-white/5 hover:border-rose-400/40 hover:text-rose-300 transition-colors" @click="handleDelete(activeNote.id)">🗑 Șterge</button>
          <button type="button" class="px-4 py-2 text-sm font-mono font-bold text-gray-300 rounded-xl border border-white/15 bg-white/5 hover:border-sky-400/40 hover:text-sky-300 transition-colors" @click="shareNote(activeNote)">✉ Share</button>
          <AppButton variant="primary" size="sm" @click="startEdit">✎ Editează</AppButton>
        </template>
        <template v-else>
          <button type="button" class="px-4 py-2 text-sm font-mono font-bold text-gray-400 rounded-xl border border-white/15 bg-white/5 hover:text-gray-200 transition-colors" @click="isModalOpen = false">Anulează</button>
          <AppButton variant="primary" size="sm" :loading="isSaving" @click="handleSave">Salvează</AppButton>
        </template>
      </template>
    </AdaptiveOverlay>
  </div>
</template>
