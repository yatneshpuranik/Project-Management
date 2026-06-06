export const showToast = (message, type = 'success') => {
  const event = new CustomEvent('app-toast', {
    detail: { message, type, id: Math.random().toString(36).substr(2, 9) }
  });
  window.dispatchEvent(event);
};

export const toast = {
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  info: (msg) => showToast(msg, 'info'),
};
