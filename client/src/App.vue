<script setup>
import { useRoute, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth';
import ToastContainer from './components/base/ToastContainer.vue';

const route = useRoute();
const auth = useAuthStore();
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <ToastContainer />

    <div v-if="route.meta.requiresAuth" class="flex min-h-screen">
      <aside class="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span class="text-accent text-sm font-semibold">E</span>
          </div>
          <span class="text-[15px] font-medium text-slate-900">EduCore</span>
        </div>
        <nav class="flex-1 px-3 py-4 space-y-1 text-sm">
          <RouterLink to="/" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Dashboard</RouterLink>
          <RouterLink to="/staff" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Staff</RouterLink>
          <div class="pt-3 mt-3 border-t border-slate-200 text-[11px] font-medium text-slate-400 px-3">Settings</div>
          <RouterLink to="/settings/school-profile" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">School profile</RouterLink>
          <RouterLink to="/settings/academic-calendar" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Academic calendar</RouterLink>
          <RouterLink to="/settings/classes-sections" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Classes &amp; sections</RouterLink>
          <RouterLink to="/settings/subjects" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Subjects</RouterLink>
        </nav>
        <div class="p-3 border-t border-slate-200">
          <button class="w-full text-left px-3 py-2 rounded text-sm text-slate-600 hover:bg-slate-100" @click="auth.logout(); $router.push('/sign-in')">Sign out</button>
        </div>
      </aside>
      <main class="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
        <RouterView />
      </main>
    </div>

    <RouterView v-else />
  </div>
</template>
