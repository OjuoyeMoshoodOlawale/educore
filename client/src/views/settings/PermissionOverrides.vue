<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../../api/client';
import PageHeader from '../../components/base/PageHeader.vue';
import Spinner from '../../components/base/Spinner.vue';
import { useToast } from '../../components/base/useToast';

const toast = useToast();
const data = ref(null);

async function load() {
  const res = await api.get('/settings/permissions');
  data.value = res.data.data;
}
onMounted(load);

function overrideFor(userId, resource) {
  return data.value.overrides.find((o) => o.user_id === userId && o.resource === resource);
}

function roleDefault(user, cap) {
  return cap.defaultRoles.includes(user.role);
}

// One click cycles through: role default -> explicit allow -> explicit deny -> back to role default.
// No form, no dropdown — matches the "usable without training" ask directly.
async function cycle(user, cap) {
  const current = overrideFor(user.id, cap.resource);
  const next = !current ? 'allow' : current.effect === 'allow' ? 'deny' : null;
  await api.put(`/settings/permissions/${user.id}/${cap.resource}`, { effect: next });
  toast.info(next ? `${cap.label}: ${next} for ${user.email}` : `${cap.label}: reset to role default for ${user.email}`);
  await load();
}

function cellState(user, cap) {
  const override = overrideFor(user.id, cap.resource);
  if (override) return override.effect; // 'allow' | 'deny' — explicitly set
  return roleDefault(user, cap) ? 'default-allow' : 'default-deny';
}
</script>

<template>
  <PageHeader title="Permission overrides" subtitle="Grant or revoke one capability for one person, without changing their role. Click a cell to cycle it." />
  <Spinner v-if="!data" />

  <div v-else class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
    <table class="text-sm min-w-full">
      <thead class="bg-slate-50 text-slate-500 text-[12px]">
        <tr>
          <th class="sticky left-0 bg-slate-50 text-left font-medium px-4 py-2.5 min-w-[160px]">User</th>
          <th v-for="cap in data.catalog" :key="cap.resource" class="text-left font-medium px-3 py-2.5 whitespace-nowrap">{{ cap.label }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="user in data.users" :key="user.id">
          <td class="sticky left-0 bg-white px-4 py-3 whitespace-nowrap">
            <p class="text-slate-800">{{ user.first_name ? `${user.first_name} ${user.last_name}` : user.email }}</p>
            <p class="text-[11px] text-slate-400 capitalize">{{ user.role.replace('_', ' ') }}</p>
          </td>
          <td v-for="cap in data.catalog" :key="cap.resource" class="px-3 py-3">
            <button
              class="w-20 h-7 rounded-full text-[11px] font-medium"
              :class="{
                'bg-slate-100 text-slate-400': cellState(user, cap) === 'default-deny',
                'bg-primary-50 text-primary': cellState(user, cap) === 'default-allow',
                'bg-success/15 text-success ring-1 ring-success/40': cellState(user, cap) === 'allow',
                'bg-danger-light text-danger ring-1 ring-danger/40': cellState(user, cap) === 'deny'
              }"
              @click="cycle(user, cap)"
            >
              {{ { 'default-allow': 'Allowed', 'default-deny': 'Blocked', allow: 'Allowed +', deny: 'Blocked \u00d7' }[cellState(user, cap)] }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <p class="text-[12px] text-slate-400 mt-3">Plain "Allowed"/"Blocked" is what the role gives everyone. A ring means it's been specifically changed for that person — click again to clear it back to the role default.</p>
</template>
