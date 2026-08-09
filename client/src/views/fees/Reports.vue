<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const defaulters = ref(null);
const toast = useToast();

function formatMoney(n) {
  return '\u20a6' + Number(n || 0).toLocaleString('en-NG');
}

async function sendReminder(d) {
  const result = await api.post('/notifications/send', {
    channel: 'sms',
    recipient: d.admission_no, // stand-in until guardian phone is joined in here too
    message: `Reminder: ${d.first_name} ${d.last_name} has an outstanding balance of ${formatMoney(d.balance)} this term.`,
    related_student_id: d.id
  });
  if (result.data.data.status === 'sent') toast.success('Reminder sent');
  else toast.warning(`Reminder logged as failed (${result.data.data.provider_response}) — see Notification log`);
}

async function sendAllReminders() {
  const recipients = defaulters.value.map((d) => ({
    recipient: d.admission_no,
    relatedStudentId: d.id
  }));
  const res = await api.post('/notifications/bulk', {
    channel: 'sms',
    recipients,
    message: 'Reminder: you have an outstanding fee balance this term. Please contact the school office.'
  });
  toast.info(`${res.data.data.sent} sent, ${res.data.data.failed} failed — see Notification log`);
}

onMounted(async () => {
  const sessions = await api.get('/schools/sessions');
  const active = sessions.data.data.find((s) => s.is_active);
  const terms = await api.get(`/schools/sessions/${active.id}/terms`);
  const currentTermId = terms.data.data.find((t) => t.is_current)?.id;

  const res = await api.get(`/fees/reports/defaulters/${currentTermId}`);
  defaulters.value = res.data.data;
});
</script>

<template>
  <PageHeader title="Defaulters" subtitle="Students with an outstanding balance this term.">
    <template #actions>
      <button v-if="defaulters?.length" class="h-9 px-3 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-600" @click="sendAllReminders">Send reminder to all</button>
    </template>
  </PageHeader>
  <Spinner v-if="!defaulters" />
  <template v-else>
    <!-- Desktop table -->
    <div class="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-[12px]"><tr><th class="text-left font-medium px-4 py-2.5">Student</th><th class="text-left font-medium px-4 py-2.5">Admission no.</th><th class="text-left font-medium px-4 py-2.5">Balance</th><th></th></tr></thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="!defaulters.length"><td colspan="4" class="px-4 py-8 text-center text-slate-400">No defaulters — everyone's paid up.</td></tr>
          <tr v-for="d in defaulters" :key="d.id">
            <td class="px-4 py-3 text-slate-800">{{ d.first_name }} {{ d.last_name }}</td>
            <td class="px-4 py-3 font-mono text-[13px] text-slate-500">{{ d.admission_no }}</td>
            <td class="px-4 py-3 text-danger font-medium">{{ formatMoney(d.balance) }}</td>
            <td class="px-4 py-3 text-right"><button class="text-primary text-[13px]" @click="sendReminder(d)">Send reminder</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile card list -->
    <div class="sm:hidden space-y-2">
      <p v-if="!defaulters.length" class="text-sm text-slate-400 text-center py-8">No defaulters — everyone's paid up.</p>
      <div v-for="d in defaulters" :key="d.id" class="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-slate-800">{{ d.first_name }} {{ d.last_name }}</p>
          <p class="text-[12px] text-slate-500 font-mono">{{ d.admission_no }}</p>
        </div>
        <span class="text-danger font-medium text-sm">{{ formatMoney(d.balance) }}</span>
      </div>
    </div>
  </template>
</template>
