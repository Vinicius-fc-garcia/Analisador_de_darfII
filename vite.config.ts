import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Com @types/node instalado, process.cwd() é reconhecido nativamente
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', // Essencial para GitHub Pages
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    define: {
      // Substitui process.env.API_KEY pelo valor real durante o build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});