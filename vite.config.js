import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react(),
    
  ],
  
optimizeDeps: {
    include: ["mammoth/mammoth.browser"],
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      tinymce: '/node_modules/tinymce'
    },
  },
    server: {
    host: '127.0.0.1',
    port: 5173,

     proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
       '/storage': { target: 'http://127.0.0.1:8000', changeOrigin: true },
       "/file-proxy": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
    
  }
});
