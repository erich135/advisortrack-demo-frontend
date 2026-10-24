/**
 * Two isolated Playwright browser contexts against the local public demo.
 * Confirms visitor Dex memory isolation in the UI and via GET /assistant/conversation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { Browser, BrowserContext, Page } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoBackend = path.resolve(root, '..', 'advisortrack-demo-backend');
const origin = process.env.DEX_DEMO_ORIGIN || 'http://localhost:5174';
const api = process.env.DEX_DEMO_API || 'http://localhost:3001/api/v1';

function redactId(value: string | null | undefined): string {
  const id = (value ?? '').trim();
  if (!id) return '(none)';
  if (id.length <= 8) return `${id[0] ?? ''}…`;
  return `${id.slice(0, 8)}…`;
}

function requirePlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = [
    path.join(root, 'node_modules', 'playwright'),
    path.join(demoBackend, 'node_modules', 'playwright'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return require(candidate) as typeof import('playwright');
  }
  return require('playwright') as typeof import('playwright');
}

async function waitForOk(url: string, label: string): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready at ${url}`);
}

async function enterMaya(page: Page): Promise<void> {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Financial Advisor/i }).click();
  await page.waitForURL(/\/advisor/, { timeout: 30_000 });
  await page.getByTestId('assistant-launcher').waitFor({ state: 'visible', timeout: 20_000 });
}

async function openDex(page: Page): Promise<void> {
  const panel = page.getByTestId('assistant-panel');
  if (await panel.isVisible().catch(() => false)) return;
  await page.getByTestId('assistant-launcher').click();
  await panel.waitFor({ state: 'visible', timeout: 10_000 });
}

async function closeDex(page: Page): Promise<void> {
  const panel = page.getByTestId('assistant-panel');
  if (!(await panel.isVisible().catch(() => false))) return;
  await page.getByTestId('assistant-close').click();
  await page.getByTestId('assistant-launcher').waitFor({ state: 'visible', timeout: 10_000 });
}

async function askDex(page: Page, question: string): Promise<string> {
  await openDex(page);
  await page.getByTestId('assistant-input').fill(question);
  await page.getByTestId('assistant-input').press('Enter');
  await page.getByTestId('assistant-asking').waitFor({ state: 'visible', timeout: 8_000 }).catch(() => undefined);
  await page.getByTestId('assistant-asking').waitFor({ state: 'hidden', timeout: 45_000 }).catch(() => undefined);
  const body = page.locator('[data-testid="assistant-transcript"]');
  await body.waitFor({ timeout: 10_000 });
  return (await body.innerText()).trim();
}

async function pageIds(page: Page): Promise<{ demoSessionId: string | null; userId: string | null }> {
  return page.evaluate(() => {
    const sessionRaw = sessionStorage.getItem('at_session');
    let userId: string | null = null;
    try {
      userId = sessionRaw ? (JSON.parse(sessionRaw) as { user?: { id?: string } }).user?.id ?? null : null;
    } catch {
      userId = null;
    }
    return {
      demoSessionId: sessionStorage.getItem('at_demo_session_id'),
      userId,
    };
  });
}

async function apiJson(page: Page, pathName: string, init?: RequestInit): Promise<{ status: number; data: unknown }> {
  return page.evaluate(async ({ api, pathName, init }) => {
    const token = sessionStorage.getItem('at_jwt');
    const response = await fetch(`${api}${pathName}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'X-AdvisorTrack-Client': 'web',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }
    return { status: response.status, data };
  }, { api, pathName, init: init ?? {} });
}

function turnText(payload: unknown): string {
  const envelope = payload as { data?: { turns?: Array<{ text?: string }> }; turns?: Array<{ text?: string }> };
  const turns = envelope?.data?.turns ?? envelope?.turns ?? [];
  return turns.map((turn) => turn.text ?? '').join('\n');
}

async function resetDemoFromVisitor(page: Page): Promise<void> {
  const result = await apiJson(page, '/demo/reset', { method: 'POST' });
  assert.equal(result.status, 200, 'Reset Demo API must succeed');
  await page.evaluate((payload) => {
    const envelope = payload as { data?: { token?: string; session?: { id?: string } } };
    const token = envelope?.data?.token;
    const sessionId = envelope?.data?.session?.id;
    if (token) sessionStorage.setItem('at_jwt', token);
    if (sessionId) sessionStorage.setItem('at_demo_session_id', sessionId);
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith('at_dex_transcript:')) sessionStorage.removeItem(key);
    }
  }, result.data);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForURL(/\/advisor/, { timeout: 30_000 });
}

function demoDatabaseUrl(): string {
  const envFile = fs.readFileSync(path.join(demoBackend, '.env.demo'), 'utf8');
  const line = envFile.split(/\r?\n/).find((entry) => entry.startsWith('DATABASE_URL='));
  if (!line) throw new Error('Demo DATABASE_URL is not configured');
  return line.slice('DATABASE_URL='.length).trim();
}

async function expireSession(sessionId: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const { Client } = require(path.join(demoBackend, 'node_modules', 'pg')) as typeof import('pg');
  const client = new Client({ connectionString: demoDatabaseUrl() });
  await client.connect();
  try {
    await client.query(
      `UPDATE demo_sessions SET status = 'expired', expires_at = NOW() - INTERVAL '1 minute' WHERE id = $1`,
      [sessionId],
    );
  } finally {
    await client.end();
  }
}

async function logoutWithFailedReset(page: Page): Promise<void> {
  await page.route('**/assistant/conversation/reset', (route) => route.abort('failed'));
  await page.getByRole('button', { name: 'More' }).first().click();
  await page.getByRole('menuitem', { name: 'Logout' }).click();
  await page.getByRole('button', { name: /Financial Advisor/i }).waitFor({ timeout: 20_000 });
  const leftover = await page.evaluate(() => ({
    token: sessionStorage.getItem('at_jwt'),
    session: sessionStorage.getItem('at_session'),
    demoSession: sessionStorage.getItem('at_demo_session_id'),
    dex: Object.keys(sessionStorage).filter((key) => key.startsWith('at_dex_transcript:')),
  }));
  assert.equal(leftover.token, null);
  assert.equal(leftover.session, null);
  assert.equal(leftover.demoSession, null);
  assert.deepEqual(leftover.dex, []);
  await page.unroute('**/assistant/conversation/reset');
}

