import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'src/app/app.spec.ts',
      'src/app/dashboard/dashboard.component.spec.ts',
      'src/app/layout/footer/footer.component.spec.ts',
      'src/app/layout/sidebar/sidebar.component.spec.ts',
      'src/app/core/services/auth.service.simple.spec.ts',
    ],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test-setup.ts',
        '**/*.d.ts',
        '**/*.config.*',
        'src/app/app.spec.ts',
        'src/app/dashboard/dashboard.component.spec.ts',
        'src/app/layout/footer/footer.component.spec.ts',
        'src/app/layout/sidebar/sidebar.component.spec.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
