<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const classes = ref([]);
const subjects = ref([]);
const staff = ref([]);
const classTeachers = ref(null);
const subjectTeachers = ref(null);

const newSubjectAssignment = ref({ class_id: '', subject_id: '', staff_id: '' });
const toast = useToast();

// A real term id would come from Settings → Academic calendar's "current term";
// hardcoded here since Phase 1's calendar screen doesn't expose a global "current term" picker yet.
const CURRENT_TERM_ID = 2;

async function load() {
  const [c, s, st, alloc] = await Promise.all([
    api.get('/schools/classes'),
    api.get('/schools/subjects'),
    api.get('/staff'),
    api.get(`/staff/allocation/${CURRENT_TERM_ID}`)
  ]);
  classes.value = c.data.data;
  subjects.value = s.data.data;
  staff.value = st.data.data;
  classTeachers.value = alloc.data.data.classTeachers;
  subjectTeachers.value = alloc.data.data.subjectTeachers;
}
onMounted(load);

async function assignClassTeacher(classId, staffId) {
  if (!staffId) return;
  await api.post('/staff/allocation/class-teacher', { term_id: CURRENT_TERM_ID, class_id: classId, staff_id: staffId });
  toast.success('Class teacher assigned');
  await load();
}

async function addSubjectAssignment() {
  const { class_id, subject_id, staff_id } = newSubjectAssignment.value;
  if (!class_id || !subject_id || !staff_id) return;
  await api.post('/staff/allocation/subject-teacher', { term_id: CURRENT_TERM_ID, class_id, subject_id, staff_id });
  toast.success('Subject teacher added');
  newSubjectAssignment.value = { class_id: '', subject_id: '', staff_id: '' };
  await load();
}

async function removeSubjectAssignment(id) {
  await api.delete(`/staff/allocation/subject-teacher/${id}`);
  toast.info('Assignment removed');
  await load();
}
</script>

<template>
  <PageHeader title="Class & subject allocation" subtitle="Assignments are per term." />
  <Spinner v-if="!classTeachers" />

  <template v-else>
    <div class="bg-white border border-slate-200 rounded-xl p-5 mb-5">
      <h3 class="text-sm font-medium text-slate-900 mb-3">Class teachers</h3>
      <table class="w-full text-sm">
        <thead class="text-slate-500 text-[12px]"><tr><th class="text-left font-medium py-2">Class</th><th class="text-left font-medium py-2">Class teacher</th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="cls in classes" :key="cls.id">
            <td class="py-2.5 text-slate-700">{{ cls.name }}</td>
            <td class="py-2.5">
              <select
                class="h-9 w-56 px-2.5 rounded-lg border border-slate-300 text-sm"
                :value="classTeachers.find((ct) => ct.class_id === cls.id)?.staff_id || ''"
                @change="assignClassTeacher(cls.id, $event.target.value)"
              >
                <option value="">&mdash; Unassigned &mdash;</option>
                <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.first_name }} {{ s.last_name }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-5">
      <h3 class="text-sm font-medium text-slate-900 mb-3">Subject teachers</h3>
      <p class="text-[12px] text-slate-400 mb-3">More than one teacher can be assigned to the same class-subject — co-teaching or a substitute alongside the primary teacher.</p>
      <table class="w-full text-sm mb-4">
        <thead class="text-slate-500 text-[12px]"><tr><th class="text-left font-medium py-2">Subject</th><th class="text-left font-medium py-2">Class</th><th class="text-left font-medium py-2">Teacher</th><th></th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="a in subjectTeachers" :key="a.id">
            <td class="py-2.5 text-slate-700">{{ a.subject_name }}</td>
            <td class="py-2.5 text-slate-500">{{ a.class_name }}</td>
            <td class="py-2.5 text-slate-700">{{ a.first_name }} {{ a.last_name }}</td>
            <td class="py-2.5 text-right"><button class="text-danger text-[13px]" @click="removeSubjectAssignment(a.id)">Remove</button></td>
          </tr>
        </tbody>
      </table>

      <div class="flex flex-wrap items-end gap-2">
        <select v-model="newSubjectAssignment.subject_id" class="h-9 px-2.5 rounded-lg border border-slate-300 text-sm">
          <option value="">Subject</option>
          <option v-for="s in subjects" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="newSubjectAssignment.class_id" class="h-9 px-2.5 rounded-lg border border-slate-300 text-sm">
          <option value="">Class</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="newSubjectAssignment.staff_id" class="h-9 px-2.5 rounded-lg border border-slate-300 text-sm">
          <option value="">Teacher</option>
          <option v-for="s in staff" :key="s.id" :value="s.id">{{ s.first_name }} {{ s.last_name }}</option>
        </select>
        <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="addSubjectAssignment">Add</button>
      </div>
    </div>
  </template>
</template>
