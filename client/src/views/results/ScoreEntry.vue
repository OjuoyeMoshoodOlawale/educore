<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const classes = ref([]);
const subjects = ref([]);
const terms = ref([]);
const selectedClassId = ref(null);
const selectedSubjectId = ref(null);
const selectedTermId = ref(null);
const grid = ref(null);
const errors = ref({}); // keyed by studentId, holds { ca1?, ca2?, exam? }

async function loadBase() {
  const [classesRes, subjectsRes, sessionsRes] = await Promise.all([
    api.get('/schools/classes'),
    api.get('/schools/subjects'),
    api.get('/schools/sessions')
  ]);
  classes.value = classesRes.data.data;
  subjects.value = subjectsRes.data.data;
  selectedClassId.value = classes.value[0]?.id;
  selectedSubjectId.value = subjects.value[0]?.id;

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
  if (!selectedClassId.value || !selectedSubjectId.value || !selectedTermId.value) return;
  const res = await api.get(`/results/scores/${selectedClassId.value}/${selectedSubjectId.value}/${selectedTermId.value}`);
  grid.value = res.data.data;
  errors.value = {};
}

async function saveScore(student) {
  const ca1 = student.score?.ca1 ?? 0;
  const ca2 = student.score?.ca2 ?? 0;
  const exam = student.score?.exam ?? 0;
  try {
    const res = await api.put(`/results/scores/${student.id}/${selectedSubjectId.value}/${selectedTermId.value}`, { ca1, ca2, exam });
    errors.value = { ...errors.value, [student.id]: null };
    student.score = { ...student.score, total: res.data.data.total, computed_grade: res.data.data.grade };
  } catch (e) {
    if (e.response?.status === 422) {
      const fieldErrors = Object.fromEntries(e.response.data.errors.map((er) => [er.field, er.message]));
      errors.value = { ...errors.value, [student.id]: fieldErrors };
    } else {
      toast.error('Could not save this score');
    }
  }
}

function updateField(student, field, value) {
  if (!student.score) student.score = { ca1: 0, ca2: 0, exam: 0 };
  student.score[field] = Number(value);
}
</script>

<template>
  <PageHeader title="Score entry" subtitle="Validated against each subject's configured max — server-side, not just here." />

  <div class="flex flex-wrap gap-2 mb-4">
    <select v-model.number="selectedSubjectId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadGrid">
      <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
    </select>
    <select v-model.number="selectedClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadGrid">
      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
    <span v-if="grid" class="h-9 flex items-center text-[13px] text-slate-400">
      CA1 max {{ grid.subject.ca1_max }} &middot; CA2 max {{ grid.subject.ca2_max }} &middot; Exam max {{ grid.subject.exam_max }}
    </span>
  </div>

  <Spinner v-if="!grid" />
  <!-- Sticky name column, scrollable score columns — keeps row identity visible while entering scores on mobile -->
  <div v-else class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
    <table class="text-sm border-collapse">
      <thead class="bg-slate-50 text-slate-500 text-[12px]">
        <tr>
          <th class="sticky left-0 bg-slate-50 text-left font-medium px-4 py-2.5 z-10 min-w-[140px]">Student</th>
          <th class="text-left font-medium px-3 py-2.5">CA1</th>
          <th class="text-left font-medium px-3 py-2.5">CA2</th>
          <th class="text-left font-medium px-3 py-2.5">Exam</th>
          <th class="text-left font-medium px-3 py-2.5">Total</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-if="!grid.students.length"><td colspan="5" class="px-4 py-8 text-center text-slate-400">No students in this class/term yet</td></tr>
        <tr v-for="s in grid.students" :key="s.id">
          <td class="sticky left-0 bg-white text-slate-800 px-4 py-2.5 z-10 whitespace-nowrap">{{ s.first_name }} {{ s.last_name }}</td>
          <td class="px-3 py-2.5">
            <input type="text" :value="s.score?.ca1 ?? ''" class="w-16 h-8 px-2 rounded border text-sm" :class="errors[s.id]?.ca1 ? 'border-danger text-danger' : 'border-slate-200'" @input="updateField(s, 'ca1', $event.target.value)" @blur="saveScore(s)" />
          </td>
          <td class="px-3 py-2.5">
            <input type="text" :value="s.score?.ca2 ?? ''" class="w-16 h-8 px-2 rounded border text-sm" :class="errors[s.id]?.ca2 ? 'border-danger text-danger' : 'border-slate-200'" @input="updateField(s, 'ca2', $event.target.value)" @blur="saveScore(s)" />
          </td>
          <td class="px-3 py-2.5">
            <input type="text" :value="s.score?.exam ?? ''" class="w-16 h-8 px-2 rounded border text-sm" :class="errors[s.id]?.exam ? 'border-danger text-danger' : 'border-slate-200'" @input="updateField(s, 'exam', $event.target.value)" @blur="saveScore(s)" />
          </td>
          <td class="px-3 py-2.5 text-slate-700 font-medium">{{ s.score?.total ?? '\u2014' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p v-for="(err, id) in errors" :key="id">
    <span v-if="err" class="flex items-center gap-1.5 mt-2 text-[12px] text-danger">
      <span aria-hidden="true">&#9888;</span> {{ Object.values(err)[0] }}
    </span>
  </p>
</template>
