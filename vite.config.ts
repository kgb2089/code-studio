import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'strip-crossorigin-same-origin',
      transformIndexHtml: {
        order: 'post',
        handler(html) {
          return html.replace(/ crossorigin/g, '');
        },
      },
    },
  ],
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    exclude: ['@yowasp/clang', 'pyodide'],
  },
  build: {
    target: ['es2019', 'safari14'],
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            'codemirror',
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/language',
            '@codemirror/commands',
            '@codemirror/autocomplete',
            '@codemirror/search',
            '@codemirror/lint',
            '@codemirror/lang-python',
            '@codemirror/lang-cpp',
            '@codemirror/theme-one-dark',
          ],
          vendor: ['react', 'react-dom', 'lucide-react', 'idb', 'jszip'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    cors: true,
  },
  preview: {
    host: true,
    port: 4173,
    cors: true,
  },
});
