import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ai-towerdefence/' : '/',
  root: '.',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
