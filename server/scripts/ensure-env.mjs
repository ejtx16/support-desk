// Creates server/.env from .env.example on first install so the app runs out of the box.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log('[setup] Created server/.env from .env.example');
} else {
  console.log('[setup] server/.env already exists - keeping it');
}
