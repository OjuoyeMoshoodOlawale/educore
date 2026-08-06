import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/sign-in', name: 'sign-in', component: () => import('../views/auth/SignIn.vue') },
  { path: '/', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/settings/school-profile', name: 'school-profile', component: () => import('../views/settings/SchoolProfile.vue'), meta: { requiresAuth: true } },
  { path: '/settings/academic-calendar', name: 'academic-calendar', component: () => import('../views/settings/AcademicCalendar.vue'), meta: { requiresAuth: true } },
  { path: '/settings/classes-sections', name: 'classes-sections', component: () => import('../views/settings/ClassesSections.vue'), meta: { requiresAuth: true } },
  { path: '/settings/subjects', name: 'subjects', component: () => import('../views/settings/Subjects.vue'), meta: { requiresAuth: true } },
  { path: '/staff', name: 'staff-list', component: () => import('../views/staff/StaffList.vue'), meta: { requiresAuth: true } }
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'sign-in' };
  }
});
