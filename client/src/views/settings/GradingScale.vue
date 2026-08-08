<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import StarRating from '../../components/base/StarRating.vue';
import Modal from '../../components/base/Modal.vue';
import Confirm from '../../components/base/Confirm.vue';
import Field from '../../components/base/Field.vue';
import { useToast } from '../../components/base/useToast';

const data = ref(null);
const toast = useToast();
const gradeVariant = { A: 'success', B: 'primary', C: 'warning', F: 'danger' };

async function load() {
  const res = await api.get('/schools/grading-scale');
  data.value = res.data.data;
}
onMounted(load);

// ---- Grade boundaries ----
const showGradeModal = ref(false);
const editingGrade = ref(null);
const gradeForm = ref({ grade_key: '', min_score: 0, max_score: 100, description: '' });
const confirmDeleteGrade = ref(null);

function openGradeModal(grade = null) {
  editingGrade.value = grade;
  gradeForm.value = grade ? { ...grade } : { grade_key: '', min_score: 0, max_score: 100, description: '' };
  showGradeModal.value = true;
}
async function saveGrade() {
  const payload = { ...gradeForm.value, min_score: Number(gradeForm.value.min_score), max_score: Number(gradeForm.value.max_score) };
  if (editingGrade.value) {
    await api.put(`/schools/grading-scale/grade-boundaries/${editingGrade.value.id}`, payload);
  } else {
    await api.post('/schools/grading-scale/grade-boundaries', payload);
  }
  showGradeModal.value = false;
  toast.success('Grade boundary saved');
  await load();
}
async function deleteGrade() {
  await api.delete(`/schools/grading-scale/grade-boundaries/${confirmDeleteGrade.value.id}`);
  toast.success('Grade boundary removed');
  await load();
}

// ---- Rating keys ----
const showRatingModal = ref(false);
const editingRating = ref(null);
const ratingForm = ref({ key_value: 5, description: '' });

function openRatingModal(rating = null) {
  editingRating.value = rating;
  ratingForm.value = rating ? { ...rating } : { key_value: 5, description: '' };
  showRatingModal.value = true;
}
async function saveRating() {
  const payload = { ...ratingForm.value, key_value: Number(ratingForm.value.key_value) };
  if (editingRating.value) {
    await api.put(`/schools/grading-scale/rating-keys/${editingRating.value.id}`, payload);
  } else {
    await api.post('/schools/grading-scale/rating-keys', payload);
  }
  showRatingModal.value = false;
  toast.success('Rating saved');
  await load();
}
</script>

<template>
  <PageHeader title="Grading scale" subtitle="Grade boundaries and the psychomotor/affective rating legend — school-defined, fully editable." />
  <Spinner v-if="!data" />
  <template v-else>
    <div class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 mb-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-slate-900">Grade boundaries</h3>
        <button class="text-[13px] text-primary" @click="openGradeModal()">+ Add grade</button>
      </div>
      <div class="overflow-x-auto -mx-4 sm:mx-0">
        <table class="w-full text-sm min-w-[420px]">
          <thead class="text-slate-500 text-[12px]">
            <tr><th class="text-left font-medium py-2 px-4 sm:px-0">Grade</th><th class="text-left font-medium py-2">Score range</th><th class="text-left font-medium py-2">Description</th><th></th></tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="g in data.gradeBoundaries" :key="g.id">
              <td class="py-2.5 px-4 sm:px-0"><StatusBadge :variant="gradeVariant[g.grade_key] || 'neutral'" :label="g.grade_key" /></td>
              <td class="py-2.5 text-slate-600">{{ g.min_score }} &ndash; {{ g.max_score }}</td>
              <td class="py-2.5 text-slate-500">{{ g.description }}</td>
              <td class="py-2.5 text-right pr-4 sm:pr-0">
                <button class="text-[12px] text-slate-500 mr-3" @click="openGradeModal(g)">Edit</button>
                <button class="text-[12px] text-danger" @click="confirmDeleteGrade = g">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-medium text-slate-900">Psychomotor &amp; affective rating legend</h3>
        <button class="text-[13px] text-primary" @click="openRatingModal()">+ Add rating</button>
      </div>
      <div class="space-y-2">
        <div v-for="r in data.ratingKeys" :key="r.id" class="flex flex-wrap items-center gap-3">
          <StarRating :model-value="r.key_value" :max="5" />
          <span class="text-[13px] text-slate-600 flex-1">{{ r.description }}</span>
          <button class="text-[12px] text-slate-500" @click="openRatingModal(r)">Edit</button>
        </div>
      </div>
    </div>

    <Modal v-model="showGradeModal" :title="editingGrade ? 'Edit grade' : 'Add grade'" size="sm">
      <div class="space-y-3">
        <Field label="Grade key"><input v-model="gradeForm.grade_key" placeholder="A" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <div class="grid grid-cols-2 gap-3">
          <Field label="Min score"><input v-model="gradeForm.min_score" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
          <Field label="Max score"><input v-model="gradeForm.max_score" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        </div>
        <Field label="Description"><input v-model="gradeForm.description" placeholder="Excellent" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>
      <template #footer>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showGradeModal = false">Cancel</button>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="saveGrade">Save</button>
      </template>
    </Modal>

    <Modal v-model="showRatingModal" :title="editingRating ? 'Edit rating' : 'Add rating'" size="sm">
      <div class="space-y-3">
        <Field label="Value (1\u20135)"><input v-model="ratingForm.key_value" type="number" min="1" max="5" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="Description"><input v-model="ratingForm.description" placeholder="Excellent" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>
      <template #footer>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showRatingModal = false">Cancel</button>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="saveRating">Save</button>
      </template>
    </Modal>

    <Confirm
      :model-value="!!confirmDeleteGrade"
      title="Delete this grade?"
      :message="`Report cards using ${confirmDeleteGrade?.grade_key || ''} will need a new matching boundary.`"
      @update:model-value="confirmDeleteGrade = null"
      @confirm="deleteGrade"
    />
  </template>
</template>
