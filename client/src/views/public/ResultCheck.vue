<script setup>
import { ref } from 'vue';
import axios from 'axios';

const admissionNo = ref('');
const result = ref(null);
const error = ref('');
const blocked = ref(false);
const loading = ref(false);

function formatMoney(n) {
  return n === null || n === undefined ? '\u2014' : Number(n).toFixed(1) + '%';
}

async function check() {
  error.value = '';
  blocked.value = false;
  result.value = null;
  loading.value = true;
  try {
    const res = await axios.post('/api/public/result-check', { admissionNo: admissionNo.value });
    result.value = res.data.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'Something went wrong';
    blocked.value = !!e.response?.data?.blocked;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="w-full max-w-[420px]">
      <div class="bg-white rounded-xl border border-slate-200 p-8">
        <RouterLink to="/sign-in" class="flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 mb-6">&larr; Back to sign in</RouterLink>

        <div class="w-11 h-11 rounded-lg bg-accent-50 flex items-center justify-center mb-4">
          <span class="text-accent text-[18px]">&#128269;</span>
        </div>
        <h1 class="text-lg font-medium text-slate-900 mb-1">Check your child's result</h1>
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
          {{ loading ? 'Checking\u2026' : 'View result' }}
        </button>

        <div v-if="blocked" class="mt-5 flex items-start gap-3 bg-amber-50 border border-accent/30 rounded-lg p-3.5">
          <span class="text-accent text-[16px]" aria-hidden="true">&#9888;</span>
          <div>
            <p class="text-[13px] font-medium text-slate-800">This result isn't available right now</p>
            <p class="text-[12px] text-slate-500 mt-0.5">Please contact the school office for details.</p>
          </div>
        </div>
        <div v-else-if="error" class="mt-5 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
          <p class="text-[13px] text-slate-600">{{ error }}</p>
        </div>
      </div>

      <div v-if="result" class="bg-white rounded-xl border border-slate-200 p-6 mt-4">
        <p class="text-sm font-medium text-slate-900">{{ result.student.first_name }} {{ result.student.last_name }}</p>
        <p class="text-[12px] text-slate-500 mb-4">{{ result.student.admission_no }}</p>

        <div class="grid grid-cols-3 gap-2 mb-4 text-[13px]">
          <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Average</p><p class="text-slate-800 font-medium">{{ formatMoney(result.termAverage) }}</p></div>
          <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Position</p><p class="text-slate-800 font-medium">{{ result.overallPosition || '\u2014' }}</p></div>
          <div class="bg-slate-50 rounded-lg p-2.5"><p class="text-slate-500 text-[10px]">Cumulative</p><p class="text-slate-800 font-medium">{{ formatMoney(result.cumulativeAverage) }}</p></div>
        </div>

        <table class="w-full text-[13px]">
          <thead class="text-slate-500 text-[11px] border-b border-slate-200"><tr><th class="text-left font-medium py-1.5">Subject</th><th class="text-left font-medium py-1.5">Total</th><th class="text-left font-medium py-1.5">Grade</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="s in result.scores" :key="s.id">
              <td class="py-1.5 text-slate-700">{{ s.subject_name }}</td>
              <td class="py-1.5 text-slate-700">{{ s.total }}</td>
              <td class="py-1.5"><span class="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">{{ s.computed_grade }}</span></td>
            </tr>
          </tbody>
        </table>

        <p v-if="result.remark?.teacher_comment" class="text-[12px] text-slate-500 mt-4"><span class="font-medium text-slate-700">Teacher's comment:</span> {{ result.remark.teacher_comment }}</p>
        <p v-if="result.remark?.principal_comment" class="text-[12px] text-slate-500 mt-1"><span class="font-medium text-slate-700">Principal's comment:</span> {{ result.remark.principal_comment }}</p>
      </div>
    </div>
  </div>
</template>
