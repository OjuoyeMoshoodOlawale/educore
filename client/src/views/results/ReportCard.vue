<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../api/client';
import Spinner from '../../components/base/Spinner.vue';

const route = useRoute();
const data = ref(null);
const school = ref(null);

function ratingLabel(traitRating, ratingKeys) {
  const key = ratingKeys.find((k) => k.id === traitRating);
  return key ? `${key.description} (${key.key_value})` : '\u2014';
}

onMounted(async () => {
  const [schoolRes, cardRes] = await Promise.all([
    api.get('/schools/profile'),
    api.get(`/results/report-card/${route.params.studentId}/${route.params.termId}`)
  ]);
  school.value = schoolRes.data.data;
  data.value = cardRes.data.data;
});
</script>

<template>
  <Spinner v-if="!data" />
  <div v-else>
    <div class="flex justify-end mb-4 print:hidden">
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-600" @click="window.print()">Print / Save as PDF</button>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-6 md:p-8 max-w-3xl mx-auto">
      <div class="flex items-center gap-3 pb-5 mb-5 border-b border-slate-200">
        <div class="w-12 h-12 rounded-lg bg-primary flex items-center justify-center flex-shrink-0"><span class="text-accent text-lg font-semibold">{{ school.name?.[0] }}</span></div>
        <div>
          <p class="text-[15px] font-medium text-slate-900">{{ school.name }}</p>
          <p class="text-[12px] text-slate-500">{{ school.motto }}</p>
        </div>
        <div class="ml-auto text-right">
          <p class="text-[13px] text-slate-700">{{ data.student.first_name }} {{ data.student.last_name }}</p>
          <p class="text-[12px] text-slate-500">{{ data.student.admission_no }}</p>
        </div>
      </div>

      <div class="grid sm:grid-cols-3 gap-3 mb-5 text-[13px]">
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-slate-500 text-[11px]">Term average</p><p class="text-slate-800 font-medium">{{ data.termAverage !== null ? data.termAverage.toFixed(1) + '%' : '\u2014' }}</p></div>
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-slate-500 text-[11px]">Position this term</p><p class="text-slate-800 font-medium">{{ data.overallPosition || '\u2014' }}</p></div>
        <div class="bg-slate-50 rounded-lg p-3"><p class="text-slate-500 text-[11px]">Cumulative average</p><p class="text-slate-800 font-medium">{{ data.cumulativeAverage !== null ? data.cumulativeAverage.toFixed(1) + '%' : '\u2014' }}</p></div>
      </div>

      <div class="overflow-x-auto -mx-2 sm:mx-0">
        <table class="w-full text-sm mb-5 min-w-[480px]">
          <thead class="text-slate-500 text-[12px] border-b border-slate-200"><tr><th class="text-left font-medium py-2 px-2">Subject</th><th class="text-left font-medium py-2">CA1</th><th class="text-left font-medium py-2">CA2</th><th class="text-left font-medium py-2">Exam</th><th class="text-left font-medium py-2">Total</th><th class="text-left font-medium py-2">Grade</th><th class="text-left font-medium py-2">Position</th></tr></thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="!data.scores.length"><td colspan="7" class="py-6 text-center text-slate-400">No scores entered for this term yet</td></tr>
            <tr v-for="s in data.scores" :key="s.id">
              <td class="py-2 px-2 text-slate-700">{{ s.subject_name }}</td>
              <td class="py-2 text-slate-600">{{ s.ca1 }}</td>
              <td class="py-2 text-slate-600">{{ s.ca2 }}</td>
              <td class="py-2 text-slate-600">{{ s.exam }}</td>
              <td class="py-2 text-slate-700 font-medium">{{ s.total }}</td>
              <td class="py-2"><span class="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success font-medium">{{ s.computed_grade || '\u2014' }}</span></td>
              <td class="py-2 text-slate-500">{{ s.position || '\u2014' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="grid sm:grid-cols-2 gap-4 mb-5">
        <div class="bg-slate-50 rounded-lg p-3">
          <p class="text-[12px] font-medium text-slate-700 mb-1.5">Psychomotor & affective</p>
          <p class="text-[12px] text-slate-500 leading-relaxed">
            <span v-for="(t, i) in data.traits" :key="t.id">{{ t.description }}: {{ ratingLabel(t.rating, data.ratingKeys) }}<span v-if="i < data.traits.length - 1">, </span></span>
          </p>
        </div>
        <div class="bg-slate-50 rounded-lg p-3">
          <p class="text-[12px] font-medium text-slate-700 mb-1.5">Attendance</p>
          <p class="text-[12px] text-slate-500">
            {{ data.remark?.days_present ?? 0 }} present of {{ data.remark?.times_school_opened ?? 0 }} days school opened
          </p>
        </div>
      </div>

      <div class="grid sm:grid-cols-2 gap-6">
        <div>
          <p class="text-[12px] text-slate-500 mb-1">Teacher's comment</p>
          <p class="text-[13px] text-slate-700">{{ data.remark?.teacher_comment || 'Not yet written' }}</p>
        </div>
        <div>
          <p class="text-[12px] text-slate-500 mb-1">Principal's comment</p>
          <p class="text-[13px] text-slate-700">{{ data.remark?.principal_comment || 'Not yet written' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
