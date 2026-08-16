import { ref } from 'vue';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

const toasts = ref<ToastMessage[]>([]);

export function useToast() {
  const show = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = {
      id,
      duration: 4000,
      ...toast
    };
    toasts.value.push(newToast);

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, newToast.duration);
    }
    return id;
  };

  const dismiss = (id: string) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  return {
    toasts,
    show,
    dismiss,
    success: (title: string, message?: string) => show({ type: 'success', title, ...(message ? { message } : {}) }),
    error: (title: string, message?: string) => show({ type: 'error', title, ...(message ? { message } : {}) }),
    info: (title: string, message?: string) => show({ type: 'info', title, ...(message ? { message } : {}) }),
    warning: (title: string, message?: string) => show({ type: 'warning', title, ...(message ? { message } : {}) })
  };
}
