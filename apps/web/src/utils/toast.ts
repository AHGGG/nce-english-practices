type ToastLevel = "success" | "error" | "warning" | "info";

export const showToast = (message: string, type: ToastLevel = "success") => {
  // Simple console log for now, or implement actual toast context
  // To match legacy behavior, we can create a nice toast component or use 'sonner' / 'react-hot-toast'
  // I actually didn't install a toast library. I can create a simple Context-based toast system.
  console.log(`[TOAST ${type.toUpperCase()}]: ${message}`);
  // Temporary: Alert if important? No, console is fine for MVP step.
};
