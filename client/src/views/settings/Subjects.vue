<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import DataTable from '../../components/base/DataTable.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import { useToast } from '../../components/base/useToast';

const subjects = ref([]);
const showAdd = ref(false);
const errors = ref({});
const toast = useToast();

const form = ref({ name: '', code: '', is_core: true, ca1_max: 20, ca2_max: 20, exam_max: 60 });
const columns = [
  { key: 'name', label: 'Subject' },
  { key: 'code', label: 'Code' },
  { key: 'ca1_max', label: 'CA1 max' },
  { key: 'ca2_max', label: 'CA2 max' },
  { key: 'exam_max', label: 'Exam max' },
  { key: 'is_core', label: 'Type' }
];

async function load() {
  const res = await api.get('/schools/subjects');
  subjects.value = res.data.data;
}
onMounted(load);

async function addSubject() {
  errors.value = {};
  try {
    await api.post('/schools/subjects', form.value);
    showAdd.value = false;
    form.value = { name: '', code: '', is_core: true, ca1_max: 20, ca2_max: 20, exam_max: 60 };
    toast.success('Subject added');
    await load();
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = Object.fromEntries(e.response.data.errors.map((er) => [er.field, er.message]));
    }
  }
}

// Inline max-score edits save on blur — no separate "edit mode" needed for a single-field change.
async function updateMax(subject, field, value) {
  const payload = { ...subject, [field]: Number(value) };
  await api.put(`/schools/subjects/${subject.id}`, payload);
  toast.info(`${subject.name} updated`);
}
</script>

<template>
  <PageHeader title="Subjects" subtitle="Each subject has its own configurable max score.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showAdd = true">Add subject</button>
    </template>
  </PageHeader>

  <DataTable :columns="columns" :rows="subjects">
    <template #cell-ca1_max="{ row }">
      <input type="number" :value="row.ca1_max" class="w-16 h-8 px-2 rounded border border-slate-200 text-sm" @change="updateMax(row, 'ca1_max', $event.target.value)" />
    </template>
    <template #cell-ca2_max="{ row }">
      <input type="number" :value="row.ca2_max" class="w-16 h-8 px-2 rounded border border-slate-200 text-sm" @change="updateMax(row, 'ca2_max', $event.target.value)" />
    </template>
    <template #cell-exam_max="{ row }">
      <input type="number" :value="row.exam_max" class="w-16 h-8 px-2 rounded border border-slate-200 text-sm" @change="updateMax(row, 'exam_max', $event.target.value)" />
    </template>
    <template #cell-is_core="{ row }">
      <StatusBadge :variant="row.is_core ? 'primary' : 'neutral'" :label="row.is_core ? 'Core' : 'Elective'" />
    </template>
  </DataTable>

  <Modal v-model="showAdd" title="Add subject">
    <div class="space-y-3">
      <Field label="Subject name" :error="errors.name">
        <input v-model="form.name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
      <Field label="Code">
        <input v-model="form.code" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
      <div class="grid grid-cols-3 gap-3">
        <Field label="CA1 max"><input v-model.number="form.ca1_max" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="CA2 max"><input v-model.number="form.ca2_max" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="Exam max"><input v-model.number="form.exam_max" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>
      <label class="flex items-center gap-2 text-[13px] text-slate-600">
        <input v-model="form.is_core" type="checkbox" class="rounded border-slate-300 text-primary" /> Core subject
      </label>
    </div>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAdd = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="addSubject">Add subject</button>
    </template>
  </Modal>
</template>
