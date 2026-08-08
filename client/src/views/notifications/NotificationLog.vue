<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import DataTable from '../../components/base/DataTable.vue';
import StatusBadge from '../../components/base/StatusBadge.vue';
import { useToast } from '../../components/base/useToast';

const logs = ref([]);
const statusFilter = ref('');
const toast = useToast();

const columns = [
  { key: 'created_at', label: 'Sent' },
  { key: 'channel', label: 'Channel' },
  { key: 'recipient', label: 'Recipient' },
  { key: 'message', label: 'Message' },
  { key: 'status', label: 'Status' }
];

async function load() {
  const res = await api.get('/notifications', { params: statusFilter.value ? { status: statusFilter.value } : {} });
  logs.value = res.data.data;
}
onMounted(load);

async function resend(row) {
  await api.post(`/notifications/${row.id}/resend`);
  toast.info('Resend attempted');
  await load();
}

async function resendAllFailed() {
  const failed = logs.value.filter((l) => l.status === 'failed');
  await Promise.all(failed.map((l) => api.post(`/notifications/${l.id}/resend`)));
  toast.info(`Resend attempted for ${failed.length} message(s)`);
  await load();
}
</script>

<template>
  <PageHeader title="Notification log" subtitle="Every SMS/email the system has tried to send, with resend on failed deliveries.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-600" @click="resendAllFailed">Resend all failed</button>
    </template>
  </PageHeader>

  <div class="flex flex-wrap gap-2 mb-4">
    <select v-model="statusFilter" class="h-9 px-3 rounded-lg border border-slate-300 text-[13px]" @change="load">
      <option value="">All statuses</option>
      <option value="failed">Failed</option>
      <option value="sent">Sent</option>
      <option value="pending">Pending</option>
    </select>
  </div>

  <DataTable :columns="columns" :rows="logs" empty-text="No notifications sent yet">
    <template #cell-created_at="{ row }"><span class="text-slate-500 text-[13px]">{{ new Date(row.created_at).toLocaleString() }}</span></template>
    <template #cell-channel="{ row }"><span class="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{{ row.channel }}</span></template>
    <template #cell-message="{ row }"><span class="text-slate-500 max-w-xs truncate block" :title="row.message">{{ row.message }}</span></template>
    <template #cell-status="{ row }">
      <StatusBadge :variant="row.status === 'sent' ? 'success' : row.status === 'failed' ? 'danger' : 'neutral'" :label="row.status" />
      <p v-if="row.status === 'failed'" class="text-[11px] text-slate-400 mt-0.5">{{ row.provider_response }}</p>
    </template>
    <template #actions="{ row }">
      <button v-if="row.status === 'failed'" class="text-primary text-[13px]" @click="resend(row)">Resend</button>
    </template>
  </DataTable>
</template>
