import path from "path"
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Use the automatic JSX runtime (no manual React import needed)
      jsxRuntime: 'automatic',
    }),
    mkcert(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'IIIT Nagpur VMS',
        short_name: 'IIITN VMS',
        description: 'Official IIIT Nagpur VMS. Experience a seamless and secure visitor management process.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      // Cache all static assets and API responses for offline support
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  server: {
    port: 5174,
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  // Pre-bundle ALL heavy deps so Vite doesn't discovery-transform them
  // during dev server startup (eliminates the "optimizing deps..." delay).
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'date-fns',
      'lucide-react',
      '@supabase/supabase-js',
      'react-hook-form',
      'react-hot-toast',
      'react-helmet-async',
      'papaparse',
      'qrcode',
      'uuid',
    ],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    // Split CSS per chunk — avoids one giant CSS file blocking render
    cssCodeSplit: true,
    // Disable compressed size reporting — speeds up builds significantly
    reportCompressedSize: false,
    // No sourcemaps in production — reduces bundle size and build time
    sourcemap: false,
    rollupOptions: {
      output: {
        // Manual chunk splitting — keeps vendor code stable across deploys
        // (long-term browser caching of vendor chunks)
        manualChunks(id) {
          // Core React runtime — smallest, most cached chunk
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor';
          }
          // Supabase — large, changes rarely
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase-vendor';
          }
          // Icons — large but tree-shaken; separate chunk for caching
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          // Utility libraries
          if (id.includes('node_modules/date-fns') ||
              id.includes('node_modules/zustand') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/uuid')) {
            return 'utils-vendor';
          }
          // Heavy async-only libs — only loaded when the feature is used
          if (id.includes('node_modules/papaparse') ||
              id.includes('node_modules/qrcode') ||
              id.includes('node_modules/html5-qrcode')) {
            return 'heavy-vendor';
          }
        },
        // Deterministic chunk names for long-term caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    chunkSizeWarningLimit: 800,
  },
  // esbuild transform options (separate from rollup build options)
  esbuild: {
    // Remove all console.* calls and debugger statements in production
    drop: ['console', 'debugger'],
    // Inline small threshold
    legalComments: 'none',
  },
  envDir: './',
});
