<script setup>
const props = defineProps({ modelValue: Number, max: { type: Number, default: 5 } });
const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex gap-1" role="radiogroup">
    <button
      v-for="n in max"
      :key="n"
      type="button"
      role="radio"
      :aria-checked="modelValue === n"
      :aria-label="`${n} of ${max}`"
      class="text-[20px] leading-none"
      :class="n <= (modelValue || 0) ? 'text-accent' : 'text-slate-200'"
      @click="emit('update:modelValue', n)"
    >&#9733;</button>
  </div>
</template>
