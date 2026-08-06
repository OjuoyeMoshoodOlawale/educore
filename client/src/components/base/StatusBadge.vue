<script setup>
defineProps({ variant: { type: String, default: 'neutral' }, label: String });
const styles = {
  success: 'bg-success/10 text-success',
  danger: 'bg-danger-light text-danger',
  warning: 'bg-accent-50 text-accent',
  primary: 'bg-primary-50 text-primary',
  neutral: 'bg-slate-100 text-slate-500'
};
</script>
<template>
  <span :class="['text-[11px] px-2 py-0.5 rounded-full font-medium', styles[variant]]">{{ label }}</span>
</template>
