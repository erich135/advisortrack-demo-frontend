/**
 * Read-only Engineering Change Log context for coding agents.
 * CLI only — do not import this file into the Vite demo bundle.
 *   npm run engineering:context -- --area pipeline
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'advisortrack-demo-frontend';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, '.env.local'));
loadEnvFile(path.join(root, '.env'));

const flag = (name: string): string | undefined => {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

async function main(): Promise<void> {
  const base =
    process.env.ADVISORTRACK_ENGINEERING_LOG_URL?.trim() ||
    'http://127.0.0.1:3000/api/v1/platform/engineering/agent-context';
  const token = process.env.ENGINEERING_CHANGELOG_READ_TOKEN?.trim();
  if (!token) {
    console.error('Engineering Change Log unavailable — required pre-change context could not be loaded.');
    console.error('Set ENGINEERING_CHANGELOG_READ_TOKEN (and optionally ADVISORTRACK_ENGINEERING_LOG_URL).');
    process.exit(1);
  }

  const url = new URL(base);
  url.searchParams.set('repository', flag('--repository') || REPOSITORY);
  const area = flag('--area');
  if (area) url.searchParams.set('area', area);
  const limit = flag('--limit');
  if (limit) url.searchParams.set('limit', limit);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Engineering-Read-Token': token,
    },
  });
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) {
    console.error('Engineering Change Log unavailable — required pre-change context could not be loaded.');
    console.error(`HTTP ${response.status}`);
    process.exit(1);
  }
  console.log(JSON.stringify(body?.data ?? body, null, 2));
}

main().catch((error) => {
  console.error('Engineering Change Log unavailable — required pre-change context could not be loaded.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
