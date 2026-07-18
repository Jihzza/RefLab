import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

const normalizeModuleId = (id: string) => id.replaceAll('\\', '/')

function vendorChunk(id: string) {
  const moduleId = normalizeModuleId(id)
  if (!moduleId.includes('/node_modules/')) return undefined

  if (
    moduleId.includes('/node_modules/react/')
    || moduleId.includes('/node_modules/react-dom/')
    || moduleId.includes('/node_modules/react-router/')
    || moduleId.includes('/node_modules/react-router-dom/')
    || moduleId.includes('/node_modules/scheduler/')
  ) {
    return 'vendor-react'
  }

  if (moduleId.includes('/node_modules/@supabase/')) return 'vendor-supabase'

  if (
    moduleId.includes('/node_modules/i18next/')
    || moduleId.includes('/node_modules/i18next-browser-languagedetector/')
    || moduleId.includes('/node_modules/react-i18next/')
  ) {
    return 'vendor-i18n'
  }

  if (moduleId.includes('/node_modules/lucide-react/')) return 'vendor-icons'
  if (moduleId.includes('/node_modules/swiper/')) return 'vendor-swiper'

  return undefined
}

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
        manualChunks: vendorChunk,
      },
    },
  },
});
