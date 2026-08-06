<script setup>
import { ref, computed } from 'vue';

// columns: [{ key, label, sortable? }]
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  emptyText: { type: String, default: 'Nothing here yet' }
});

const sortKey = ref(null);
const sortDir = ref(1);

function sortBy(key) {
  if (sortKey.value === key) sortDir.value *= -1;
  else { sortKey.value = key; sortDir.value = 1; }
}

const sortedRows = computed(() => {
  if (!sortKey.value) return props.rows;
  return [...props.rows].sort((a, b) => {
    const av = a[sortKey.value], bv = b[sortKey.value];
    return av > bv ? sortDir.value : av < bv ? -sortDir.value : 0;
  });
});
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-slate-50 text-slate-500 text-[12px]">
        <tr>
          <th
            v-for="col in columns"
            :key="col.key"
            class="text-left font-medium px-4 py-2.5"
            :class="col.sortable ? 'cursor-pointer select-none' : ''"
            @click="col.sortable && sortBy(col.key)"
          >
            {{ col.label }}
            <span v-if="sortKey === col.key">{{ sortDir === 1 ? '\u2191' : '\u2193' }}</span>
          </th>
          <th v-if="$slots.actions"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-if="!sortedRows.length">
          <td :colspan="columns.length + 1" class="px-4 py-8 text-center text-slate-400 text-sm">{{ emptyText }}</td>
        </tr>
        <tr v-for="row in sortedRows" :key="row.id" class="hover:bg-slate-50">
          <td v-for="col in columns" :key="col.key" class="px-4 py-3 text-slate-700">
            <slot :name="`cell-${col.key}`" :row="row">{{ row[col.key] }}</slot>
          </td>
          <td v-if="$slots.actions" class="px-4 py-3 text-right">
            <slot name="actions" :row="row" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
