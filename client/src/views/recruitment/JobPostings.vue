<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import { useToast } from '../../components/base/useToast';

const postings = ref([]);
const showAdd = ref(false);
const form = ref({ title: '', description: '', department: 'subject_teacher' });
const toast = useToast();

async function load() {
  const res = await api.get('/recruitment/postings');
  postings.value = res.data.data;
}
onMounted(load);

async function create() {
  await api.post('/recruitment/postings', form.value);
  showAdd.value = false;
  form.value = { title: '', description: '', department: 'subject_teacher' };
  toast.success('Job posting created');
  await load();
}

async function close(posting) {
  await api.post(`/recruitment/postings/${posting.id}/close`);
  toast.info(`${posting.title} closed`);
  await load();
}
</script>

<template>
  <PageHeader title="Job postings" subtitle="Applicants apply through a public link, no login needed.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showAdd = true">New posting</button>
    </template>
  </PageHeader>

  <div class="grid sm:grid-cols-2 gap-4">
    <div v-for="p in postings" :key="p.id" class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-1">
        <StatusBadge :variant="p.status === 'open' ? 'success' : 'neutral'" :label="p.status" />
      </div>
      <RouterLink :to="`/recruitment/postings/${p.id}`" class="text-sm font-medium text-slate-900 hover:text-primary">{{ p.title }}</RouterLink>
      <p class="text-[12px] text-slate-500 mt-1">{{ p.description }}</p>
      <div class="flex items-center justify-between mt-3">
        <RouterLink :to="`/recruitment/postings/${p.id}`" class="text-primary text-[13px]">View pipeline</RouterLink>
        <button v-if="p.status === 'open'" class="text-slate-400 text-[12px]" @click="close(p)">Close</button>
      </div>
    </div>
    <p v-if="!postings.length" class="text-sm text-slate-400 col-span-2 text-center py-10">No job postings yet</p>
  </div>

  <Modal v-model="showAdd" title="New job posting" size="sm">
    <div class="space-y-3">
      <Field label="Title"><input v-model="form.title" placeholder="Mathematics Teacher" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      <Field label="Department/role type">
        <select v-model="form.department" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm">
          <option value="class_teacher">Class teacher</option>
          <option value="subject_teacher">Subject teacher</option>
          <option value="bursar">Bursar</option>
          <option value="admin">Admin</option>
        </select>
      </Field>
      <Field label="Description"><textarea v-model="form.description" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"></textarea></Field>
    </div>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAdd = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="create">Create posting</button>
    </template>
  </Modal>
</template>
