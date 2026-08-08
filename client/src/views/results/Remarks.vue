<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/auth';
import PageHeader from '../../components/base/PageHeader.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const auth = useAuthStore();
const toast = useToast();
const classes = ref([]);
const terms = ref([]);
const selectedClassId = ref(null);
const selectedTermId = ref(null);
const students = ref([]);
const currentStudent = ref(null);
const remarkData = ref(null);
const form = ref({ days_present: 0, days_absent: 0, times_school_opened: 0, teacher_comment: '' });
const principalComment = ref('');

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
  await loadStudents();
}
onMounted(loadBase);

async function loadStudents() {
  if (!selectedClassId.value || !selectedTermId.value) return;
  const res = await api.get(`/students?classId=${selectedClassId.value}&termId=${selectedTermId.value}`);
  students.value = res.data.data;
  if (students.value.length) selectStudent(students.value[0]);
}

async function selectStudent(student) {
  currentStudent.value = student;
  const res = await api.get(`/results/remarks/${student.id}/${selectedTermId.value}`);
  remarkData.value = res.data.data;
  const r = remarkData.value.remark;
  form.value = {
    days_present: r?.days_present ?? 0,
    days_absent: r?.days_absent ?? 0,
    times_school_opened: r?.times_school_opened ?? 0,
    teacher_comment: r?.teacher_comment || remarkData.value.teacherDraft || ''
  };
  principalComment.value = r?.principal_comment || remarkData.value.principalDraft || '';
}

async function saveTeacher() {
  await api.put(`/results/remarks/${currentStudent.value.id}/${selectedTermId.value}`, form.value);
  toast.success(`Saved for ${currentStudent.value.first_name}`);
}

async function savePrincipal() {
  await api.put(`/results/remarks/${currentStudent.value.id}/${selectedTermId.value}/principal`, { principal_comment: principalComment.value });
  toast.success('Principal comment saved');
}
</script>

<template>
  <PageHeader title="Attendance & comments" subtitle="Comments are pre-filled from performance — review and edit, nothing saves unreviewed." />

  <div class="flex flex-wrap gap-2 mb-4">
    <select v-model.number="selectedClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadStudents">
      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
  </div>

  <div class="grid md:grid-cols-3 gap-5">
    <div class="bg-white border border-slate-200 rounded-xl p-3 md:col-span-1">
      <p class="text-[12px] font-medium text-slate-500 px-2 mb-1">Students</p>
      <button
        v-for="s in students" :key="s.id"
        class="w-full text-left px-3 py-2 rounded text-sm"
        :class="currentStudent?.id === s.id ? 'bg-primary-50 text-primary font-medium' : 'text-slate-700 hover:bg-slate-50'"
        @click="selectStudent(s)"
      >{{ s.first_name }} {{ s.last_name }}</button>
      <p v-if="!students.length" class="text-sm text-slate-400 text-center py-6">No students in this class/term</p>
    </div>

    <div v-if="currentStudent && remarkData" class="bg-white border border-slate-200 rounded-xl p-5 md:col-span-2">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-10 h-10 rounded-full bg-primary-50 text-primary text-[13px] font-medium flex items-center justify-center">{{ currentStudent.first_name[0] }}{{ currentStudent.last_name[0] }}</div>
        <div>
          <p class="text-sm font-medium text-slate-900">{{ currentStudent.first_name }} {{ currentStudent.last_name }}</p>
          <p class="text-[12px] text-slate-500">Term average: {{ remarkData.termAverage !== null ? remarkData.termAverage.toFixed(1) + '%' : 'No scores yet' }}</p>
        </div>
      </div>

      <div class="grid sm:grid-cols-3 gap-3 mb-5">
        <Field label="Days present"><input v-model.number="form.days_present" type="number" class="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="Days absent"><input v-model.number="form.days_absent" type="number" class="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="Times school opened"><input v-model.number="form.times_school_opened" type="number" class="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>

      <Field label="Teacher's comment">
        <textarea v-model="form.teacher_comment" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"></textarea>
      </Field>
      <p v-if="remarkData.teacherDraft && !remarkData.remark?.teacher_comment" class="flex items-center gap-1.5 text-[12px] text-slate-400 mt-1 mb-4">
        <span aria-hidden="true">&#10024;</span> Drafted from this term's average — edit freely before saving
      </p>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white mb-6" @click="saveTeacher">Save & next student</button>

      <div class="pt-4 border-t border-slate-100">
        <Field label="Principal's comment">
          <textarea v-model="principalComment" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" :placeholder="auth.user?.role !== 'principal' && auth.user?.role !== 'admin' ? 'Only the principal can write this' : ''"></textarea>
        </Field>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white mt-2" @click="savePrincipal">Save principal comment</button>
      </div>
    </div>
    <Spinner v-else-if="students.length" />
  </div>
</template>
