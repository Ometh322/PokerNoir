import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Добавьте алиасы для Node.js модулей
      path: 'path-browserify',
      url: 'url',
      util: 'util',
    },
  },
  optimizeDeps: {
    include: ['path-browserify', 'url', 'util'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    host: '0.0.0.0', // Разрешаем подключения со всех IP
    port: 5555, // Стандартный порт Vite
    strictPort: false // Разрешить использовать другой порт если 5173 занят
  }
})
