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
      // Две страницы: лендинг и /privacy/
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
      },
    },
  },
})
