<script setup>
import { ref, watch } from 'vue';
import { useRoute, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth';
import ToastContainer from './components/base/ToastContainer.vue';

const route = useRoute();
const auth = useAuthStore();
const sidebarOpen = ref(false);

// Close the mobile drawer automatically on navigation.
watch(() => route.path, () => { sidebarOpen.value = false; });
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <ToastContainer />

    <div v-if="route.meta.requiresAuth" class="flex min-h-screen">
      <!-- Mobile backdrop -->
      <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-30 md:hidden" @click="sidebarOpen = false"></div>

      <aside
        class="fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-out md:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span class="text-accent text-sm font-semibold">E</span>
          </div>
          <span class="text-[15px] font-medium text-slate-900">EduCore</span>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
          <RouterLink to="/" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Dashboard</RouterLink>
          <RouterLink to="/students" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Students</RouterLink>
          <RouterLink to="/fees/structure" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Fee structure</RouterLink>
          <RouterLink to="/fees/payment-accounts" class="flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded text-[13px] text-slate-500 hover:bg-slate-100">Payment accounts</RouterLink>
          <RouterLink to="/fees/reports" class="flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded text-[13px] text-slate-500 hover:bg-slate-100">Defaulters</RouterLink>
          <RouterLink to="/notifications" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Notification log</RouterLink>
          <div class="pt-3 mt-3 border-t border-slate-200 text-[11px] font-medium text-slate-400 px-3">Results</div>
          <RouterLink to="/results/score-entry" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Score entry</RouterLink>
          <RouterLink to="/results/psychomotor-affective" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Psychomotor &amp; affective</RouterLink>
          <RouterLink to="/results/remarks" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Attendance &amp; comments</RouterLink>
          <RouterLink to="/results/broadsheet" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Broadsheet</RouterLink>
          <RouterLink to="/results/publish" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Publish</RouterLink>
          <RouterLink to="/staff" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Staff</RouterLink>
          <RouterLink to="/staff/allocation" class="flex items-center gap-2.5 pl-9 pr-3 py-1.5 rounded text-[13px] text-slate-500 hover:bg-slate-100">Allocation</RouterLink>
          <div class="pt-3 mt-3 border-t border-slate-200 text-[11px] font-medium text-slate-400 px-3">Settings</div>
          <RouterLink to="/settings/school-profile" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">School profile</RouterLink>
          <RouterLink to="/settings/academic-calendar" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Academic calendar</RouterLink>
          <RouterLink to="/settings/classes-sections" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Classes &amp; sections</RouterLink>
          <RouterLink to="/settings/subjects" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Subjects</RouterLink>
          <RouterLink to="/settings/grading-scale" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Grading scale</RouterLink>
          <RouterLink to="/settings/number-sequences" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100">Number sequences</RouterLink>
        </nav>
        <div class="p-3 border-t border-slate-200">
          <button class="w-full text-left px-3 py-2 rounded text-sm text-slate-600 hover:bg-slate-100" @click="auth.logout(); $router.push('/sign-in')">Sign out</button>
        </div>
      </aside>

      <div class="flex-1 flex flex-col min-w-0">
        <header class="h-14 md:hidden bg-white border-b border-slate-200 flex items-center px-4 sticky top-0 z-20">
          <button aria-label="Open menu" class="text-slate-500" @click="sidebarOpen = true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span class="ml-3 text-[15px] font-medium text-slate-900">EduCore</span>
        </header>
        <main class="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">
          <RouterView />
        </main>
      </div>
    </div>

    <RouterView v-else />
  </div>
</template>
