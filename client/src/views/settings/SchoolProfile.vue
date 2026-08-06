<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Field from '../../components/base/Field.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const form = ref(null);
const errors = ref({});
const saving = ref(false);
const toast = useToast();

onMounted(async () => {
  const res = await api.get('/schools/profile');
  form.value = res.data.data;
});

async function save() {
  errors.value = {};
  saving.value = true;
  try {
    const res = await api.put('/schools/profile', form.value);
    form.value = res.data.data;
    toast.success('School profile saved');
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
  <PageHeader title="School profile" subtitle="Shown on report cards, receipts, and the sign-in area." />
  <Spinner v-if="!form" />
  <form v-else class="bg-white border border-slate-200 rounded-xl p-6 max-w-2xl grid sm:grid-cols-2 gap-4" @submit.prevent="save">
    <div class="sm:col-span-2">
      <Field label="School name" :error="errors.name">
        <input v-model="form.name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
    </div>
    <div class="sm:col-span-2">
      <Field label="Motto">
        <input v-model="form.motto" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
      </Field>
    </div>
    <div class="sm:col-span-2">
      <Field label="Address">
        <textarea v-model="form.address" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"></textarea>
      </Field>
    </div>
    <Field label="Email" :error="errors.email">
      <input v-model="form.email" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
    </Field>
    <Field label="Phone">
      <input v-model="form.phone" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
    </Field>
    <div class="sm:col-span-2 flex justify-end pt-4 border-t border-slate-100">
      <button :disabled="saving" class="px-4 h-10 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-60">
        {{ saving ? 'Saving\u2026' : 'Save changes' }}
      </button>
    </div>
  </form>
</template>
