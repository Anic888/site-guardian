import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const targetBrowser = process.env.TARGET_BROWSER ?? 'chrome';

export default defineConfig({
  test: {
    setupFiles: ['src/core/__tests__/setup.ts'],
  },
  plugins: [
    react(),
    {
      name: 'build-manifest',
      closeBundle() {
        const outDir = resolve(__dirname, 'dist');

        if (targetBrowser === 'firefox') {
          const base = JSON.parse(
            readFileSync(resolve(__dirname, 'manifest.json'), 'utf-8'),
          );
          const firefoxOverrides = JSON.parse(
            readFileSync(resolve(__dirname, 'manifest.firefox.json'), 'utf-8'),
          );
          const merged = { ...base, ...firefoxOverrides };
          writeFileSync(
            resolve(outDir, 'manifest.json'),
            JSON.stringify(merged, null, 2),
          );
        } else {
          copyFileSync(
            resolve(__dirname, 'manifest.json'),
            resolve(outDir, 'manifest.json'),
          );
        }

        // Copy icons
        const iconsOutDir = resolve(outDir, 'icons');
        mkdirSync(iconsOutDir, { recursive: true });
        for (const size of [16, 32, 48, 128]) {
          try {
            copyFileSync(
              resolve(__dirname, `public/icons/icon-${size}.png`),
              resolve(iconsOutDir, `icon-${size}.png`),
            );
          } catch {
            // Icons may not exist yet during scaffold phase
          }
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
        onboarding: resolve(__dirname, 'src/onboarding/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') {
            return 'background.js';
          }
          if (chunkInfo.name === 'content') {
            return 'content.js';
          }
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
