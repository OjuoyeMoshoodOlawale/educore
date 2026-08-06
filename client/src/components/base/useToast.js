import { reactive } from 'vue';

const toasts = reactive([]);
let nextId = 1;

const COLORS = {
  success: { border: 'border-success', text: 'text-success' },
  error: { border: 'border-danger', text: 'text-danger' },
  warning: { border: 'border-accent', text: 'text-accent' },
  info: { border: 'border-primary', text: 'text-primary' }
};

export function useToast() {
  function show(variant, message) {
    const id = nextId++;
    toasts.push({ id, variant, message, ...COLORS[variant] });
    if (variant === 'success' || variant === 'info') {
      setTimeout(() => dismiss(id), 4000);
    }
  }
  function dismiss(id) {
    const i = toasts.findIndex((t) => t.id === id);
    if (i !== -1) toasts.splice(i, 1);
  }
  return {
    toasts,
    dismiss,
    success: (m) => show('success', m),
    error: (m) => show('error', m),
    warning: (m) => show('warning', m),
    info: (m) => show('info', m)
  };
}
