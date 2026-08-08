<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import DataTable from '../../components/base/DataTable.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';

const students = ref([]);
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'admission_no', label: 'Admission no.' },
  { key: 'sex', label: 'Sex' },
  { key: 'boarding_type', label: 'Boarding' }
];

onMounted(async () => {
  const res = await api.get('/students');
  students.value = res.data.data.map((s) => ({ ...s, name: `${s.first_name} ${s.last_name}` }));
});
</script>

<template>
  <PageHeader :title="'Students'" :subtitle="`${students.length} students`">
    <template #actions>
      <RouterLink to="/students/new" class="h-9 px-3 flex items-center text-[13px] font-medium rounded-lg bg-primary text-white">Add student</RouterLink>
    </template>
  </PageHeader>

  <DataTable :columns="columns" :rows="students">
    <template #cell-name="{ row }">
      <RouterLink :to="`/students/${row.id}`" class="text-slate-800 hover:text-primary">{{ row.name }}</RouterLink>
    </template>
    <template #cell-admission_no="{ row }"><span class="font-mono text-[13px] text-slate-500">{{ row.admission_no }}</span></template>
    <template #cell-boarding_type="{ row }"><StatusBadge :variant="row.boarding_type === 'boarder' ? 'primary' : 'neutral'" :label="row.boarding_type" /></template>
  </DataTable>
</template>
