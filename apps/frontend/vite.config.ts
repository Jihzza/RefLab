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
        // Split large third-party libraries into their own long-cacheable
        // chunks so the main entry chunk stays small. Route-level code
        // splitting (React.lazy in Router.tsx) handles per-page chunks.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("swiper")) return "swiper";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("i18next")) return "i18n";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-router")) return "react-vendor";
          if (
            id.includes("react-dom") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
