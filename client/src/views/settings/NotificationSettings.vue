<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const settings = ref(null);
const emailForm = ref({ smtp_host: '', smtp_port: 587, smtp_username: '', smtp_password: '', smtp_from_address: '', smtp_from_name: '', is_active: false });
const smsForm = ref({ sms_provider: 'termii', sms_api_key: '', sms_sender_id: '', is_active: false });

async function load() {
  const res = await api.get('/notifications/settings');
  settings.value = res.data.data;
  const email = settings.value.find((s) => s.channel === 'email');
  const sms = settings.value.find((s) => s.channel === 'sms');
  if (email) emailForm.value = { ...emailForm.value, ...email, smtp_password: '' };
  if (sms) smsForm.value = { ...smsForm.value, ...sms, sms_api_key: '' };
}
onMounted(load);

async function saveEmail() {
  await api.put('/notifications/settings/email', emailForm.value);
  toast.success('Email settings saved');
  await load();
}
async function saveSms() {
  await api.put('/notifications/settings/sms', smsForm.value);
  toast.success('SMS settings saved');
  await load();
}
</script>

<template>
  <PageHeader title="Notifications" subtitle="Configure real SMTP/SMS delivery — until then, the notification log honestly shows 'not configured' rather than faking a send." />
  <Spinner v-if="!settings" />
  <div v-else class="grid lg:grid-cols-2 gap-5">
    <div class="bg-white border border-slate-200 rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-slate-900">Email (SMTP)</h3>
        <label class="flex items-center gap-2 text-[12px] text-slate-600">
          <input v-model="emailForm.is_active" type="checkbox" class="rounded border-slate-300 text-primary" /> Active
        </label>
      </div>
      <div class="space-y-3">
        <Field label="SMTP host"><input v-model="emailForm.smtp_host" placeholder="smtp.gmail.com" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <div class="grid grid-cols-2 gap-3">
          <Field label="Port"><input v-model.number="emailForm.smtp_port" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
          <Field label="Username"><input v-model="emailForm.smtp_username" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        </div>
        <Field label="Password" :hint="settings.find(s => s.channel === 'email')?.hasSmtpPassword ? 'A password is already saved — leave blank to keep it' : ''">
          <input v-model="emailForm.smtp_password" type="password" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
        </Field>
        <div class="grid grid-cols-2 gap-3">
          <Field label="From address"><input v-model="emailForm.smtp_from_address" placeholder="noreply@school.edu" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
          <Field label="From name"><input v-model="emailForm.smtp_from_name" placeholder="Al-Minhaaj Model College" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        </div>
      </div>
      <button class="mt-4 px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="saveEmail">Save email settings</button>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-medium text-slate-900">SMS</h3>
        <label class="flex items-center gap-2 text-[12px] text-slate-600">
          <input v-model="smsForm.is_active" type="checkbox" class="rounded border-slate-300 text-primary" /> Active
        </label>
      </div>
      <div class="space-y-3">
        <Field label="Provider">
          <select v-model="smsForm.sms_provider" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"><option value="termii">Termii</option></select>
        </Field>
        <Field label="API key" :hint="settings.find(s => s.channel === 'sms')?.hasSmsApiKey ? 'A key is already saved — leave blank to keep it' : ''">
          <input v-model="smsForm.sms_api_key" type="password" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
        </Field>
        <Field label="Sender ID"><input v-model="smsForm.sms_sender_id" placeholder="EduCore" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>
      <button class="mt-4 px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="saveSms">Save SMS settings</button>
    </div>
  </div>
</template>
