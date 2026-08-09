<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const route = useRoute();
const toast = useToast();
const posting = ref(null);
const applicants = ref(null);

const STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' }
];

const showInterviewModal = ref(null);
const interviewForm = ref({ scheduled_at: '', location_or_link: '' });

async function load() {
  const [postingRes, applicantsRes] = await Promise.all([
    api.get('/recruitment/postings'),
    api.get(`/recruitment/postings/${route.params.id}/applicants`)
  ]);
  posting.value = postingRes.data.data.find((p) => p.id === Number(route.params.id));
  applicants.value = applicantsRes.data.data;
}
onMounted(load);

function inStage(stage) {
  return applicants.value.filter((a) => a.current_stage === stage);
}

async function move(applicant, stage) {
  await api.post(`/recruitment/applicants/${applicant.id}/move`, { stage });
  toast.success(`${applicant.name} moved to ${stage}`);
  await load();
}

async function hire(applicant) {
  const staff = await api.post(`/recruitment/applicants/${applicant.id}/hire-to-staff`);
  toast.success(`${applicant.name} hired — staff number ${staff.data.data.staff_no}`);
  await load();
}

async function scheduleInterview() {
  await api.post(`/recruitment/applicants/${showInterviewModal.value.id}/interview`, interviewForm.value);
  toast.success('Interview scheduled');
  showInterviewModal.value = null;
  interviewForm.value = { scheduled_at: '', location_or_link: '' };
}
</script>

<template>
  <PageHeader :title="posting?.title || 'Pipeline'" subtitle="Move applicants through stages as they progress." />
  <Spinner v-if="!applicants" />

  <div v-else class="overflow-x-auto -mx-4 sm:mx-0">
    <div class="flex gap-4 px-4 sm:px-0 min-w-max sm:min-w-0 sm:grid sm:grid-cols-6">
      <div v-for="stage in STAGES" :key="stage.key" class="w-64 sm:w-auto flex-shrink-0">
        <p class="text-[12px] font-medium text-slate-500 mb-2">{{ stage.label }} <span class="text-slate-400">({{ inStage(stage.key).length }})</span></p>
        <div class="space-y-2">
          <div v-for="a in inStage(stage.key)" :key="a.id" class="bg-white border border-slate-200 rounded-lg p-3">
            <p class="text-sm font-medium text-slate-800">{{ a.name }}</p>
            <p class="text-[11px] text-slate-500">{{ a.email }}</p>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <button v-if="stage.key === 'applied'" class="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600" @click="move(a, 'screening')">Screen</button>
              <button v-if="stage.key === 'screening'" class="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600" @click="move(a, 'interview')">To interview</button>
              <button v-if="stage.key === 'interview'" class="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600" @click="showInterviewModal = a">Schedule</button>
              <button v-if="stage.key === 'interview'" class="text-[11px] px-2 py-1 rounded bg-primary-50 text-primary" @click="move(a, 'offer')">Offer</button>
              <button v-if="stage.key === 'offer'" class="text-[11px] px-2 py-1 rounded bg-success/10 text-success" @click="hire(a)">Hire &rarr; staff</button>
              <button v-if="!['hired', 'rejected'].includes(stage.key)" class="text-[11px] px-2 py-1 rounded bg-danger-light text-danger" @click="move(a, 'rejected')">Reject</button>
            </div>
          </div>
          <p v-if="!inStage(stage.key).length" class="text-[12px] text-slate-300 text-center py-4 border border-dashed border-slate-200 rounded-lg">Empty</p>
        </div>
      </div>
    </div>
  </div>

  <Modal v-model="showInterviewModal" title="Schedule interview" size="sm" @update:model-value="showInterviewModal = null">
    <div class="space-y-3">
      <Field label="Date & time"><input v-model="interviewForm.scheduled_at" type="datetime-local" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      <Field label="Location or link"><input v-model="interviewForm.location_or_link" placeholder="School office" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    </div>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showInterviewModal = null">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="scheduleInterview">Schedule</button>
    </template>
  </Modal>
</template>
