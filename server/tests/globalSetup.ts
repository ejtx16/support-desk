import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DB_URL = 'file:./test.db';
const serverRoot = join(__dirname, '..');

/** Recreates an empty, fully-migrated SQLite database before the test run. */
export default function setup() {
  for (const file of ['test.db', 'test.db-journal']) {
    rmSync(join(serverRoot, 'prisma', file), { force: true });
  }

  execSync('npx prisma migrate deploy', {
    cwd: serverRoot,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'ignore',
  });

  return () => {
    rmSync(join(serverRoot, 'prisma', 'test.db'), { force: true });
  };
}
