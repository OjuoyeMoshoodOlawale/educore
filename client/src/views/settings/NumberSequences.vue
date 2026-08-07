<script setup>
import { ref, onMounted, computed } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const sequences = ref(null);
const presets = ref([]);
const editing = ref(null); // the sequence currently being edited
const toast = useToast();

const TOKENS = [
  { token: '{PREFIX}', desc: 'The prefix below' },
  { token: '{YEAR}', desc: 'Full year, e.g. 2026' },
  { token: '{YY}', desc: 'Two-digit year, e.g. 26' },
  { token: '{SESSION}', desc: 'Current session, e.g. 20252026' },
  { token: '{SEQ3}', desc: '3-digit counter, e.g. 007' },
  { token: '{SEQ4}', desc: '4-digit counter, e.g. 0007' },
  { token: '{SEQ5}', desc: '5-digit counter, e.g. 00007' }
];

async function load() {
  const res = await api.get('/schools/number-sequences');
  sequences.value = res.data.data.sequences;
  presets.value = res.data.data.presets;
}
onMounted(load);

function preview(seq) {
  const year = new Date().getFullYear();
  return (seq.format || '')
    .replace('{PREFIX}', seq.prefix || '')
    .replace('{YEAR}', String(year))
    .replace('{YY}', String(year).slice(-2))
    .replace('{SESSION}', '20252026')
    .replace(/\{SEQ(\d)\}/, (_, w) => String(seq.next_number || 1).padStart(Number(w), '0'));
}

function insertToken(token) {
  editing.value.format = (editing.value.format || '') + token;
}

async function save() {
  await api.put(`/schools/number-sequences/${editing.value.id}`, {
    format: editing.value.format,
    prefix: editing.value.prefix,
    reset_period: editing.value.reset_period
  });
  toast.success('Number sequence saved');
  editing.value = null;
  await load();
}
</script>

<template>
  <PageHeader title="Number sequences" subtitle="Configurable ID formats — no hardcoded prefix buried in a form field." />
  <Spinner v-if="!sequences" />

  <div v-else-if="!editing" class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-[12px]">
        <tr><th class="text-left font-medium px-4 py-2.5">Used for</th><th class="text-left font-medium px-4 py-2.5">Format</th><th class="text-left font-medium px-4 py-2.5">Preview</th><th></th></tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="seq in sequences" :key="seq.id">
          <td class="px-4 py-3 text-slate-800">{{ seq.sequence_for.replace('_', ' ') }}</td>
          <td class="px-4 py-3 font-mono text-[13px] text-slate-500">{{ seq.format }}</td>
          <td class="px-4 py-3 font-mono text-[13px] text-primary">{{ preview(seq) }}</td>
          <td class="px-4 py-3 text-right"><button class="text-primary text-[13px] font-medium" @click="editing = { ...seq }">Edit</button></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-else class="bg-white border border-slate-200 rounded-xl p-5 max-w-2xl">
    <div class="bg-primary-50 rounded-lg p-3 mb-5 text-center">
      <p class="text-[11px] text-primary/70 mb-1">Live preview</p>
      <p class="text-lg font-mono text-primary font-medium">{{ preview(editing) }}</p>
    </div>

    <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Prefix</label>
    <input v-model="editing.prefix" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm mb-4" />

    <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Format</label>
    <input v-model="editing.format" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono mb-2" />

    <div class="flex flex-wrap gap-1.5 mb-4">
      <button v-for="t in TOKENS" :key="t.token" class="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 font-mono" @click="insertToken(t.token)">{{ t.token }}</button>
    </div>

    <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Presets</label>
    <div class="grid sm:grid-cols-2 gap-2 mb-4">
      <button
        v-for="p in presets"
        :key="p.format"
        class="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-primary text-[12px]"
        @click="editing.format = p.format"
      >
        <div class="font-mono text-slate-700">{{ p.format }}</div>
        <div class="text-slate-400">{{ p.example }}</div>
      </button>
    </div>

    <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Resets</label>
    <div class="flex gap-4 mb-2 text-[13px] text-slate-600">
      <label class="flex items-center gap-1.5"><input v-model="editing.reset_period" type="radio" value="never" /> Never</label>
      <label class="flex items-center gap-1.5"><input v-model="editing.reset_period" type="radio" value="yearly" /> Every year</label>
      <label class="flex items-center gap-1.5"><input v-model="editing.reset_period" type="radio" value="session" /> Every session</label>
    </div>
    <p class="text-[12px] text-slate-400 mb-5">Changing the format never renumbers existing records.</p>

    <div class="flex justify-end gap-2">
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="editing = null">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="save">Save</button>
    </div>
  </div>
</template>
