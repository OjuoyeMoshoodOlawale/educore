<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const modules = ref(null);

const LABELS = {
  fees: { name: 'Fees', description: 'Fee structure, billing, payments, and defaulter reports for this school.' },
  report_card: { name: 'Report card generation', description: 'Score entry, psychomotor/affective ratings, report cards, and broadsheets.' }
};

async function load() {
  const res = await api.get('/developer/modules');
  modules.value = res.data.data;
}
onMounted(load);

async function toggle(mod) {
  await api.put(`/developer/modules/${mod.module}`, { is_active: !mod.is_active });
  toast.success(`${LABELS[mod.module].name} ${mod.is_active ? 'deactivated' : 'activated'}`);
  await load();
}
</script>

<template>
  <PageHeader title="Developer settings" subtitle="Activate or deactivate purchased modules for this school." />
  <Spinner v-if="!modules" />
  <div v-else class="space-y-3 max-w-2xl">
    <div v-for="mod in modules" :key="mod.module" class="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
      <div>
        <p class="text-sm font-medium text-slate-900">{{ LABELS[mod.module]?.name || mod.module }}</p>
        <p class="text-[12px] text-slate-500 mt-0.5">{{ LABELS[mod.module]?.description }}</p>
        <p v-if="mod.is_active && mod.activated_at" class="text-[11px] text-slate-400 mt-1">Activated {{ new Date(mod.activated_at).toLocaleDateString() }}</p>
      </div>
      <button
        class="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
        :class="mod.is_active ? 'bg-primary' : 'bg-slate-200'"
        @click="toggle(mod)"
      >
        <span class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" :class="mod.is_active ? 'translate-x-5' : 'translate-x-0.5'"></span>
      </button>
    </div>
    <p class="text-[12px] text-slate-400 mt-2">A deactivated module returns a clear message to every user in that school instead of a broken screen — nothing crashes, it just isn't reachable.</p>
  </div>
</template>
