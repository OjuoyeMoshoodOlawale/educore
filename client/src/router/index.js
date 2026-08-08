import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/sign-in', name: 'sign-in', component: () => import('../views/auth/SignIn.vue') },
  { path: '/', name: 'dashboard', component: () => import('../views/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/settings/school-profile', name: 'school-profile', component: () => import('../views/settings/SchoolProfile.vue'), meta: { requiresAuth: true } },
  { path: '/settings/academic-calendar', name: 'academic-calendar', component: () => import('../views/settings/AcademicCalendar.vue'), meta: { requiresAuth: true } },
  { path: '/settings/classes-sections', name: 'classes-sections', component: () => import('../views/settings/ClassesSections.vue'), meta: { requiresAuth: true } },
  { path: '/settings/subjects', name: 'subjects', component: () => import('../views/settings/Subjects.vue'), meta: { requiresAuth: true } },
  { path: '/settings/grading-scale', name: 'grading-scale', component: () => import('../views/settings/GradingScale.vue'), meta: { requiresAuth: true } },
  { path: '/settings/number-sequences', name: 'number-sequences', component: () => import('../views/settings/NumberSequences.vue'), meta: { requiresAuth: true } },
  { path: '/staff', name: 'staff-list', component: () => import('../views/staff/StaffList.vue'), meta: { requiresAuth: true } },
  { path: '/staff/allocation', name: 'allocation', component: () => import('../views/staff/Allocation.vue'), meta: { requiresAuth: true } },
  { path: '/students', name: 'student-list', component: () => import('../views/students/StudentList.vue'), meta: { requiresAuth: true } },
  { path: '/students/new', name: 'student-form', component: () => import('../views/students/StudentForm.vue'), meta: { requiresAuth: true } },
  { path: '/students/:id', name: 'student-profile', component: () => import('../views/students/StudentProfile.vue'), meta: { requiresAuth: true } },
  { path: '/fees/structure', name: 'fee-structure', component: () => import('../views/fees/FeeStructure.vue'), meta: { requiresAuth: true } },
  { path: '/fees/payment-accounts', name: 'payment-accounts', component: () => import('../views/fees/PaymentAccounts.vue'), meta: { requiresAuth: true } },
  { path: '/fees/reports', name: 'fee-reports', component: () => import('../views/fees/Reports.vue'), meta: { requiresAuth: true } }
];

export const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'sign-in' };
  }
});
