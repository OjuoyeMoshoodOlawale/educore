<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const router = useRouter();
const route = useRoute();
const toast = useToast();
const errors = ref({});
const saving = ref(false);
const loading = ref(false);
const classes = ref([]);
const terms = ref([]);

const isEdit = computed(() => !!route.params.id);

const form = ref({
  first_name: '', last_name: '', other_name: '', sex: 'female', boarding_type: 'day',
  date_of_birth: '', address: '', occupation: '',
  state_of_origin: '', lga_of_origin: '', country_of_origin: 'Nigeria',
  class_id: null, term_id: null, intake_type: 'new',
  guardians: [{ name: '', relationship: 'mother', phone: '', email: '', is_primary: true }]
});

onMounted(async () => {
  const classesRes = await api.get('/schools/classes');
  classes.value = classesRes.data.data;

  const sessions = await api.get('/schools/sessions');
  const active = sessions.data.data.find((s) => s.is_active) || sessions.data.data[0];
  if (active) {
    const termsRes = await api.get(`/schools/sessions/${active.id}/terms`);
    terms.value = termsRes.data.data;
  }
  const currentTerm = terms.value.find((t) => t.is_current)?.id || terms.value[0]?.id || null;

  if (isEdit.value) {
    loading.value = true;
    const res = await api.get(`/students/${route.params.id}`);
    const s = res.data.data;
    form.value = {
      first_name: s.first_name, last_name: s.last_name, other_name: s.other_name || '',
      sex: s.sex || 'female', boarding_type: s.currentEnrollment?.boarding_type || 'day',
      date_of_birth: s.date_of_birth ? s.date_of_birth.slice(0, 10) : '', address: s.address || '', occupation: s.occupation || '',
      state_of_origin: s.state_of_origin || '', lga_of_origin: s.lga_of_origin || '', country_of_origin: s.country_of_origin || 'Nigeria',
      class_id: s.currentEnrollment?.class_id || classes.value[0]?.id, term_id: currentTerm, intake_type: s.currentEnrollment?.intake_type || 'new',
      guardians: s.guardians?.length ? s.guardians : [{ name: '', relationship: 'mother', phone: '', email: '', is_primary: true }]
    };
    loading.value = false;
  } else {
    form.value.class_id = classes.value[0]?.id || null;
    form.value.term_id = currentTerm;
  }
});

function addGuardian() {
  form.value.guardians.push({ name: '', relationship: 'father', phone: '', email: '', is_primary: false });
}
function removeGuardian(i) {
  form.value.guardians.splice(i, 1);
}

async function save() {
  errors.value = {};
  saving.value = true;
  try {
    const payload = { ...form.value, class_id: Number(form.value.class_id), term_id: Number(form.value.term_id) };
    if (isEdit.value) {
      await api.put(`/students/${route.params.id}`, payload);
      toast.success('Student profile updated');
      router.push(`/students/${route.params.id}`);
    } else {
      await api.post('/students', payload);
      toast.success('Student saved');
      router.push('/students');
    }
  } catch (e) {
    if (e.response?.status === 422) {
      errors.value = Object.fromEntries(e.response.data.errors.map((er) => [er.field, er.message]));
    } else {
      toast.error(e.response?.data?.message || 'Something went wrong');
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <PageHeader :title="isEdit ? 'Edit student' : 'Add student'" :subtitle="isEdit ? 'Class/term here reflect the current term.' : 'Admission number is assigned automatically.'" />
  <Spinner v-if="loading" />

  <form v-else class="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl space-y-5" @submit.prevent="save">
    <div class="grid sm:grid-cols-3 gap-4">
      <Field label="First name" :error="errors.first_name"><input v-model="form.first_name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      <Field label="Last name" :error="errors.last_name"><input v-model="form.last_name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      <Field label="Other name"><input v-model="form.other_name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
    </div>
    <div class="grid sm:grid-cols-3 gap-4">
      <Field label="Date of birth"><input v-model="form.date_of_birth" type="date" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      <Field label="Sex">
        <select v-model="form.sex" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"><option value="female">Female</option><option value="male">Male</option></select>
      </Field>
      <Field label="Boarding type" :hint="isEdit ? 'Updates the current term only' : ''">
        <select v-model="form.boarding_type" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"><option value="day">Day</option><option value="boarder">Boarder</option></select>
      </Field>
    </div>

    <div>
      <h3 class="text-sm font-medium text-slate-900 mb-2">State of origin</h3>
      <p class="text-[12px] text-slate-400 mb-3">For WAEC/NECO and other external exam registration.</p>
      <div class="grid sm:grid-cols-3 gap-4">
        <Field label="Country"><input v-model="form.country_of_origin" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="State of origin"><input v-model="form.state_of_origin" placeholder="e.g. Lagos" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
        <Field label="LGA of origin"><input v-model="form.lga_of_origin" placeholder="e.g. Ikeja" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" /></Field>
      </div>
    </div>

    <div class="grid sm:grid-cols-3 gap-4">
      <Field label="Class" :error="errors.class_id">
        <select v-model.number="form.class_id" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </Field>
      <Field label="Term" :error="errors.term_id">
        <select v-model.number="form.term_id" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm">
          <option v-for="t in terms" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </Field>
      <Field label="Intake">
        <select v-model="form.intake_type" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"><option value="new">New</option><option value="returning">Returning</option></select>
      </Field>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-medium text-slate-900">Guardians</h3>
        <button type="button" class="text-[13px] text-primary" @click="addGuardian">+ Add guardian</button>
      </div>
      <div v-for="(g, i) in form.guardians" :key="i" class="border border-slate-200 rounded-lg p-4 mb-3">
        <div class="grid sm:grid-cols-4 gap-3 mb-2">
          <input v-model="g.name" placeholder="Name" class="h-9 px-3 rounded-lg border border-slate-300 text-sm sm:col-span-2" />
          <select v-model="g.relationship" class="h-9 px-3 rounded-lg border border-slate-300 text-sm">
            <option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option>
          </select>
          <input v-model="g.phone" placeholder="Phone" class="h-9 px-3 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 text-[13px] text-slate-600"><input v-model="g.is_primary" type="checkbox" /> Primary contact</label>
          <button v-if="form.guardians.length > 1" type="button" class="text-[12px] text-danger" @click="removeGuardian(i)">Remove</button>
        </div>
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
      <RouterLink :to="isEdit ? `/students/${route.params.id}` : '/students'" class="px-4 h-10 flex items-center text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100">Cancel</RouterLink>
      <button :disabled="saving" class="px-4 h-10 text-sm font-medium rounded-lg bg-primary text-white disabled:opacity-60">{{ saving ? 'Saving\u2026' : isEdit ? 'Save changes' : 'Save student' }}</button>
    </div>
  </form>
</template>
