<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const items = ref([]);
const showAdd = ref(false);
const name = ref('');

async function load() {
  const res = await api.get('/fees/items');
  items.value = res.data.data;
}
onMounted(load);

async function add() {
  await api.post('/fees/items', { name: name.value });
  name.value = '';
  showAdd.value = false;
  toast.success('Fee item added');
  await load();
}
</script>

<template>
  <PageHeader title="Fee items" subtitle="The building blocks of a fee structure — Tuition, Sports levy, PTA levy, and so on.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showAdd = true">+ Add fee item</button>
    </template>
  </PageHeader>

  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-lg">
    <ul class="divide-y divide-slate-100">
      <li v-if="!items.length" class="px-4 py-6 text-center text-sm text-slate-400">No fee items yet</li>
      <li v-for="i in items" :key="i.id" class="px-4 py-3 text-sm text-slate-800">{{ i.name }}</li>
    </ul>
  </div>
  <p class="text-[12px] text-slate-400 mt-3 max-w-lg">Set an amount per class/term for each item under <RouterLink to="/fees/structure" class="text-primary hover:underline">Fee structure</RouterLink>.</p>

  <Modal v-model="showAdd" title="Add fee item" size="sm">
    <Field label="Name"><input v-model="name" placeholder="e.g. Tuition" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAdd = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="add">Add item</button>
    </template>
  </Modal>
</template>
