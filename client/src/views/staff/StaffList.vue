<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import DataTable from '../../components/base/DataTable.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import { useToast } from '../../components/base/useToast';

const staff = ref([]);
const showAdd = ref(false);
const errors = ref({});
const toast = useToast();

const form = ref({ first_name: '', last_name: '', staff_type: 'class_teacher', phone: '', email: '' });
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'staff_no', label: 'Staff no.' },
  { key: 'staff_type', label: 'Type' },
  { key: 'is_active', label: 'Status' }
];

async function load() {
  const res = await api.get('/staff');
  staff.value = res.data.data.map((s) => ({ ...s, name: `${s.first_name} ${s.last_name}` }));
}
onMounted(load);

async function addStaff() {
  errors.value = {};
  try {
    await api.post('/staff', form.value);
    showAdd.value = false;
    form.value = { first_name: '', last_name: '', staff_type: 'class_teacher', phone: '', email: '' };
    toast.success('Staff profile saved');
    await load();
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = Object.fromEntries(e.response.data.errors.map((er) => [er.field, er.message]));
    }
  }
}
</script>

<template>
  <PageHeader title="Staff" :subtitle="`${staff.length} staff members`">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showAdd = true">Add staff</button>
    </template>
  </PageHeader>

  <DataTable :columns="columns" :rows="staff">
    <template #cell-staff_no="{ row }"><span class="font-mono text-[13px] text-slate-500">{{ row.staff_no }}</span></template>
    <template #cell-is_active="{ row }">
      <StatusBadge :variant="row.is_active ? 'success' : 'neutral'" :label="row.is_active ? 'Active' : 'Inactive'" />
    </template>
  </DataTable>

  <Modal v-model="showAdd" title="Add staff">
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <Field label="First name" :error="errors.first_name">
          <input v-model="form.first_name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
        </Field>
        <Field label="Last name" :error="errors.last_name">
          <input v-model="form.last_name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
        </Field>
      </div>
      <Field label="Staff type">
        <select v-model="form.staff_type" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm">
          <option value="class_teacher">Class teacher</option>
          <option value="subject_teacher">Subject teacher</option>
          <option value="bursar">Bursar</option>
          <option value="principal">Principal</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <Field label="Phone">
        <input v-model="form.phone" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
      <Field label="Email" :error="errors.email">
        <input v-model="form.email" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
      <p class="text-[12px] text-slate-400">Staff number is assigned automatically from the number sequence.</p>
    </div>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAdd = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="addStaff">Save staff</button>
    </template>
  </Modal>
</template>
