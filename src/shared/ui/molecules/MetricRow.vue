<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
    sublabel?: string;
    border?: boolean;
    monospaceValue?: boolean;
  }>(),
  {
    border: true,
    monospaceValue: true
  }
);
</script>

<template>
  <div
    class="flex items-center justify-between py-2.5 text-xs"
    :class="border ? 'border-b border-white/10 last:border-b-0' : ''"
  >
    <div class="flex flex-col">
      <span class="text-gray-400 font-mono font-semibold">{{ label }}</span>
      <span v-if="sublabel" class="text-[11px] text-gray-500 font-sans mt-0.5">{{ sublabel }}</span>
    </div>
    <div
      class="text-gray-100"
      :class="monospaceValue ? 'font-mono tabular-nums font-bold text-sm' : ''"
    >
      <slot />
    </div>
  </div>
</template>