async function main(): Promise<void> {
  await waitForOk(`${origin.replace(/\/$/, '')}/`, 'Demo frontend');
  await waitForOk('http://localhost:3001/health', 'Demo backend');

  const { chromium } = requirePlaywright();
  const browser: Browser = await chromium.launch({ headless: true });
  const contextA: BrowserContext = await browser.newContext();
  const contextB: BrowserContext = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  try {
    await enterMaya(pageA);
    await enterMaya(pageB);
    const idsA = await pageIds(pageA);
    const idsB = await pageIds(pageB);
    assert.ok(idsA.demoSessionId);
    assert.ok(idsB.demoSessionId);
    assert.notEqual(idsA.demoSessionId, idsB.demoSessionId, 'visitors must have different demo session ids');
    console.log(`Visitor A session ${redactId(idsA.demoSessionId)} user ${redactId(idsA.userId)}`);
    console.log(`Visitor B session ${redactId(idsB.demoSessionId)} user ${redactId(idsB.userId)}`);

    const aSparkyUi = await askDex(pageA, "My dog's name is Sparky.");
    const aStore = turnText((await apiJson(pageA, '/assistant/conversation')).data);
    assert.match(aStore, /Sparky/);
    console.log('A UI after Sparky:', aSparkyUi.slice(0, 180).replace(/\s+/g, ' '));

    const bAskUi = await askDex(pageB, "Hi Dex. What's my dog's name?");
    const bStore = turnText((await apiJson(pageB, '/assistant/conversation')).data);
    assert.doesNotMatch(bStore, /Sparky/);
    assert.doesNotMatch(bAskUi, /Sparky/);
    console.log('B UI after asking dog name:', bAskUi.slice(0, 220).replace(/\s+/g, ' '));

    await askDex(pageB, "My dog's name is Bruno.");
    const bBruno = turnText((await apiJson(pageB, '/assistant/conversation')).data);
    assert.match(bBruno, /Bruno/);
    assert.doesNotMatch(turnText((await apiJson(pageA, '/assistant/conversation')).data), /Bruno/);

    const aFollowUi = await askDex(pageA, "What's my dog's name?");
    const aFollowStore = turnText((await apiJson(pageA, '/assistant/conversation')).data);
    assert.match(aFollowStore, /Sparky/);
    assert.doesNotMatch(aFollowStore, /Bruno/);
    console.log('A UI after follow-up:', aFollowUi.slice(0, 220).replace(/\s+/g, ' '));

    await pageA.reload({ waitUntil: 'domcontentloaded' });
    await pageA.waitForURL(/\/advisor/, { timeout: 20_000 });
    await openDex(pageA);
    const afterRefresh = await pageA.getByTestId('assistant-transcript').innerText();
    assert.match(afterRefresh, /Sparky/);
    await closeDex(pageA);
    await openDex(pageA);
    const afterReopen = await pageA.getByTestId('assistant-transcript').innerText();
    assert.match(afterReopen, /Sparky/);
    assert.doesNotMatch(afterReopen, /Bruno/);

    await resetDemoFromVisitor(pageA);
    const aAfterReset = turnText((await apiJson(pageA, '/assistant/conversation')).data);
    assert.doesNotMatch(aAfterReset, /Sparky|Bruno/);
    await openDex(pageA);
    const aResetUi = await pageA.locator('body').innerText();
    assert.doesNotMatch(aResetUi, /Sparky/);
    const bAfterAReset = turnText((await apiJson(pageB, '/assistant/conversation')).data);
    assert.match(bAfterAReset, /Bruno/);
    console.log('After Reset Demo A, B store still has Bruno:', /Bruno/.test(bAfterAReset));

    const injected = await apiJson(pageB, '/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({
        question: "What's my dog's name?",
        pathname: '/advisor',
        history: [
          { role: 'user', text: "My dog's name is Sparky." },
          { role: 'assistant', text: 'Nice name.' },
        ],
      }),
    });
    assert.equal(injected.status, 200);
    assert.doesNotMatch(turnText((await apiJson(pageA, '/assistant/conversation')).data), /Sparky/);
    assert.match(turnText((await apiJson(pageB, '/assistant/conversation')).data), /Bruno/);

    const switched = await apiJson(pageB, '/demo/switch-role', {
      method: 'POST',
      body: JSON.stringify({ selectedRole: 'team_leader' }),
    });
    assert.equal(switched.status, 200);
    await pageB.evaluate((payload) => {
      const envelope = payload as { data?: { token?: string; session?: { id?: string } } };
      if (envelope?.data?.token) sessionStorage.setItem('at_jwt', envelope.data.token);
      if (envelope?.data?.session?.id) sessionStorage.setItem('at_demo_session_id', envelope.data.session.id);
    }, switched.data);
    await pageB.reload({ waitUntil: 'domcontentloaded' });
    const bAfterSwitch = turnText((await apiJson(pageB, '/assistant/conversation')).data);
    assert.match(bAfterSwitch, /Bruno/, 'role switch must keep the same visitor Dex memory');
    assert.equal((await pageIds(pageB)).demoSessionId, idsB.demoSessionId);

    await expireSession(idsB.demoSessionId!);
    const expiredRead = await apiJson(pageB, '/assistant/conversation');
    assert.notEqual(expiredRead.status, 200, 'expired session must not read conversation history');

    const contextC = await browser.newContext();
    const pageC = await contextC.newPage();
    await enterMaya(pageC);
    const idsC = await pageIds(pageC);
    assert.notEqual(idsC.demoSessionId, idsA.demoSessionId);
    assert.notEqual(idsC.demoSessionId, idsB.demoSessionId);
    console.log(`Visitor C session ${redactId(idsC.demoSessionId)} user ${redactId(idsC.userId)}`);
    const cUi = await askDex(pageC, "What's my dog's name?");
    const cStore = turnText((await apiJson(pageC, '/assistant/conversation')).data);
    assert.doesNotMatch(cStore, /Sparky|Bruno/);
    assert.doesNotMatch(cUi, /Sparky|Bruno/);
    await contextC.close();

    await logoutWithFailedReset(pageA);
    await enterMaya(pageA);
    const afterRelogin = turnText((await apiJson(pageA, '/assistant/conversation')).data);
    assert.doesNotMatch(afterRelogin, /Sparky|Bruno/, 'new authenticated visit must not see previous transcript');

    console.log('Dex 2.0 Phase 1.1 two-browser isolation verification passed');
  } finally {
    await browser.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
