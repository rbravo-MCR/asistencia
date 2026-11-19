import { defineConfig, devices } from '@playwright/test';
import { loadEnvFile } from 'node:process';

loadEnvFile('.env');
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error(
    'Configura TEST_DATABASE_URL con una base terminada en _test.',
  );

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5183', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node --env-file=.env --import tsx apps/api/src/main.ts',
      url: 'http://127.0.0.1:3101/api/health/ready',
      env: {
        PORT: '3101',
        APP_ORIGIN: 'http://127.0.0.1:5183',
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        NOTIFICATION_WORKER_ENABLED: 'true',
        ATTENDANCE_WORKER_ENABLED: 'true',
        ATTENDANCE_EVALUATION_INTERVAL_SECONDS: '1',
      },
      reuseExistingServer: false,
    },
    {
      command:
        'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5183 --strictPort --mode test',
      cwd: './apps/web',
      url: 'http://127.0.0.1:5183',
      env: { API_PROXY_TARGET: 'http://127.0.0.1:3101' },
      reuseExistingServer: false,
    },
  ],
});
