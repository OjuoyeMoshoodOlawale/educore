<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import StarRating from '../../components/base/StarRating.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const classes = ref([]);
const terms = ref([]);
const selectedClassId = ref(null);
const selectedTermId = ref(null);
const domain = ref('psychomotor');
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
  await loadGrid();
}
onMounted(loadBase);

async function loadGrid() {
  if (!selectedClassId.value || !selectedTermId.value) return;
  const res = await api.get(`/results/traits/${domain.value}/${selectedClassId.value}/${selectedTermId.value}`);
  data.value = res.data.data;
}

function ratingFor(studentId, traitId) {
  const score = data.value.scores.find((s) => s.student_id === studentId && s.trait_definition_id === traitId);
  const key = data.value.ratingKeys.find((k) => k.id === score?.rating_key_id);
  return key?.key_value || 0;
}

async function setRating(studentId, traitId, value) {
  const ratingKey = data.value.ratingKeys.find((k) => k.key_value === value);
  await api.put(`/results/traits/${studentId}/${traitId}/${selectedTermId.value}`, { ratingKeyId: ratingKey.id });
  toast.info('Rating saved');
  await loadGrid();
}
</script>

<template>
  <PageHeader title="Psychomotor & affective ratings" subtitle="Rated against the school's configured 1\u20135 scale." />

  <div class="flex gap-1 border-b border-slate-200 mb-4">
    <button class="px-3 py-2.5 text-sm font-medium" :class="domain === 'psychomotor' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'" @click="domain = 'psychomotor'; loadGrid()">Psychomotor</button>
    <button class="px-3 py-2.5 text-sm font-medium" :class="domain === 'affective' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'" @click="domain = 'affective'; loadGrid()">Affective</button>
  </div>

  <div class="flex flex-wrap gap-2 mb-4">
    <select v-model.number="selectedClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadGrid">
      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
  </div>

  <Spinner v-if="!data" />
  <div v-else class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
    <table class="text-sm min-w-full">
      <thead class="bg-slate-50 text-slate-500 text-[12px]">
        <tr>
          <th class="sticky left-0 bg-slate-50 text-left font-medium px-4 py-2.5 min-w-[140px]">Student</th>
          <th v-for="t in data.traits" :key="t.id" class="text-left font-medium px-3 py-2.5 whitespace-nowrap">{{ t.description }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-if="!data.students.length"><td :colspan="data.traits.length + 1" class="px-4 py-8 text-center text-slate-400">No students in this class/term yet</td></tr>
        <tr v-for="s in data.students" :key="s.id">
          <td class="sticky left-0 bg-white text-slate-800 px-4 py-2.5 whitespace-nowrap">{{ s.first_name }} {{ s.last_name }}</td>
          <td v-for="t in data.traits" :key="t.id" class="px-3 py-2.5">
            <StarRating :model-value="ratingFor(s.id, t.id)" @update:model-value="setRating(s.id, t.id, $event)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
