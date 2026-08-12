import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useAuthStore } from './stores/auth';
import './assets/main.css';

const app = createApp(App);
app.use(createPinia());

// Restore the session from the httpOnly refresh cookie before the router's auth guard runs —
// without this, every page reload looked unauthenticated even with a still-valid session,
// because the access token only ever lived in memory.
const auth = useAuthStore();
auth.refresh().finally(() => {
  app.use(router);
  app.mount('#app');
});
