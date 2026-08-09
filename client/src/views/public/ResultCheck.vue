<script setup>
import { ref } from 'vue';
import axios from 'axios';

const admissionNo = ref('');
const data = ref(null);
const error = ref('');
const loading = ref(false);

function pct(n) {
  return n === null || n === undefined ? '\u2014' : Number(n).toFixed(1) + '%';
}
function money(n) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG');
}

async function check() {
  error.value = '';
  data.value = null;
  loading.value = true;
  try {
    const res = await axios.post('/api/public/portal', { admissionNo: admissionNo.value });
    data.value = res.data.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Something went wrong';
  } finally {
    loading.value = false;
  }
}

const statusMessages = {
  blocked: { title: 'Results unavailable right now', body: 'Please contact the school office for details.' },
  not_published: { title: "Not published yet", body: "This term's results haven't been published yet — check back soon." },
  no_current_enrollment: { title: 'No current enrollment found', body: 'This student has no record for the active term.' }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="w-full max-w-[440px]">
      <div class="bg-white rounded-xl border border-slate-200 p-8">
        <RouterLink to="/sign-in" class="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 mb-6">&larr; Back to sign in</RouterLink>

        <div class="w-11 h-11 rounded-lg bg-accent-50 flex items-center justify-center mb-4">
          <span class="text-accent text-[18px]">&#128269;</span>
        </div>
        <h1 class="text-lg font-medium text-slate-900 mb-1">Fees & result portal</h1>
        <p class="text-[13px] text-slate-500 mb-6">Enter the admission number. No PIN or scratch card needed.</p>

        <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Admission number</label>
        <input
          v-model="admissionNo"
          type="text"
          placeholder="ISS/2026/0143"
          class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm mb-4"
          @keyup.enter="check"
        />
        <button :disabled="loading" class="w-full h-[42px] bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-60" @click="check">
          {{ loading ? 'Checking\u2026' : 'View fees & results' }}
        </button>

        <div v-if="error" class="mt-5 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
          <p class="text-[13px] text-slate-600">{{ error }}</p>
        </div>
      </div>

      <template v-if="data">
        <div class="bg-white rounded-xl border border-slate-200 p-6 mt-4">
          <p class="text-sm font-medium text-slate-900">{{ data.student.first_name }} {{ data.student.last_name }}</p>
          <p class="text-[12px] text-slate-500">{{ data.student.admission_no }}</p>
        </div>

        <!-- Fees — always shown when found, even if results are blocked/unpublished -->
        <div v-if="data.fees" class="bg-white rounded-xl border border-slate-200 p-6 mt-4">
          <p class="text-[12px] font-medium text-slate-500 mb-3">Fees this term</p>
          <div class="grid grid-cols-3 gap-2 text-[13px]">
            <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Carried forward</p><p class="text-slate-800 font-medium">{{ money(data.fees.openingBalance) }}</p></div>
            <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">This term</p><p class="text-slate-800 font-medium">{{ money(data.fees.currentCharges) }}</p></div>
            <div class="rounded-lg p-2.5" :class="data.fees.totalBalance > 0 ? 'bg-danger-light' : 'bg-success/10'">
              <p class="text-[10px]" :class="data.fees.totalBalance > 0 ? 'text-danger/80' : 'text-success'">Balance</p>
              <p class="font-medium" :class="data.fees.totalBalance > 0 ? 'text-danger' : 'text-success'">{{ money(data.fees.totalBalance) }}</p>
            </div>
          </div>
        </div>

        <!-- Results — available, or an explicit reason why not -->
        <div class="bg-white rounded-xl border border-slate-200 p-6 mt-4">
          <p class="text-[12px] font-medium text-slate-500 mb-3">Results this term</p>

          <div v-if="data.resultsStatus !== 'available'" class="flex items-start gap-3 bg-amber-50 border border-accent/30 rounded-lg p-3.5">
            <span class="text-accent text-[16px]" aria-hidden="true">&#9888;</span>
            <div>
              <p class="text-[13px] font-medium text-slate-800">{{ statusMessages[data.resultsStatus]?.title }}</p>
              <p class="text-[12px] text-slate-500 mt-0.5">{{ statusMessages[data.resultsStatus]?.body }}</p>
            </div>
          </div>

          <template v-else>
            <div class="grid grid-cols-3 gap-2 mb-4 text-[13px]">
              <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Average</p><p class="text-slate-800 font-medium">{{ pct(data.results.termAverage) }}</p></div>
              <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Position</p><p class="text-slate-800 font-medium">{{ data.results.overallPosition || '\u2014' }}</p></div>
              <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Cumulative</p><p class="text-slate-800 font-medium">{{ pct(data.results.cumulativeAverage) }}</p></div>
            </div>

            <table class="w-full text-[13px]">
              <thead class="text-slate-500 text-[11px] border-b border-slate-200"><tr><th class="text-left font-medium py-1.5">Subject</th><th class="text-left font-medium py-1.5">Total</th><th class="text-left font-medium py-1.5">Grade</th></tr></thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="s in data.results.scores" :key="s.id">
                  <td class="py-1.5 text-slate-700">{{ s.subject_name }}</td>
                  <td class="py-1.5 text-slate-700">{{ s.total }}</td>
                  <td class="py-1.5"><span class="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">{{ s.computed_grade }}</span></td>
                </tr>
              </tbody>
            </table>

            <p v-if="data.results.remark?.teacher_comment" class="text-[12px] text-slate-500 mt-4"><span class="font-medium text-slate-700">Teacher's comment:</span> {{ data.results.remark.teacher_comment }}</p>
            <p v-if="data.results.remark?.principal_comment" class="text-[12px] text-slate-500 mt-1"><span class="font-medium text-slate-700">Principal's comment:</span> {{ data.results.remark.principal_comment }}</p>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>
