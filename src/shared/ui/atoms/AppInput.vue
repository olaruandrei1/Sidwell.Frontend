<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | number | null | undefined;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    readonly?: boolean;
    error?: string;
    monospace?: boolean;
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false,
    readonly: false,
    monospace: false
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'blur': [e: FocusEvent];
  'focus': [e: FocusEvent];
}>();

function handleClick(e: MouseEvent) {
  const el = e.target as HTMLInputElement;
  if (el && (el.type === 'date' || el.type === 'month' || el.type === 'time') && typeof el.showPicker === 'function') {
    try {
      el.showPicker();
    } catch {}
  }
}
</script>

<template>
  <div class="w-full">
    <input
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="emit('blur', $event)"
      @focus="emit('focus', $event)"
      @click="handleClick"
      class="w-full bg-terminal-surface/90 border rounded-xl px-3.5 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-200 cursor-pointer shadow-inner"
      :class="[
        error ? 'border-terminal-down focus:ring-terminal-down/30' : 'border-white/10 focus:border-terminal-accent focus:ring-terminal-accent/30',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        monospace ? 'font-mono tabular-nums' : ''
      ]"
    />
    <p v-if="error" class="mt-1.5 text-xs text-terminal-down font-mono font-semibold">
      {{ error }}
    </p>
  </div>
</template>
