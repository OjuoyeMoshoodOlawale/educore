<script setup>
import { ref, onMounted, reactive } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const sessions = ref(null);
const termsBySession = reactive({}); // lazy-loaded on expand, keyed by session id
const expanded = ref(new Set());
const showNewSession = ref(false);
const newSessionName = ref('');
const newSessionError = ref('');
const toast = useToast();

async function loadSessions() {
  const res = await api.get('/schools/sessions');
  sessions.value = res.data.data;
}
onMounted(loadSessions);

async function toggle(session) {
  if (expanded.value.has(session.id)) {
    expanded.value.delete(session.id);
  } else {
    expanded.value.add(session.id);
    // Lazy-load: only fetch a session's terms the first time it's expanded.
    if (!termsBySession[session.id]) {
      const res = await api.get(`/schools/sessions/${session.id}/terms`);
      termsBySession[session.id] = res.data.data;
    }
  }
  expanded.value = new Set(expanded.value); // trigger reactivity
}

async function createSession() {
  newSessionError.value = '';
  try {
    await api.post('/schools/sessions', { name: newSessionName.value });
    showNewSession.value = false;
    newSessionName.value = '';
    toast.success('Session created with its three terms');
    await loadSessions();
  } catch (e) {
    if (e.response?.status === 422) newSessionError.value = e.response.data.errors[0].message;
  }
}

async function setCurrent(sessionId, term) {
  await api.post(`/schools/terms/${term.id}/set-current`);
  termsBySession[sessionId] = termsBySession[sessionId].map((t) => ({ ...t, is_current: t.id === term.id }));
  toast.success(`${term.name} set as current`);
}

async function saveDates(term) {
  await api.put(`/schools/terms/${term.id}`, {
    opens_on: term.opens_on,
    closes_on: term.closes_on,
    holiday_count: term.holiday_count,
    next_term_begins: term.next_term_begins
  });
  toast.success('Term dates saved');
}
</script>

<template>
  <PageHeader title="Academic calendar" subtitle="Sessions and terms.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showNewSession = true">Add session</button>
    </template>
  </PageHeader>

  <Spinner v-if="!sessions" />
  <p v-else-if="!sessions.length" class="text-sm text-slate-400 text-center py-10">No sessions yet — add one to get started.</p>

  <div v-else class="space-y-3">
    <div v-for="session in sessions" :key="session.id" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button class="w-full flex items-center justify-between px-4 py-3 text-left" @click="toggle(session)">
        <span class="text-sm font-medium text-slate-800">{{ session.name }}</span>
        <span class="text-slate-400">{{ expanded.has(session.id) ? '\u2212' : '+' }}</span>
      </button>
      <div v-if="expanded.has(session.id)" class="border-t border-slate-100 divide-y divide-slate-100">
        <Spinner v-if="!termsBySession[session.id]" />
        <div v-for="term in termsBySession[session.id]" :key="term.id" class="px-4 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-slate-700">{{ term.name }}</span>
            <button
              class="text-[12px] px-2 py-0.5 rounded-full"
              :class="term.is_current ? 'bg-success/10 text-success' : 'bg-slate-100 text-slate-500'"
              @click="setCurrent(session.id, term)"
            >{{ term.is_current ? 'Current' : 'Set current' }}</button>
          </div>
          <div class="grid sm:grid-cols-4 gap-2">
            <input v-model="term.opens_on" type="date" class="h-8 px-2 rounded border border-slate-200 text-[13px]" />
            <input v-model="term.closes_on" type="date" class="h-8 px-2 rounded border border-slate-200 text-[13px]" />
            <input v-model="term.holiday_count" type="number" placeholder="Holidays" class="h-8 px-2 rounded border border-slate-200 text-[13px]" />
            <button class="h-8 text-[12px] font-medium rounded border border-slate-300 text-slate-600" @click="saveDates(term)">Save dates</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <Modal v-model="showNewSession" title="Add session">
    <Field label="Session name" :error="newSessionError" hint="Format: YYYY/YYYY">
      <input v-model="newSessionName" placeholder="2026/2027" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
    </Field>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showNewSession = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="createSession">Create session</button>
    </template>
  </Modal>
</template>
