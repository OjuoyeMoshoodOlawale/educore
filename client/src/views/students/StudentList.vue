<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import DataTable from '../../components/base/DataTable.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';

const students = ref([]);
const statusFilter = ref('');
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'admission_no', label: 'Admission no.' },
  { key: 'class_name', label: 'Class', sortable: true },
  { key: 'boarding_type', label: 'Boarding' },
  { key: 'status', label: 'Status' }
];

const STATUS_VARIANT = { active: 'success', inactive: 'neutral', graduated: 'primary', withdrawn: 'danger' };

async function load() {
  const params = statusFilter.value ? { status: statusFilter.value } : {};
  const res = await api.get('/students', { params });
  students.value = res.data.data.map((s) => ({ ...s, name: `${s.first_name} ${s.last_name}` }));
}
onMounted(load);
</script>

<template>
  <PageHeader :title="'Students'" :subtitle="`${students.length} students`">
    <template #actions>
      <select v-model="statusFilter" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="load">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="graduated">Graduated</option>
        <option value="withdrawn">Withdrawn</option>
      </select>
      <RouterLink to="/students/new" class="h-9 px-3 flex items-center text-[13px] font-medium rounded-lg bg-primary text-white">Add student</RouterLink>
    </template>
  </PageHeader>

  <DataTable :columns="columns" :rows="students" searchable :search-keys="['name', 'admission_no', 'class_name']">
    <template #cell-name="{ row }">
      <RouterLink :to="`/students/${row.id}`" class="text-slate-800 hover:text-primary">{{ row.name }}</RouterLink>
    </template>
    <template #cell-admission_no="{ row }"><span class="font-mono text-[13px] text-slate-500">{{ row.admission_no }}</span></template>
    <template #cell-boarding_type="{ row }"><StatusBadge :variant="row.boarding_type === 'boarder' ? 'primary' : 'neutral'" :label="row.boarding_type || '\u2014'" /></template>
    <template #cell-status="{ row }"><StatusBadge :variant="STATUS_VARIANT[row.status] || 'neutral'" :label="row.status || 'no current term'" /></template>
  </DataTable>
</template>
