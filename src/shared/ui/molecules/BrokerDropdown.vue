<script setup lang="ts">
import { computed } from 'vue';
import type { BrokerCode, BrokerDto } from '../../api/types';

const props = defineProps<{
  modelValue: BrokerCode;
  brokers: BrokerDto[];
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: BrokerCode];
}>();

const selectedBroker = computed(() =>
  props.brokers.find((b) => b.code === props.modelValue)
);
</script>

<template>
  <div class="w-full">
    <select
      :value="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value as BrokerCode)"
      class="w-full bg-terminal-surface/90 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-terminal-accent focus:ring-2 focus:ring-terminal-accent/30 transition-all duration-200 cursor-pointer shadow-inner"
    >
      <option
        v-for="b in brokers"
        :key="b.code"
        :value="b.code"
        class="bg-terminal-bg text-gray-200"
      >
        {{ b.name }} ({{ b.code }})
      </option>
    </select>
    <p v-if="selectedBroker" class="mt-1.5 text-xs text-gray-400 font-mono font-medium">
      {{ selectedBroker.description }}
    </p>
  </div>
</template>
