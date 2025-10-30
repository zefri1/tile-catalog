import { defineConfig } from 'vite'

export default defineConfig({
  // Development server configuration
  server: {
    port: 5173,
    open: true,
    cors: true,
    strictPort: false,
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: 'es2015',
    
    // Optimize assets
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['xlsx'],
        },
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.')[1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            extType = 'img';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // CSS optimization
    cssCodeSplit: true,
    
    // Terser options for better minification
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // CSS preprocessing
  css: {
    devSourcemap: true,
  },
  
  // Base URL for production
  base: './',
  
  // Asset handling
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg'],
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  
  // Preview server config (for npm run preview)
  preview: {
    port: 4173,
    strictPort: false,
    open: true,
  },
  
  // Optimizations
  optimizeDeps: {
    include: ['xlsx'],
  },
})