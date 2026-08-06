<script setup>
defineProps({
  modelValue: Boolean,
  title: String,
  size: { type: String, default: 'md' } // sm | md | lg
});
const emit = defineEmits(['update:modelValue']);
const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' };
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center" @click.self="emit('update:modelValue', false)">
      <div :class="['bg-white w-full rounded-t-xl md:rounded-xl p-5', sizes[size]]">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-medium text-slate-900">{{ title }}</h3>
          <button aria-label="Close" class="text-slate-400" @click="emit('update:modelValue', false)">&times;</button>
        </div>
        <slot />
        <div v-if="$slots.footer" class="flex justify-end gap-2 mt-5">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
