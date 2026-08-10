<script setup>
import { ref, reactive, watch } from 'vue';
import { useRoute, RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/auth';
import ToastContainer from './components/base/ToastContainer.vue';

const route = useRoute();
const auth = useAuthStore();
const sidebarOpen = ref(false);

const groups = [
  { key: 'developer', label: 'Developer', prefix: '/developer', items: [
    { to: '/developer/settings', label: 'Module activation' }
  ], roleOnly: 'developer' },
  { key: 'fees', label: 'Fees', prefix: '/fees', items: [
    { to: '/fees/items', label: 'Fee items' },
    { to: '/fees/structure', label: 'Fee structure' },
    { to: '/fees/payment-accounts', label: 'Payment accounts' },
    { to: '/fees/reports', label: 'Defaulters' }
  ] },
  { key: 'staff', label: 'Staff', prefix: '/staff', items: [
    { to: '/staff', label: 'All staff' },
    { to: '/staff/allocation', label: 'Allocation' }
  ] },
  { key: 'results', label: 'Results', prefix: '/results', items: [
    { to: '/results/score-entry', label: 'Score entry' },
    { to: '/results/psychomotor-affective', label: 'Psychomotor & affective' },
    { to: '/results/remarks', label: 'Attendance & comments' },
    { to: '/results/broadsheet', label: 'Broadsheet' },
    { to: '/results/publish', label: 'Publish' }
  ] },
  { key: 'termEnd', label: 'Term end', prefix: null, items: [
    { to: '/promotion', label: 'Promotion' },
    { to: '/graduation', label: 'Graduation' }
  ] },
  { key: 'recruitment', label: 'Recruitment', prefix: '/recruitment', items: [
    { to: '/recruitment', label: 'Job postings' }
  ] },
  { key: 'settings', label: 'Settings', prefix: '/settings', items: [
    { to: '/settings/school-profile', label: 'School profile' },
    { to: '/settings/academic-calendar', label: 'Academic calendar' },
    { to: '/settings/classes-sections', label: 'Classes & sections' },
    { to: '/settings/subjects', label: 'Subjects' },
    { to: '/settings/grading-scale', label: 'Grading scale' },
    { to: '/settings/traits', label: 'Psychomotor & affective traits' },
    { to: '/settings/number-sequences', label: 'Number sequences' },
    { to: '/settings/notifications', label: 'Notifications' },
    { to: '/settings/permissions', label: 'Permission overrides' }
  ] }
];

// Open the group containing the current route by default; every group otherwise starts collapsed.
const open = reactive(Object.fromEntries(groups.map((g) => [
  g.key,
  g.prefix ? route.path.startsWith(g.prefix) : g.items.some((i) => i.to === route.path)
])));

function toggle(key) {
  open[key] = !open[key];
}

// Close the mobile drawer automatically on navigation.
watch(() => route.path, () => { sidebarOpen.value = false; });
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <ToastContainer />

    <div v-if="route.meta.requiresAuth" class="flex min-h-screen">
      <div v-if="sidebarOpen" class="fixed inset-0 bg-black/40 z-30 md:hidden" @click="sidebarOpen = false"></div>

      <aside
        class="fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-out md:translate-x-0"
        :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
      >
        <div class="h-16 flex items-center gap-2 px-5 border-b border-slate-200 flex-shrink-0">
          <div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span class="text-accent text-sm font-semibold">E</span>
          </div>
          <span class="text-[15px] font-medium text-slate-900">EduCore</span>
        </div>

        <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-sm">
          <RouterLink to="/" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100" active-class="bg-primary-50 text-primary font-medium">Dashboard</RouterLink>
          <RouterLink to="/students" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100" active-class="bg-primary-50 text-primary font-medium">Students</RouterLink>

          <div v-for="g in groups.filter(g => !g.roleOnly || auth.user?.role === g.roleOnly)" :key="g.key" class="pt-1">
            <button class="w-full flex items-center gap-3 px-3 py-2 rounded text-sm text-slate-600 hover:bg-slate-100" @click="toggle(g.key)">
              <span>{{ g.label }}</span>
              <span class="ml-auto text-[12px] text-slate-400 transition-transform" :class="open[g.key] ? 'rotate-180' : ''">&#9660;</span>
            </button>
            <div v-show="open[g.key]" class="mt-1 space-y-1">
              <RouterLink
                v-for="item in g.items" :key="item.to" :to="item.to"
                class="flex items-center gap-2 pl-9 pr-3 py-1.5 rounded text-[13px] text-slate-500 hover:bg-slate-100"
                active-class="text-primary font-medium bg-primary-50"
              >{{ item.label }}</RouterLink>
            </div>
          </div>

          <RouterLink to="/notifications" class="flex items-center gap-2.5 px-3 py-2 rounded text-slate-600 hover:bg-slate-100 mt-2" active-class="bg-primary-50 text-primary font-medium">Notification log</RouterLink>
        </nav>

        <div class="p-3 border-t border-slate-200 flex-shrink-0">
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
