import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Сайт живёт в корне домена banivyatki.ru: все пути от «/».
  // Подпапку GitHub Pages (/banivyatki-landing/) больше не собираем.
  base: '/',
  build: {
    rollupOptions: {
      // Оба лендинга используют один React-вход и общие ресурсы.
      input: {
        main: resolve(__dirname, 'index.html'),
        syktyvkar: resolve(__dirname, 'syktyvkar/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
      },
    },
  },
})
