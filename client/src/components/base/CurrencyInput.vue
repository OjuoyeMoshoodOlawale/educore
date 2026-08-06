<script setup>
const props = defineProps({ modelValue: Number });
const emit = defineEmits(['update:modelValue']);

function format(n) {
  if (n == null || n === '') return '';
  return '\u20a6' + Number(n).toLocaleString('en-NG');
}

function onInput(e) {
  const digits = e.target.value.replace(/[^0-9]/g, '');
  const value = digits ? Number(digits) : null;
  emit('update:modelValue', value);
  e.target.value = format(value);
}
</script>

<template>
  <input
    type="text"
    :value="format(modelValue)"
    placeholder="\u20a60"
    class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"
    @input="onInput"
  />
</template>
