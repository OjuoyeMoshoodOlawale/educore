<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import CurrencyInput from '../../components/base/CurrencyInput.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const classes = ref([]);
const terms = ref([]);
const selectedClassId = ref(null);
const selectedTermId = ref(null);
const structure = ref(null);
const feeItems = ref([]);

const showAddItem = ref(false);
const newItemName = ref('');
const showCopy = ref(false);
const copyFromTermId = ref(null);

async function loadBase() {
  const [classesRes, sessionsRes, itemsRes] = await Promise.all([
    api.get('/schools/classes'),
    api.get('/schools/sessions'),
    api.get('/fees/items')
  ]);
  classes.value = classesRes.data.data;
  feeItems.value = itemsRes.data.data;

  const active = sessionsRes.data.data.find((s) => s.is_active) || sessionsRes.data.data[0];
  if (active) {
    const termsRes = await api.get(`/schools/sessions/${active.id}/terms`);
    terms.value = termsRes.data.data;
    selectedTermId.value = terms.value.find((t) => t.is_current)?.id || terms.value[0]?.id;
  }
  selectedClassId.value = classes.value[0]?.id;
}
onMounted(loadBase);

async function loadStructure() {
  if (!selectedClassId.value || !selectedTermId.value) return;
  const res = await api.get(`/fees/structure/${selectedClassId.value}/${selectedTermId.value}`);
  structure.value = res.data.data;
}

async function addFeeItem() {
  await api.post('/fees/items', { name: newItemName.value });
  newItemName.value = '';
  showAddItem.value = false;
  const res = await api.get('/fees/items');
  feeItems.value = res.data.data;
  toast.success('Fee item added');
}

async function addRow(feeItemId) {
  await api.post('/fees/structure', {
    fee_item_id: feeItemId,
    class_id: selectedClassId.value,
    term_id: selectedTermId.value,
    amount: 0
  });
  await loadStructure();
}

async function updateAmount(row, amount) {
  await api.put(`/fees/structure/${row.id}`, { amount });
  toast.info(`${row.fee_item_name} updated`);
}

async function copyStructure() {
  const res = await api.post('/fees/structure/copy', {
    classId: selectedClassId.value,
    fromTermId: copyFromTermId.value,
    toTermId: selectedTermId.value
  });
  showCopy.value = false;
  toast.success(`Copied ${res.data.data.copied} fee item(s)`);
  await loadStructure();
}

const itemsNotYetAdded = computed(() => {
  if (!structure.value) return feeItems.value;
  const usedIds = structure.value.map((s) => s.fee_item_id);
  return feeItems.value.filter((i) => !usedIds.includes(i.id));
});
</script>

<template>
  <PageHeader title="Fee structure" subtitle="Per class, per term, with gender/intake/boarding eligibility.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-600" @click="showAddItem = true">New fee item</button>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-600" @click="showCopy = true">Copy from term</button>
    </template>
  </PageHeader>

  <div class="flex flex-wrap gap-2 mb-4">
    <select v-model.number="selectedClassId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadStructure">
      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
    </select>
    <select v-model.number="selectedTermId" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="loadStructure">
      <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
    <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="loadStructure">Load</button>
  </div>

  <Spinner v-if="!structure" />
  <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden min-w-[520px] mx-4 sm:mx-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[12px]">
          <tr><th class="text-left font-medium px-4 py-2.5">Fee item</th><th class="text-left font-medium px-4 py-2.5">Amount</th><th class="text-left font-medium px-4 py-2.5">Gender</th><th class="text-left font-medium px-4 py-2.5">Intake</th><th class="text-left font-medium px-4 py-2.5">Boarding</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!structure.length"><td colspan="5" class="px-4 py-6 text-center text-slate-400">No fee items configured for this class/term yet</td></tr>
          <tr v-for="row in structure" :key="row.id">
            <td class="px-4 py-3 text-slate-800">{{ row.fee_item_name }}</td>
            <td class="px-4 py-3 w-40"><CurrencyInput :model-value="row.amount" @update:model-value="updateAmount(row, $event)" /></td>
            <td class="px-4 py-3 text-slate-500 text-[13px]">{{ row.applies_to_gender }}</td>
            <td class="px-4 py-3 text-slate-500 text-[13px]">{{ row.applies_to_intake }}</td>
            <td class="px-4 py-3 text-slate-500 text-[13px]">{{ row.applies_to_boarding_type }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div v-if="structure && itemsNotYetAdded.length" class="mt-3 flex flex-wrap gap-2">
    <button v-for="item in itemsNotYetAdded" :key="item.id" class="text-[12px] px-3 py-1.5 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary hover:text-primary" @click="addRow(item.id)">
      + Add "{{ item.name }}" to this class/term
    </button>
  </div>

  <Modal v-model="showAddItem" title="New fee item" size="sm">
    <Field label="Name"><input v-model="newItemName" placeholder="e.g. Tuition" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAddItem = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="addFeeItem">Add item</button>
    </template>
  </Modal>

  <Modal v-model="showCopy" title="Copy fee structure" size="sm">
    <Field label="Copy from which term?">
      <select v-model.number="copyFromTermId" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm">
        <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
    </Field>
    <p class="text-[12px] text-slate-400 mt-2">Copies into the currently selected class/term above.</p>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showCopy = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="copyStructure">Copy</button>
    </template>
  </Modal>
</template>
