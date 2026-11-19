import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Integration tests share one SQLite file, so run test files sequentially.
    fileParallelism: false,
    globalSetup: ['tests/globalSetup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'queuedesk-test-secret-0123456789',
    },
  },
});
