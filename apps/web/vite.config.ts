import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

// BASE: su GitHub Pages il sito vive in /<repo>/ (es. /poker-school/).
// In locale e con dominio dedicato resta "/".
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('gsap')) return 'gsap'
            if (id.includes('motion') || id.includes('framer')) return 'motion'
            if (id.includes('react-router')) return 'router'
          }
        },
      },
    },
  },
})
