<script setup lang="ts">
withDefaults(
  defineProps<{
    ratio?: 'equal' | 'main-left' | 'main-right';
  }>(),
  {
    ratio: 'main-left'
  }
);
</script>

<template>
  <div
    class="grid grid-cols-1 gap-5 sm:gap-6 lg:gap-8"
    :class="{
      'lg:grid-cols-2': ratio === 'equal',
      'lg:grid-cols-3': ratio !== 'equal'
    }"
  >
    <div
      :class="{
        'lg:col-span-1': ratio === 'equal' || ratio === 'main-right',
        'lg:col-span-2': ratio === 'main-left'
      }"
      class="space-y-5 sm:space-y-6"
    >
      <slot name="left" />
    </div>

    <div
      :class="{
        'lg:col-span-1': ratio === 'equal' || ratio === 'main-left',
        'lg:col-span-2': ratio === 'main-right'
      }"
      class="space-y-5 sm:space-y-6"
    >
      <slot name="right" />
    </div>
  </div>
</template>
