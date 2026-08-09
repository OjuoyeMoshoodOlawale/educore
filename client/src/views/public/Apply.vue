<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const posting = ref(null);
const error = ref('');
const submitted = ref(false);
const form = ref({ name: '', email: '', phone: '', cover_note: '' });

onMounted(async () => {
  try {
    const res = await axios.get(`/api/recruitment/postings/${route.params.id}/public`);
    posting.value = res.data.data;
  } catch (e) {
    error.value = e.response?.data?.message || 'This posting could not be found';
  }
});

async function submit() {
  error.value = '';
  try {
    await axios.post(`/api/recruitment/postings/${route.params.id}/apply`, form.value);
    submitted.value = true;
  } catch (e) {
    error.value = e.response?.data?.errors?.[0]?.message || 'Something went wrong';
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="w-full max-w-[440px] bg-white rounded-xl border border-slate-200 p-8">
      <div v-if="submitted" class="text-center py-6">
        <div class="w-11 h-11 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3"><span class="text-success text-[18px]">&#10003;</span></div>
        <p class="text-sm font-medium text-slate-900">Application received</p>
        <p class="text-[13px] text-slate-500 mt-1">Thank you — the school will be in touch if there's a match.</p>
      </div>

      <template v-else-if="posting">
        <h1 class="text-lg font-medium text-slate-900 mb-1">{{ posting.title }}</h1>
        <p class="text-[13px] text-slate-500 mb-6">{{ posting.description }}</p>

        <div class="space-y-3">
          <div>
            <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Full name</label>
            <input v-model="form.name" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Email</label>
            <input v-model="form.email" type="email" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Phone</label>
            <input v-model="form.phone" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label class="block text-[13px] font-medium text-slate-800 mb-1.5">Cover note</label>
            <textarea v-model="form.cover_note" rows="3" class="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"></textarea>
          </div>
        </div>

        <p v-if="error" class="flex items-center gap-1.5 mt-3 text-[12px] text-danger"><span aria-hidden="true">&#9888;</span> {{ error }}</p>
        <button class="w-full h-[42px] mt-5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg" @click="submit">Submit application</button>
      </template>

      <p v-else class="text-sm text-slate-500 text-center py-6">{{ error || 'Loading\u2026' }}</p>
    </div>
  </div>
</template>
