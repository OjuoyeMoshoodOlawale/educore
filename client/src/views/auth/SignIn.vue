<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import Field from '../../components/base/Field.vue';
import { useToast } from '../../components/base/useToast';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await auth.login(email.value, password.value);
    router.push('/');
  } catch (e) {
    error.value = e.response?.data?.message || 'Something went wrong';
    toast.error(error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6">
    <div class="w-full max-w-[380px] bg-white rounded-xl border border-slate-200 p-8">
      <div class="flex flex-col items-center mb-7">
        <div class="w-11 h-11 rounded-lg bg-primary flex items-center justify-center mb-3">
          <span class="text-accent text-xl font-semibold">E</span>
        </div>
        <div class="text-lg font-medium text-slate-900">EduCore</div>
        <div class="text-[13px] text-slate-500 mt-1">Sign in to your school dashboard</div>
      </div>

      <form class="space-y-4" @submit.prevent="submit">
        <Field label="Email">
          <input v-model="email" type="email" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
        </Field>
        <Field label="Password" :error="error">
          <input v-model="password" type="password" class="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm" />
        </Field>
        <button :disabled="loading" class="w-full h-[42px] bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg disabled:opacity-60">
          {{ loading ? 'Signing in\u2026' : 'Sign in' }}
        </button>
      </form>
      <p class="text-center text-[12px] text-slate-400 mt-5">admin@educore.dev / changeme123 (seeded)</p>

      <div class="flex items-center gap-3 my-5">
        <div class="flex-1 h-px bg-slate-200"></div>
        <span class="text-[12px] text-slate-400">or</span>
        <div class="flex-1 h-px bg-slate-200"></div>
      </div>
      <RouterLink to="/result-check" class="w-full h-[42px] flex items-center justify-center gap-2 border border-primary text-primary text-sm font-medium rounded-lg hover:bg-primary-50">
        Check your child's result
      </RouterLink>
    </div>
  </div>
</template>
