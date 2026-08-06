<script setup>
import { useToast } from './useToast';
const { toasts, dismiss } = useToast();
</script>

<template>
  <div class="fixed top-4 right-4 z-50 flex flex-col gap-2">
    <div
      v-for="t in toasts"
      :key="t.id"
      :class="['flex items-start gap-3 bg-white border-l-4 border-y border-r border-slate-200 rounded shadow-sm px-4 py-3 w-80', t.border]"
    >
      <span :class="['text-[18px] mt-0.5', t.text]">&#9679;</span>
      <span class="text-sm text-slate-700 flex-1">{{ t.message }}</span>
      <button aria-label="Dismiss" class="text-slate-400" @click="dismiss(t.id)">&times;</button>
    </div>
  </div>
</template>
