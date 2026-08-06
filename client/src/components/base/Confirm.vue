<script setup>
import Modal from './Modal.vue';
defineProps({
  modelValue: Boolean,
  title: String,
  message: String,
  confirmLabel: { type: String, default: 'Delete' }
});
const emit = defineEmits(['update:modelValue', 'confirm']);
</script>

<template>
  <Modal :model-value="modelValue" :title="title" size="sm" @update:model-value="emit('update:modelValue', $event)">
    <p class="text-[13px] text-slate-600">{{ message }}</p>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="emit('update:modelValue', false)">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-danger text-white" @click="emit('confirm'); emit('update:modelValue', false)">{{ confirmLabel }}</button>
    </template>
  </Modal>
</template>
