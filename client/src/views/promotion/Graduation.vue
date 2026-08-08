<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Confirm from '../../components/base/Confirm.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const classes = ref([]);
const terms = ref([]);
const classId = ref(null);
const termId = ref(null);
const students = ref(null);
const selected = ref(new Set());
const confirmOpen = ref(false);

async function loadBase() {
  const [classesRes, sessionsRes] = await Promise.all([api.get('/schools/classes'), api.get('/schools/sessions')]);
  classes.value = classesRes.data.data;
  classId.value = classes.value[classes.value.length - 1]?.id; // default to the final class
  const active = sessionsRes.data.data.find((s) => s.is_active) || sessionsRes.data.data[0];
  if (active) {
    const termsRes = await api.get(`/schools/sessions/${active.id}/terms`);
    terms.value = termsRes.data.data;
    termId.value = terms.value.find((t) => t.is_current)?.id || terms.value[0]?.id;
  }
  await loadStudents();
}
onMounted(loadBase);

async function loadStudents() {
  if (!classId.value || !termId.value) return;
  const res = await api.get(`/promotion/students/${classId.value}/${termId.value}`);
  students.value = res.data.data;
  selected.value = new Set();
}

function toggle(id) {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
}

async function graduate() {
  await api.post('/promotion/graduate', { studentIds: [...selected.value], termId: termId.value });
  toast.success(`${selected.value.size} student(s) graduated`);
  await loadStudents();
}
</script>

<template>
  <PageHeader title="Graduation" subtitle="Terminal — moves students out of the active roster. Their scores and payment history stay." />

  <div class="flex flex-wrap gap-2 mb-4">
    <select v-model.number="classId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadStudents">
      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
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
      <button :disabled="!selected.size" class="px-4 h-10 text-sm font-medium rounded-lg bg-danger text-white disabled:opacity-50" @click="confirmOpen = true">
        Graduate {{ selected.size }} student{{ selected.size === 1 ? '' : 's' }}
      </button>
    </div>
  </template>

  <Confirm
    v-model="confirmOpen"
    title="Graduate these students?"
    message="This moves them out of the active roster. It can't be undone from here — their scores and payment history stay on record."
    confirm-label="Graduate"
    @confirm="graduate"
  />
</template>
