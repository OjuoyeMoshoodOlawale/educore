<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const classes = ref([]);
const terms = ref([]);
const fromClassId = ref(null);
const fromTermId = ref(null);
const toClassId = ref(null);
const toTermId = ref(null);
const students = ref(null);
const selected = ref(new Set());

async function loadBase() {
  const [classesRes, sessionsRes] = await Promise.all([api.get('/schools/classes'), api.get('/schools/sessions')]);
  classes.value = classesRes.data.data;
  const active = sessionsRes.data.data.find((s) => s.is_active) || sessionsRes.data.data[0];
  if (active) {
    const termsRes = await api.get(`/schools/sessions/${active.id}/terms`);
    terms.value = termsRes.data.data;
    fromTermId.value = terms.value.find((t) => t.is_current)?.id || terms.value[0]?.id;
  }
  fromClassId.value = classes.value[0]?.id;
  await loadStudents();
}
onMounted(loadBase);

async function loadStudents() {
  if (!fromClassId.value || !fromTermId.value) return;
  const res = await api.get(`/promotion/students/${fromClassId.value}/${fromTermId.value}`);
  students.value = res.data.data;
  selected.value = new Set(students.value.map((s) => s.id)); // default: everyone selected
}

function toggle(id) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}

async function promote() {
  if (!toClassId.value || !toTermId.value) {
    toast.error('Choose a target class and term first');
    return;
  }
  const res = await api.post('/promotion/promote', {
    studentIds: [...selected.value],
    toClassId: toClassId.value,
    toTermId: toTermId.value
  });
  toast.success(`${res.data.data.promoted} promoted${res.data.data.skipped ? `, ${res.data.data.skipped} already promoted` : ''}`);
}
</script>

<template>
  <PageHeader title="Promotion" subtitle="Append-only — a student's record in the old term is never changed, only added to." />

  <div class="grid sm:grid-cols-2 gap-5 mb-5">
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <p class="text-[12px] font-medium text-slate-500 mb-2">From</p>
      <div class="flex gap-2">
        <select v-model.number="fromClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px] flex-1" @change="loadStudents">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model.number="fromTermId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px] flex-1" @change="loadStudents">
          <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl p-4">
      <p class="text-[12px] font-medium text-slate-500 mb-2">To</p>
      <div class="flex gap-2">
        <select v-model.number="toClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px] flex-1">
          <option :value="null">Select class</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model.number="toTermId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px] flex-1">
          <option :value="null">Select term</option>
          <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
    </div>
  </div>

  <Spinner v-if="!students" />
  <template v-else>
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[12px]"><tr><th class="text-left font-medium px-4 py-2.5 w-10"></th><th class="text-left font-medium px-4 py-2.5">Student</th><th class="text-left font-medium px-4 py-2.5">Admission no.</th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!students.length"><td colspan="3" class="px-4 py-8 text-center text-slate-400">No active students in this class/term</td></tr>
          <tr v-for="s in students" :key="s.id">
            <td class="px-4 py-3"><input type="checkbox" :checked="selected.has(s.id)" class="rounded border-slate-300 text-primary" @change="toggle(s.id)" /></td>
            <td class="px-4 py-3 text-slate-800">{{ s.first_name }} {{ s.last_name }}</td>
            <td class="px-4 py-3 font-mono text-[13px] text-slate-500">{{ s.admission_no }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex justify-end mt-4">
      <button :disabled="!selected.size" class="px-4 h-10 text-sm font-medium rounded-lg bg-primary text-white disabled:opacity-50" @click="promote">
        Promote {{ selected.size }} student{{ selected.size === 1 ? '' : 's' }}
      </button>
    </div>
  </template>
</template>
