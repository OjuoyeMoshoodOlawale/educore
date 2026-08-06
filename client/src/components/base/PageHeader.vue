<script setup>
defineProps({ title: String, subtitle: String });
</script>
<template>
  <div class="flex items-center justify-between mb-6">
    <div>
      <h2 class="text-xl font-medium text-slate-900">{{ title }}</h2>
      <p v-if="subtitle" class="text-sm text-slate-500 mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="flex gap-2"><slot name="actions" /></div>
  </div>
</template>
