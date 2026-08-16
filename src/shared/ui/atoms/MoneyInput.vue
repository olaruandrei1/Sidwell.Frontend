<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { i18n } from '../../../i18n';

// Cents-mode strict: the input accepts digits only. The last two digits are always
// the subunit part (bani / cents / öre), everything before them is the whole part.
// Typing "3710" means 37.10. Typing "1000000" means 10 000.00. Separators pasted in
// (, or . or thousand seps) are stripped — the raw digit stream is the source of truth.
//
// External modelValue is the canonical "N.NN" (or "" when empty), which is what the
// backend expects. Existing legacy values coming in as "37" or "37.1" are normalized.

const props = withDefaults(
  defineProps<{
    modelValue: string;
    currency?: string;
    placeholder?: string;
    disabled?: boolean;
    locale?: string;
  }>(),
  { currency: '', placeholder: '', disabled: false, locale: '' }
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const localeMap: Record<string, string> = {
  ro: 'ro-RO', en: 'en-US', de: 'de-DE', fr: 'fr-FR', da: 'da-DK'
};

const effectiveLocale = computed(() => {
  const raw = props.locale || (i18n.global.locale as { value: string }).value;
  return localeMap[raw] ?? raw;
});

function toDigits(v: string): string {
  const s = (v ?? '').trim();
  // If there is exactly ONE separator (comma or dot) with pure digits on both sides,
  // treat it as a decimal number so users can type "1,26" or "37.10" naturally.
  const parts = s.split(/[,.]/);
  const sepCount = (s.match(/[,.]/g) ?? []).length;
  if (
    sepCount === 1 &&
    parts.length === 2 &&
    /^\d+$/.test(parts[0]!) &&
    /^\d+$/.test(parts[1]!)
  ) {
    const intPart = parts[0]!;
    const fracPart = parts[1]!.padEnd(2, '0').slice(0, 2);
    return (intPart + fracPart).replace(/^0+(?=\d)/, '') || '00';
  }
  return s.replace(/[^0-9]/g, '');
}

function externalToDigits(v: string): string {
  if (!v) return '';
  const s = String(v).trim();
  if (!s) return '';
  const dot = s.indexOf('.');
  if (dot === -1) {
    const intOnly = s.replace(/[^0-9]/g, '');
    if (!intOnly) return '';
    return (intOnly + '00').replace(/^0+(?=\d)/, '');
  }
  const intPart = (s.slice(0, dot).replace(/[^0-9]/g, '') || '0');
  let fracPart = s.slice(dot + 1).replace(/[^0-9]/g, '');
  if (fracPart.length === 0) fracPart = '00';
  else if (fracPart.length === 1) fracPart = fracPart + '0';
  else if (fracPart.length > 2) fracPart = fracPart.slice(0, 2);
  const combined = intPart + fracPart;
  const stripped = combined.replace(/^0+(?=\d)/, '');
  return stripped === '000' ? '' : stripped;
}

function digitsToCanonical(d: string): string {
  if (!d) return '';
  const padded = d.padStart(3, '0');
  const intPart = padded.slice(0, -2).replace(/^0+(?=\d)/, '') || '0';
  const fracPart = padded.slice(-2);
  return `${intPart}.${fracPart}`;
}

function digitsToDisplay(d: string): string {
  if (!d) return '';
  const canon = digitsToCanonical(d);
  const num = Number(canon);
  if (!isFinite(num)) return '';
  return new Intl.NumberFormat(effectiveLocale.value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

const digits = ref(externalToDigits(props.modelValue));

watch(
  () => props.modelValue,
  (v) => {
    const nextDigits = externalToDigits(v);
    if (nextDigits !== digits.value) digits.value = nextDigits;
  }
);

const displayValue = computed(() => digitsToDisplay(digits.value));

function emitCanonical() {
  emit('update:modelValue', digitsToCanonical(digits.value));
}

function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const nextDigits = toDigits(el.value);
  digits.value = nextDigits;
  emitCanonical();
  const nextDisplay = digitsToDisplay(digits.value);
  if (el.value !== nextDisplay) el.value = nextDisplay;
  const pos = el.value.length;
  el.setSelectionRange(pos, pos);
}

function onFocus(e: Event) {
  const el = e.target as HTMLInputElement;
  requestAnimationFrame(() => {
    const pos = el.value.length;
    el.setSelectionRange(pos, pos);
  });
}
</script>

<template>
  <div class="relative w-full">
    <input
      type="text"
      inputmode="numeric"
      :value="displayValue"
      :placeholder="placeholder || '0,00'"
      :disabled="disabled"
      class="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs font-mono tabular-nums text-gray-200 placeholder-gray-600 focus:outline-none focus:border-terminal-accent transition-colors disabled:opacity-40"
      :class="currency ? 'pr-9' : ''"
      @input="onInput"
      @focus="onFocus"
    />
    <span
      v-if="currency"
      class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400"
    >
      {{ currency }}
    </span>
  </div>
</template>
