// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0', // Разрешаем подключения со всех IP
    port: 5555, // Стандартный порт Vite
    strictPort: false // Разрешить использовать другой порт если 5173 занят
  }
});