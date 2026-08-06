<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api/client';
import { useAuthStore } from '../stores/auth';

const school = ref(null);
const auth = useAuthStore();

onMounted(async () => {
  const res = await api.get('/schools/profile');
  school.value = res.data.data;
});
</script>

<template>
  <div>
    <h2 class="text-xl font-medium text-slate-900">Welcome back</h2>
    <p class="text-sm text-slate-500 mt-1" v-if="school">{{ school.name }} &middot; signed in as {{ auth.user?.email }}</p>
    <div class="bg-white border border-slate-200 rounded-xl p-5 mt-6">
      <p class="text-sm text-slate-600">This is the real EduCore app — Phase 1 (settings + staff) is wired end to end against a real API and database. Next: fees, results, and the rest of the phased plan.</p>
    </div>
  </div>
</template>
