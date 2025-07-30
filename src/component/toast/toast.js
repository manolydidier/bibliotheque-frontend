let show;

export const toast = {
  success: (message, options = {}) => show?.({ message, type: "success", ...options }),
  error: (message, options = {}) => show?.({ message, type: "error", ...options }),
  loading: (message, options = {}) => show?.({ message, type: "loading", ...options }),
  custom: (options) => show?.({ ...options }),
  _register: (fn) => {
    console.log('Toast system registered ✅'); // debug
    show = fn;
  },
};
