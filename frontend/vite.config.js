import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx'
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf'
          }
          if (id.includes('node_modules/sweetalert2') || id.includes('node_modules/react-toastify') || id.includes('node_modules/react-hot-toast')) {
            return 'vendor-ui'
          }
          if (id.includes('node_modules/react-icons')) {
            return 'vendor-icons'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
