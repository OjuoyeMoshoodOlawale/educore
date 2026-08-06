<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Modal from '../../components/base/Modal.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const sections = ref(null);
const classes = ref(null);
const showNewSection = ref(false);
const showNewClass = ref(false);
const newName = ref('');
const activeSectionId = ref(null);
const toast = useToast();

async function load() {
  const [s, c] = await Promise.all([api.get('/schools/sections'), api.get('/schools/classes')]);
  sections.value = s.data.data;
  classes.value = c.data.data;
  if (sections.value.length && !activeSectionId.value) activeSectionId.value = sections.value[0].id;
}
onMounted(load);

function classesFor(sectionId) {
  return classes.value.filter((c) => c.section_id === sectionId);
}

async function createSection() {
  await api.post('/schools/sections', { name: newName.value });
  newName.value = '';
  showNewSection.value = false;
  toast.success('Section added');
  await load();
}

async function createClass() {
  await api.post('/schools/classes', { name: newName.value, section_id: activeSectionId.value });
  newName.value = '';
  showNewClass.value = false;
  toast.success('Class added');
  await load();
}

// Native HTML5 drag-and-drop, reordered in place, persisted on drop.
let dragItem = null;
function onDragStart(item) { dragItem = item; }
function onDragOver(e, list, overItem) {
  e.preventDefault();
  const fromIdx = list.indexOf(dragItem);
  const toIdx = list.indexOf(overItem);
  if (fromIdx === toIdx || fromIdx === -1) return;
  list.splice(fromIdx, 1);
  list.splice(toIdx, 0, dragItem);
}
async function onDrop(list, endpoint) {
  await api.put(endpoint, { orderedIds: list.map((i) => i.id) });
  toast.info('Order saved');
}
</script>

<template>
  <PageHeader title="Classes & sections" subtitle="Drag to set print and display order.">
    <template #actions>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg border border-slate-300 text-slate-600" @click="showNewSection = true">Add section</button>
      <button class="h-9 px-3 text-[13px] font-medium rounded-lg bg-primary text-white" @click="showNewClass = true">Add class</button>
    </template>
  </PageHeader>

  <Spinner v-if="!sections" />
  <div v-else class="grid md:grid-cols-2 gap-5">
    <div class="bg-white border border-slate-200 rounded-xl p-5">
      <h3 class="text-sm font-medium text-slate-900 mb-3">Sections</h3>
      <ul class="space-y-2">
        <li
          v-for="section in sections"
          :key="section.id"
          draggable="true"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-grab border"
          :class="section.id === activeSectionId ? 'bg-primary-50 border-primary/30' : 'bg-slate-50 border-slate-200'"
          @dragstart="onDragStart(section)"
          @dragover="onDragOver($event, sections, section)"
          @drop="onDrop(sections, '/schools/sections/reorder')"
          @click="activeSectionId = section.id"
        >
          <span class="text-slate-400">&#8942;&#8942;</span>
          <span class="text-sm" :class="section.id === activeSectionId ? 'text-primary font-medium' : 'text-slate-800'">{{ section.name }}</span>
        </li>
      </ul>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-5">
      <h3 class="text-sm font-medium text-slate-900 mb-3">Classes</h3>
      <ul class="space-y-2">
        <li
          v-for="cls in classesFor(activeSectionId)"
          :key="cls.id"
          draggable="true"
          class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 cursor-grab"
          @dragstart="onDragStart(cls)"
          @dragover="onDragOver($event, classes, cls)"
          @drop="onDrop(classesFor(activeSectionId), '/schools/classes/reorder')"
        >
          <span class="text-slate-400">&#8942;&#8942;</span>
          <span class="text-sm text-slate-800">{{ cls.name }}</span>
        </li>
      </ul>
      <p class="text-[12px] text-slate-400 mt-3">Order saves automatically on drop.</p>
    </div>
  </div>

  <Modal v-model="showNewSection" title="Add section">
    <Field label="Section name"><input v-model="newName" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showNewSection = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="createSection">Add section</button>
    </template>
  </Modal>

  <Modal v-model="showNewClass" title="Add class">
    <Field label="Class name" :hint="`Added to the currently selected section`">
      <input v-model="newName" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
    </Field>
    <template #footer>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg text-slate-600 hover:bg-slate-100" @click="showNewClass = false">Cancel</button>
      <button class="px-4 h-9 text-[13px] font-medium rounded-lg bg-primary text-white" @click="createClass">Add class</button>
    </template>
  </Modal>
</template>
