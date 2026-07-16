import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 仅在本地开发（未设置 VITE_API_BASE）时启用 vite 代理到本地后端
const useLocalProxy = !process.env.VITE_API_BASE;

export default defineConfig({
  plugins: [react()],
  // 构建产物输出到 dist（Vercel 默认读取此目录）
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/xlsx')) return 'xlsx';
          if (id.includes('node_modules/antd') || id.includes('node_modules/@ant-design')) return 'antd';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) return 'react-vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: useLocalProxy
      ? {
          '/api': 'http://localhost:4000',
        }
      : undefined,
  },
});
