<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';

const classes = ref([]);
const terms = ref([]);
const selectedClassId = ref(null);
const selectedTermId = ref(null);
const data = ref(null);

async function loadBase() {
  const [classesRes, sessionsRes] = await Promise.all([api.get('/schools/classes'), api.get('/schools/sessions')]);
  classes.value = classesRes.data.data;
  selectedClassId.value = classes.value[0]?.id;
  const active = sessionsRes.data.data.find((s) => s.is_active) || sessionsRes.data.data[0];
  if (active) {
    const termsRes = await api.get(`/schools/sessions/${active.id}/terms`);
    terms.value = termsRes.data.data;
    selectedTermId.value = terms.value.find((t) => t.is_current)?.id || terms.value[0]?.id;
  }
  await load();
}
onMounted(loadBase);

async function load() {
  if (!selectedClassId.value || !selectedTermId.value) return;
  const res = await api.get(`/results/broadsheet/${selectedClassId.value}/${selectedTermId.value}`);
  data.value = res.data.data;
}
</script>

<template>
  <PageHeader title="Broadsheet" subtitle="Same ranking logic as the report card, computed once and shared.">
    <template #actions>
      <select v-model.number="selectedClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="load">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </template>
  </PageHeader>

  <Spinner v-if="!data" />
  <template v-else>
    <!-- Desktop grid -->
    <div class="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[12px]">
          <tr>
            <th class="text-left font-medium px-4 py-2.5 sticky left-0 bg-slate-50">Student</th>
            <th v-for="subj in data.subjects" :key="subj.id" class="text-left font-medium px-3 py-2.5">{{ subj.name }}</th>
            <th class="text-left font-medium px-3 py-2.5">Average</th>
            <th class="text-left font-medium px-3 py-2.5">Position</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!data.grid.length"><td :colspan="data.subjects.length + 3" class="px-4 py-8 text-center text-slate-400">No students with scores this term yet</td></tr>
          <tr v-for="row in data.grid" :key="row.student.id">
            <td class="px-4 py-3 text-slate-800 sticky left-0 bg-white whitespace-nowrap">{{ row.student.first_name }} {{ row.student.last_name }}</td>
            <td v-for="subj in data.subjects" :key="subj.id" class="px-3 py-3 text-slate-600">{{ row.bySubject[subj.id]?.total ?? '\u2014' }}</td>
            <td class="px-3 py-3 text-slate-700 font-medium">{{ row.average !== null ? row.average.toFixed(1) : '\u2014' }}</td>
            <td class="px-3 py-3"><StatusBadge v-if="row.position" variant="neutral" :label="row.position" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile card fallback -->
    <div class="md:hidden space-y-3">
      <p v-if="!data.grid.length" class="text-sm text-slate-400 text-center py-8">No students with scores this term yet</p>
      <div v-for="row in data.grid" :key="row.student.id" class="bg-white border border-slate-200 rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-slate-900">{{ row.student.first_name }} {{ row.student.last_name }}</p>
          <StatusBadge v-if="row.position" variant="neutral" :label="row.position" />
        </div>
        <p class="text-[12px] text-slate-500">
          <span v-for="(subj, i) in data.subjects" :key="subj.id">{{ subj.name }} {{ row.bySubject[subj.id]?.total ?? '\u2014' }}<span v-if="i < data.subjects.length - 1"> &middot; </span></span>
        </p>
        <p class="text-[12px] text-slate-400 mt-1">Average: {{ row.average !== null ? row.average.toFixed(1) : '\u2014' }}</p>
      </div>
      <p class="text-[12px] text-slate-400 text-center pt-1">Switch to a tablet or desktop width for the full grid</p>
    </div>
  </template>
</template>
