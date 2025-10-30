import { defineConfig } from 'vite'

export default defineConfig({
  // Base URL for production
  base: './',
  
  // Development server configuration
  server: {
    port: 5173,
    open: false, // Don't auto-open in production
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
    devSourcemap: false, // Disable in production
  },
  
  // Preview server config (for production serving)
  preview: {
    port: process.env.PORT || 4173,
    host: '0.0.0.0', // Important for Render
    strictPort: false,
    open: false,
  },
  
  // Optimizations
  optimizeDeps: {
    include: ['xlsx'],
  },
  
  // Define global constants
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})