<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';

const defaulters = ref(null);

function formatMoney(n) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG');
}

onMounted(async () => {
  const sessions = await api.get('/schools/sessions');
  const active = sessions.data.data.find((s) => s.is_active);
  const terms = await api.get(`/schools/sessions/${active.id}/terms`);
  const currentTermId = terms.data.data.find((t) => t.is_current)?.id;

  const res = await api.get(`/fees/reports/defaulters/${currentTermId}`);
  defaulters.value = res.data.data;
});
</script>

<template>
  <PageHeader title="Defaulters" subtitle="Students with an outstanding balance this term." />
  <Spinner v-if="!defaulters" />
  <template v-else>
    <!-- Desktop table -->
    <div class="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[12px]"><tr><th class="text-left font-medium px-4 py-2.5">Student</th><th class="text-left font-medium px-4 py-2.5">Admission no.</th><th class="text-left font-medium px-4 py-2.5">Balance</th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!defaulters.length"><td colspan="3" class="px-4 py-8 text-center text-slate-400">No defaulters — everyone's paid up.</td></tr>
          <tr v-for="d in defaulters" :key="d.id">
            <td class="px-4 py-3 text-slate-800">{{ d.first_name }} {{ d.last_name }}</td>
            <td class="px-4 py-3 font-mono text-[13px] text-slate-500">{{ d.admission_no }}</td>
            <td class="px-4 py-3 text-danger font-medium">{{ formatMoney(d.balance) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile card list -->
    <div class="sm:hidden space-y-2">
      <p v-if="!defaulters.length" class="text-sm text-slate-400 text-center py-8">No defaulters — everyone's paid up.</p>
      <div v-for="d in defaulters" :key="d.id" class="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-800">{{ d.first_name }} {{ d.last_name }}</p>
          <p class="text-[12px] text-slate-500 font-mono">{{ d.admission_no }}</p>
        </div>
        <span class="text-danger font-medium text-sm">{{ formatMoney(d.balance) }}</span>
      </div>
    </div>
  </template>
</template>
