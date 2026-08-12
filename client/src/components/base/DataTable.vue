<script setup>
import { ref, computed, watch } from 'vue';

// columns: [{ key, label, sortable? }]
const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  emptyText: { type: String, default: 'Nothing here yet' },
  searchable: { type: Boolean, default: false },
  searchKeys: { type: Array, default: () => [] }, // which row fields the search box matches against
  pageSize: { type: Number, default: 10 }
});

const sortKey = ref(null);
const sortDir = ref(1);
const search = ref('');
const page = ref(1);

function sortBy(key) {
  if (sortKey.value === key) sortDir.value *= -1;
  else { sortKey.value = key; sortDir.value = 1; }
}

const filteredRows = computed(() => {
  if (!props.searchable || !search.value.trim()) return props.rows;
  const q = search.value.trim().toLowerCase();
  const keys = props.searchKeys.length ? props.searchKeys : props.columns.map((c) => c.key);
  return props.rows.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
});

const sortedRows = computed(() => {
  if (!sortKey.value) return filteredRows.value;
  return [...filteredRows.value].sort((a, b) => {
    const av = a[sortKey.value], bv = b[sortKey.value];
    return av > bv ? sortDir.value : av < bv ? -sortDir.value : 0;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / props.pageSize)));
const pagedRows = computed(() => {
  const start = (page.value - 1) * props.pageSize;
  return sortedRows.value.slice(start, start + props.pageSize);
});

// Reset to page 1 whenever the filtered/sorted set changes size — avoids landing on an empty page.
watch([search, () => props.rows.length], () => { page.value = 1; });
</script>

<template>
  <div>
    <div v-if="searchable" class="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 h-9 mb-3 max-w-xs">
      <span class="text-slate-400 text-[14px]" aria-hidden="true">&#128269;</span>
      <input v-model="search" type="text" placeholder="Search" class="text-[13px] outline-none w-full text-slate-700 placeholder:text-slate-400" />
    </div>

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
          <tr v-if="!pagedRows.length">
            <td :colspan="columns.length + 1" class="px-4 py-8 text-center text-slate-400 text-sm">{{ search ? 'No matches' : emptyText }}</td>
          </tr>
          <tr v-for="row in pagedRows" :key="row.id" class="hover:bg-slate-50">
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

    <div v-if="sortedRows.length > pageSize" class="flex items-center justify-between mt-3 text-[13px] text-slate-500">
      <span>{{ (page - 1) * pageSize + 1 }}\u2013{{ Math.min(page * pageSize, sortedRows.length) }} of {{ sortedRows.length }}</span>
      <div class="flex gap-1">
        <button :disabled="page === 1" class="px-2.5 h-7 rounded border border-slate-200 disabled:opacity-40" @click="page--">&larr;</button>
        <button :disabled="page === totalPages" class="px-2.5 h-7 rounded border border-slate-200 disabled:opacity-40" @click="page++">&rarr;</button>
      </div>
    </div>
  </div>
</template>
