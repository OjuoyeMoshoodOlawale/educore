<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Field from '../../components/base/Field.vue';
import { useToast } from '../../components/base/useToast';

const router = useRouter();
const toast = useToast();
const errors = ref({});
const saving = ref(false);

const form = ref({
  first_name: '', last_name: '', other_name: '', sex: 'female', boarding_type: 'day',
  date_of_birth: '', address: '', occupation: '',
  class_id: null, term_id: null, intake_type: 'new',
  guardians: [{ name: '', relationship: 'mother', phone: '', email: '', is_primary: true }]
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
    await api.post('/students', {
      ...form.value,
      class_id: Number(form.value.class_id),
      term_id: Number(form.value.term_id)
    });
    toast.success('Student saved');
    router.push('/students');
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
  <PageHeader title="Add student" subtitle="Admission number is assigned automatically." />

  <form class="bg-white border border-slate-200 rounded-xl p-6 max-w-3xl space-y-5" @submit.prevent="save">
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
      <Field label="Boarding type">
        <select v-model="form.boarding_type" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm"><option value="day">Day</option><option value="boarder">Boarder</option></select>
      </Field>
    </div>
    <div class="grid sm:grid-cols-3 gap-4">
      <Field label="Class ID" hint="Temporary numeric input — a real class picker lands with the Settings integration pass" :error="errors.class_id">
        <input v-model="form.class_id" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
      <Field label="Term ID" :error="errors.term_id">
        <input v-model="form.term_id" type="number" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
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
      <RouterLink to="/students" class="px-4 h-10 flex items-center text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100">Cancel</RouterLink>
      <button :disabled="saving" class="px-4 h-10 text-sm font-medium rounded-lg bg-primary text-white disabled:opacity-60">{{ saving ? 'Saving\u2026' : 'Save student' }}</button>
    </div>
  </form>
</template>
