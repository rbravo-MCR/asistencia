import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['apps/api/tests/**/*.test.ts'],
          exclude: ['**/*.integration.test.ts'],
        },
      },
      {
        extends: './apps/web/vite.config.ts',
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['./apps/web/tests/setup.ts'],
          include: ['apps/web/src/**/*.test.tsx', 'apps/web/src/**/*.test.ts'],
        },
      },
    ],
  },
});
