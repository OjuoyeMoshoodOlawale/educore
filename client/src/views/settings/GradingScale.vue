<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import StarRating from '../../components/base/StarRating.vue';

const data = ref(null);
const gradeVariant = { A: 'success', B: 'primary', C: 'warning', F: 'danger' };

onMounted(async () => {
  const res = await api.get('/schools/grading-scale');
  data.value = res.data.data;
});
</script>

<template>
  <PageHeader title="Grading scale" subtitle="Grade boundaries and the psychomotor/affective rating legend — one place, not four separate screens." />
  <Spinner v-if="!data" />
  <template v-else>
    <div class="bg-white border border-slate-200 rounded-xl p-5 mb-5">
      <h3 class="text-sm font-medium text-slate-900 mb-3">Grade boundaries</h3>
      <table class="w-full text-sm">
        <thead class="text-slate-500 text-[12px]">
          <tr><th class="text-left font-medium py-2">Grade</th><th class="text-left font-medium py-2">Score range</th><th class="text-left font-medium py-2">Description</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="g in data.gradeBoundaries" :key="g.id">
            <td class="py-2.5"><StatusBadge :variant="gradeVariant[g.grade_key] || 'neutral'" :label="g.grade_key" /></td>
            <td class="py-2.5 text-slate-600">{{ g.min_score }} &ndash; {{ g.max_score }}</td>
            <td class="py-2.5 text-slate-500">{{ g.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-5">
      <h3 class="text-sm font-medium text-slate-900 mb-3">Psychomotor &amp; affective rating legend</h3>
      <div class="space-y-2">
        <div v-for="r in data.ratingKeys" :key="r.id" class="flex items-center gap-3">
          <StarRating :model-value="r.key_value" :max="5" />
          <span class="text-[13px] text-slate-600">{{ r.description }}</span>
        </div>
      </div>
    </div>
  </template>
</template>
