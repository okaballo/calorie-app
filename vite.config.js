import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: the sub-folder the app is served from on GitHub Pages.
export default defineConfig({
  base: '/calorie-app/',
  plugins: [react(), tailwindcss()],
})
