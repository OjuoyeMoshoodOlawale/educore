<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import { useToast } from '../../components/base/useToast';

const accounts = ref([]);
const showAdd = ref(false);
const toast = useToast();
const form = ref({ type: 'bank', bank_name: '', account_number: '', account_name: '' });

async function load() {
  const res = await api.get('/fees/payment-accounts');
  accounts.value = res.data.data;
}
onMounted(load);

async function save() {
  await api.post('/fees/payment-accounts', form.value);
  showAdd.value = false;
  form.value = { type: 'bank', bank_name: '', account_number: '', account_name: '' };
  toast.success('Payment account added');
  await load();
}
</script>

<template>
  <PageHeader title="Payment accounts" subtitle="So the school can see where money actually landed.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showAdd = true">Add account</button>
    </template>
  </PageHeader>

  <div class="grid sm:grid-cols-2 gap-4">
    <div v-for="a in accounts" :key="a.id" class="bg-white border border-slate-200 rounded-xl p-4">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 text-primary font-medium capitalize">{{ a.type }}</span>
        <span v-if="!a.is_active" class="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Inactive</span>
      </div>
      <p class="text-sm font-medium text-slate-800">{{ a.type === 'bank' ? a.bank_name : 'Cash' }}</p>
      <p v-if="a.account_number" class="text-[13px] text-slate-500 font-mono">{{ a.account_number }}</p>
      <p v-if="a.account_name" class="text-[12px] text-slate-400">{{ a.account_name }}</p>
    </div>
    <p v-if="!accounts.length" class="text-sm text-slate-400 col-span-2 text-center py-10">No payment accounts yet</p>
  </div>

  <Modal v-model="showAdd" title="Add payment account" size="sm">
    <div class="space-y-3">
      <Field label="Type">
        <select v-model="form.type" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"><option value="bank">Bank</option><option value="cash">Cash</option></select>
      </Field>
      <template v-if="form.type === 'bank'">
        <Field label="Bank name"><input v-model="form.bank_name" placeholder="Zenith Bank" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="Account number"><input v-model="form.account_number" placeholder="2219098987" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </template>
      <Field label="Account name"><input v-model="form.account_name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    </div>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAdd = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="save">Add account</button>
    </template>
  </Modal>
</template>
