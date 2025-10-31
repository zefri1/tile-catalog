import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  server: { port: 5173, open: false, cors: true, strictPort: false },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').pop();
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) extType = 'img';
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/chunk-[hash].js',
        entryFileNames: 'assets/js/main-[hash].js',
      },
    },
    cssCodeSplit: true,
    terserOptions: { compress: { drop_console: true, drop_debugger: true } },
  },
  css: { devSourcemap: false },
  preview: { port: process.env.PORT || 4173, host: '0.0.0.0', strictPort: false, open: false },
  // Нативный CSV парсер - внешние зависимости больше не нужны
  optimizeDeps: { include: [] },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})