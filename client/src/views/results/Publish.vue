<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const terms = ref([]);
const selectedTermId = ref(null);
const classes = ref(null);
const confirmClass = ref(null);

async function loadBase() {
  const sessions = await api.get('/schools/sessions');
  const active = sessions.data.data.find((s) => s.is_active) || sessions.data.data[0];
  if (active) {
    const termsRes = await api.get(`/schools/sessions/${active.id}/terms`);
    terms.value = termsRes.data.data;
    selectedTermId.value = terms.value.find((t) => t.is_current)?.id || terms.value[0]?.id;
  }
  await load();
}
onMounted(loadBase);

async function load() {
  if (!selectedTermId.value) return;
  const res = await api.get(`/results/publish/${selectedTermId.value}`);
  classes.value = res.data.data;
}

async function publish() {
  await api.post(`/results/publish/${confirmClass.value.id}/${selectedTermId.value}`);
  toast.success(`${confirmClass.value.name} published`);
  confirmClass.value = null;
  await load();
}

async function unpublish(cls) {
  await api.post(`/results/unpublish/${cls.id}/${selectedTermId.value}`);
  toast.info(`${cls.name} unpublished`);
  await load();
}
</script>

<template>
  <PageHeader title="Publish results" subtitle="Per class — publishing one class never affects another." />

  <Spinner v-if="!classes" />
  <div v-else class="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-2xl">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-[12px]"><tr><th class="text-left font-medium px-4 py-2.5">Class</th><th class="text-left font-medium px-4 py-2.5">Status</th><th></th></tr></thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="c in classes" :key="c.id">
          <td class="px-4 py-3 text-slate-800">{{ c.name }}</td>
          <td class="px-4 py-3">
            <StatusBadge :variant="c.publication?.is_published ? 'success' : 'neutral'" :label="c.publication?.is_published ? 'Published' : 'Not published'" />
          </td>
          <td class="px-4 py-3 text-right">
            <button v-if="c.publication?.is_published" class="text-slate-500 text-[13px]" @click="unpublish(c)">Unpublish</button>
            <button v-else class="text-primary text-[13px] font-medium" @click="confirmClass = c">Publish</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <Modal v-model="confirmClass" :title="`Publish ${confirmClass?.name}'s results?`" size="sm" @update:model-value="confirmClass = null">
    <p class="text-[13px] text-slate-600">Parents and students in this class will be able to see their report cards immediately. Other classes are not affected.</p>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="confirmClass = null">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="publish">Publish</button>
    </template>
  </Modal>
</template>
