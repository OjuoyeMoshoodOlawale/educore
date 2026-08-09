<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Confirm from '../../components/base/Confirm.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const domain = ref('psychomotor');
const traits = ref(null);
const showModal = ref(false);
const editing = ref(null);
const form = ref({ description: '' });
const confirmDelete = ref(null);

async function load() {
  traits.value = null;
  const res = await api.get(`/schools/traits/${domain.value}`);
  traits.value = res.data.data;
}
onMounted(load);

function openModal(trait = null) {
  editing.value = trait;
  form.value = { description: trait?.description || '' };
  showModal.value = true;
}

async function save() {
  if (editing.value) {
    await api.put(`/schools/traits/${editing.value.id}`, form.value);
  } else {
    await api.post('/schools/traits', { domain: domain.value, description: form.value.description });
  }
  showModal.value = false;
  toast.success('Saved');
  await load();
}

async function remove() {
  await api.delete(`/schools/traits/${confirmDelete.value.id}`);
  toast.success('Removed');
  await load();
}

let dragItem = null;
function onDragStart(item) { dragItem = item; }
function onDragOver(e, overItem) {
  e.preventDefault();
  const fromIdx = traits.value.indexOf(dragItem);
  const toIdx = traits.value.indexOf(overItem);
  if (fromIdx === toIdx || fromIdx === -1) return;
  traits.value.splice(fromIdx, 1);
  traits.value.splice(toIdx, 0, dragItem);
}
async function onDrop() {
  await api.put('/schools/traits/reorder', { orderedIds: traits.value.map((t) => t.id) });
  toast.info('Order saved');
}
</script>

<template>
  <PageHeader title="Psychomotor & affective traits" subtitle="Every school rates different things — this list is yours to define, not a fixed set.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="openModal()">+ Add trait</button>
    </template>
  </PageHeader>

  <div class="flex gap-1 border-b border-slate-200 mb-4">
    <button class="px-3 py-2.5 text-sm font-medium" :class="domain === 'psychomotor' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'" @click="domain = 'psychomotor'; load()">Psychomotor</button>
    <button class="px-3 py-2.5 text-sm font-medium" :class="domain === 'affective' ? 'text-primary border-b-2 border-primary' : 'text-slate-500'" @click="domain = 'affective'; load()">Affective</button>
  </div>

  <Spinner v-if="!traits" />
  <div v-else class="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 max-w-lg">
    <ul class="space-y-2">
      <li v-if="!traits.length" class="text-sm text-slate-400 text-center py-6">No {{ domain }} traits yet — add the first one.</li>
      <li
        v-for="t in traits" :key="t.id"
        draggable="true"
        class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 cursor-grab"
        @dragstart="onDragStart(t)"
        @dragover="onDragOver($event, t)"
        @drop="onDrop"
      >
        <span class="text-slate-400" aria-hidden="true">&#8942;&#8942;</span>
        <span class="text-sm text-slate-800 flex-1">{{ t.description }}</span>
        <button class="text-[12px] text-slate-500" @click="openModal(t)">Edit</button>
        <button class="text-[12px] text-danger" @click="confirmDelete = t">Delete</button>
      </li>
    </ul>
    <p class="text-[12px] text-slate-400 mt-3">Drag to reorder — this is the order they'll print on the report card.</p>
  </div>

  <Modal v-model="showModal" :title="editing ? 'Edit trait' : `Add ${domain} trait`" size="sm">
    <Field label="Description"><input v-model="form.description" placeholder="e.g. Handwriting" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showModal = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="save">Save</button>
    </template>
  </Modal>

  <Confirm
    :model-value="!!confirmDelete"
    title="Remove this trait?"
    :message="`Existing ratings for '${confirmDelete?.description || ''}' stay on record — this only stops it from appearing for future entries.`"
    @update:model-value="confirmDelete = null"
    @confirm="remove"
  />
</template>
