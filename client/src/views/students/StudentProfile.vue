<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../api/client';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import CurrencyInput from '../../components/base/CurrencyInput.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const route = useRoute();
const toast = useToast();

const student = ref(null);
const ledger = ref(null);
const payments = ref([]);
const currentTermId = ref(null); // wired from the school's current term once schools API exposes it directly

const showPayment = ref(false);
const showAdjustment = ref(false);
const paymentForm = ref({ amount: null, method: 'bank', reference: '' });
const adjustmentForm = ref({ description: '', amount: null });

async function loadAll() {
  const studentRes = await api.get(`/students/${route.params.id}`);
  student.value = studentRes.data.data;

  // Find the current term via the active session.
  const sessions = await api.get('/schools/sessions');
  const active = sessions.data.data.find((s) => s.is_active);
  const terms = await api.get(`/schools/sessions/${active.id}/terms`);
  currentTermId.value = terms.data.data.find((t) => t.is_current)?.id;

  await Promise.all([loadLedger(), loadPayments()]);
}

async function loadLedger() {
  const res = await api.get(`/fees/ledger/${route.params.id}/${currentTermId.value}`);
  ledger.value = res.data.data;
}
async function loadPayments() {
  const res = await api.get(`/fees/payments/${route.params.id}`);
  payments.value = res.data.data;
}

onMounted(loadAll);

async function recordPayment() {
  await api.post('/fees/payments', {
    student_id: Number(route.params.id),
    term_id: currentTermId.value,
    amount: paymentForm.value.amount,
    method: paymentForm.value.method,
    reference: paymentForm.value.reference
  });
  showPayment.value = false;
  paymentForm.value = { amount: null, method: 'bank', reference: '' };
  toast.success('Payment recorded');
  await Promise.all([loadLedger(), loadPayments()]);
}

async function addAdjustment() {
  await api.post('/fees/adjustments', {
    student_id: Number(route.params.id),
    term_id: currentTermId.value,
    description: adjustmentForm.value.description,
    amount: adjustmentForm.value.amount
  });
  showAdjustment.value = false;
  adjustmentForm.value = { description: '', amount: null };
  toast.success('Adjustment added');
  await loadLedger();
}

function formatMoney(n) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG');
}
</script>

<template>
  <Spinner v-if="!student || !ledger" />
  <div v-else>
    <RouterLink to="/students" class="text-[13px] text-slate-500 hover:text-slate-700">&larr; Back to students</RouterLink>
    <h2 class="text-xl font-medium text-slate-900 mt-2">{{ student.first_name }} {{ student.last_name }}</h2>
    <p class="text-[13px] text-slate-500 mb-6">{{ student.admission_no }}</p>

    <div class="grid sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <p class="text-[12px] text-slate-500 mb-1">Carried forward</p>
        <p class="text-xl font-medium text-slate-900">{{ formatMoney(ledger.openingBalance) }}</p>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl p-4">
        <p class="text-[12px] text-slate-500 mb-1">This term's charges</p>
        <p class="text-xl font-medium text-slate-900">{{ formatMoney(ledger.currentCharges) }}</p>
      </div>
      <div class="bg-white border-2 rounded-xl p-4" :class="ledger.totalBalance > 0 ? 'border-danger/30 bg-danger-light' : 'border-success/30 bg-success/5'">
        <p class="text-[12px] mb-1" :class="ledger.totalBalance > 0 ? 'text-danger/80' : 'text-success'">Total balance</p>
        <p class="text-xl font-medium" :class="ledger.totalBalance > 0 ? 'text-danger' : 'text-success'">{{ formatMoney(ledger.totalBalance) }}</p>
      </div>
    </div>

    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-slate-900">Fee breakdown</h3>
      <button class="text-[13px] text-primary" @click="showAdjustment = true">+ Add adjustment</button>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
      <table class="w-full text-sm">
        <tbody class="divide-y divide-slate-100">
          <tr v-for="s in ledger.breakdown.structures" :key="'s' + s.id">
            <td class="px-4 py-2.5 text-slate-700">{{ s.fee_item_name }}</td>
            <td class="px-4 py-2.5 text-slate-700 text-right">{{ formatMoney(s.amount) }}</td>
          </tr>
          <tr v-for="a in ledger.breakdown.adjustments" :key="'a' + a.id">
            <td class="px-4 py-2.5 text-slate-700">{{ a.description }}</td>
            <td class="px-4 py-2.5 text-right" :class="a.amount < 0 ? 'text-success' : 'text-slate-700'">{{ formatMoney(a.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-slate-900">Payment history</h3>
      <button class="px-3 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showPayment = true">Record payment</button>
    </div>
    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[12px]"><tr><th class="text-left font-medium px-4 py-2">Date</th><th class="text-left font-medium px-4 py-2">Method</th><th class="text-left font-medium px-4 py-2">Receipt</th><th class="text-left font-medium px-4 py-2">Amount</th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!payments.length"><td colspan="4" class="px-4 py-6 text-center text-slate-400">No payments recorded yet</td></tr>
          <tr v-for="p in payments" :key="p.id">
            <td class="px-4 py-2.5 text-slate-600">{{ new Date(p.created_at).toLocaleDateString() }}</td>
            <td class="px-4 py-2.5 text-slate-600">{{ p.method }}</td>
            <td class="px-4 py-2.5 font-mono text-[13px] text-slate-500">{{ p.receipt_no }}</td>
            <td class="px-4 py-2.5 text-slate-700">{{ formatMoney(p.amount) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal v-model="showPayment" title="Record payment">
      <div class="space-y-3">
        <Field label="Amount"><CurrencyInput v-model="paymentForm.amount" /></Field>
        <Field label="Method">
          <select v-model="paymentForm.method" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm">
            <option value="bank">Bank transfer</option><option value="cash">Cash</option><option value="card">Card</option>
          </select>
        </Field>
        <Field label="Reference"><input v-model="paymentForm.reference" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>
      <template #footer>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showPayment = false">Cancel</button>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="recordPayment">Record payment</button>
      </template>
    </Modal>

    <Modal v-model="showAdjustment" title="Add adjustment">
      <div class="space-y-3">
        <Field label="Description"><input v-model="adjustmentForm.description" placeholder="e.g. Sibling discount" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="Amount" hint="Use a negative amount for a discount"><CurrencyInput v-model="adjustmentForm.amount" /></Field>
      </div>
      <template #footer>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showAdjustment = false">Cancel</button>
        <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="addAdjustment">Add adjustment</button>
      </template>
    </Modal>
  </div>
</template>
