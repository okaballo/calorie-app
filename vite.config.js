import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' keeps every URL relative, so the built app works from a domain
// root or from a sub-folder (e.g. GitHub Pages) without changes.
export default defineConfig({
  base: '/calorie-app/',
  plugins: [react(), tailwindcss()],
  // "@/..." = "src/...", the import style shadcn components use.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
