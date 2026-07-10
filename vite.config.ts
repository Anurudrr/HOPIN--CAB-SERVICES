import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

const hasSentryReleaseConfig = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT,
);

const plugins = [react(), tailwindcss()];

if (hasSentryReleaseConfig) {
  plugins.push(
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT as string,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      telemetry: false,
    }),
  );
}

plugins.push(
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
    manifest: {
      name: 'HopIn - Shared Urban Mobility',
      short_name: 'HopIn',
      description: 'Book shared rides across Indian cities',
      theme_color: '#000000',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait-primary',
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['travel', 'navigation', 'lifestyle'],
      screenshots: [],
      shortcuts: [
        {
          name: 'Book a Ride',
          short_name: 'Book',
          description: 'Book a shared ride',
          url: '/book',
          icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
        },
        {
          name: 'My Dashboard',
          short_name: 'Dashboard',
          description: 'View your bookings',
          url: '/dashboard',
          icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api',
            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
            networkTimeoutSeconds: 10,
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'mapbox-api',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-static',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  }),
);

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    sourcemap: hasSentryReleaseConfig,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['motion/react'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-ui': ['zustand', 'lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
});
