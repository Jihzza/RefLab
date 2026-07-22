import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
          if (id.includes('i18next')) return 'i18n'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('swiper')) return 'swiper'
          return undefined
        },
      },
    },
  },
});
