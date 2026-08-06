<script setup>
defineProps({ label: String, error: String, hint: String });
</script>

<template>
  <div>
    <label v-if="label" class="block text-[13px] font-medium text-slate-800 mb-1.5">{{ label }}</label>
    <slot />
    <p v-if="error" class="flex items-center gap-1.5 mt-1.5 text-[12px] text-danger">
      <span aria-hidden="true">&#9888;</span> {{ error }}
    </p>
    <p v-else-if="hint" class="text-[12px] text-slate-400 mt-1">{{ hint }}</p>
  </div>
</template>
