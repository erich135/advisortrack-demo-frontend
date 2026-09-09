/**
 * Sticky horizontal table scrollbar: overflow detection, placement, and scroll sync.
 * Run: npm run test:sticky-scroll
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const placementSource = fs.readFileSync(
  path.join(root, 'src/lib/stickyHorizontalScroll.ts'),
  'utf8',
);
const componentSource = fs.readFileSync(
  path.join(root, 'src/components/StickyHorizontalScroll.tsx'),
  'utf8',
);
const uiSource = fs.readFileSync(path.join(root, 'src/components/ui.tsx'), 'utf8');
const cssSource = fs.readFileSync(path.join(root, 'src/styles/global.css'), 'utf8');

assert.match(componentSource, /placeStickyHorizontalBar/);
assert.match(componentSource, /isHorizontallyOverflowing/);
assert.match(componentSource, /copyScrollLeft/);
assert.match(componentSource, /ResizeObserver/);
assert.match(uiSource, /StickyHorizontalScroll/);
assert.match(cssSource, /\.sticky-hscroll-bar/);
assert.doesNotMatch(cssSource, /scrollbar-width:\s*none/);

const pages = [
  'src/pages/UsersPage.tsx',
  'src/pages/TeamPipelinePage.tsx',
  'src/pages/ProductionPage.tsx',
  'src/pages/organisationStructurePanels.tsx',
  'src/pages/licencesPanel.tsx',
  'src/pages/AuditPage.tsx',
  'src/pages/AdvisorsPage.tsx',
  'src/pages/AdvisorDetailPage.tsx',
  'src/components/AdvisorProductionTable.tsx',
  'src/pages/InvoicesPage.tsx',
  'src/pages/SubscriptionsPage.tsx',
  'src/pages/SettingsPage.tsx',
  'src/pages/CustomerAccountPage.tsx',
  'src/pages/ReportsPage.tsx',
  'src/pages/PerformancePage.tsx',
  'src/pages/SupportPage.tsx',
  'src/pages/subscriptionEditor.tsx',
  'src/pages/TeamPipelineDemoPage.tsx',
];

for (const file of pages) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  assert.match(source, /StickyHorizontalScroll/, `${file} should use StickyHorizontalScroll`);
  assert.doesNotMatch(source, /className="table-wrap"/, `${file} should not keep a raw table-wrap`);
}

assert.match(placementSource, /scrollWidth > el\.clientWidth/);

const wrapRect = { top: 80, left: 248, width: 900, bottom: 2400 };

const { copyScrollLeft, isHorizontallyOverflowing, placeStickyHorizontalBar } = await import(
  '../src/lib/stickyHorizontalScroll'
);

assert.equal(isHorizontallyOverflowing({ scrollWidth: 1200, clientWidth: 800 }), true);
assert.equal(isHorizontallyOverflowing({ scrollWidth: 800, clientWidth: 800 }), false);
assert.equal(isHorizontallyOverflowing({ scrollWidth: 801, clientWidth: 800 }), false);
assert.equal(isHorizontallyOverflowing({ scrollWidth: 802, clientWidth: 800 }), true);

const atTop = placeStickyHorizontalBar({
  wrapRect,
  overflowing: true,
  headerBottom: 60,
  viewportBottom: 800,
  barHeight: 14,
});
assert.equal(atTop.visible, true);
assert.equal(atTop.left, 248);
assert.equal(atTop.width, 900);
assert.equal(atTop.top, 786);

const halfway = placeStickyHorizontalBar({
  wrapRect: { top: -400, left: 248, width: 900, bottom: 1920 },
  overflowing: true,
  headerBottom: 60,
  viewportBottom: 800,
  barHeight: 14,
});
assert.equal(halfway.visible, true);
assert.equal(halfway.top, 786);

const pastTable = placeStickyHorizontalBar({
  wrapRect: { top: -2000, left: 248, width: 900, bottom: 40 },
  overflowing: true,
  headerBottom: 60,
  viewportBottom: 800,
  barHeight: 14,
});
assert.equal(pastTable.visible, false);

const belowViewport = placeStickyHorizontalBar({
  wrapRect: { top: 900, left: 248, width: 900, bottom: 2400 },
  overflowing: true,
  headerBottom: 60,
  viewportBottom: 800,
  barHeight: 14,
});
assert.equal(belowViewport.visible, false);

const nativeInView = placeStickyHorizontalBar({
  wrapRect: { top: 120, left: 248, width: 900, bottom: 640 },
  overflowing: true,
  headerBottom: 60,
  viewportBottom: 800,
  barHeight: 14,
});
assert.equal(nativeInView.visible, false);

const noOverflow = placeStickyHorizontalBar({
  wrapRect,
  overflowing: false,
  headerBottom: 60,
  viewportBottom: 800,
  barHeight: 14,
});
assert.equal(noOverflow.visible, false);

const source = { scrollLeft: 120 };
const target = { scrollLeft: 0 };
assert.equal(copyScrollLeft(source, target), true);
assert.equal(target.scrollLeft, 120);
assert.equal(copyScrollLeft(source, target), false);

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:5174/',
  pretendToBeVisual: true,
});
const win = dom.window;
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(win, 'innerHeight', { configurable: true, value: 800 });
Object.defineProperty(win, 'innerWidth', { configurable: true, value: 1280 });
Object.defineProperty(win, 'visualViewport', { configurable: true, value: undefined });
win.ResizeObserver = ResizeObserverStub;
Object.defineProperties(globalThis, {
  window: { value: win, configurable: true },
  document: { value: win.document, configurable: true },
  navigator: { value: win.navigator, configurable: true },
  HTMLElement: { value: win.HTMLElement, configurable: true },
  Node: { value: win.Node, configurable: true },
  DocumentFragment: { value: win.DocumentFragment, configurable: true },
  MutationObserver: { value: win.MutationObserver, configurable: true },
  ResizeObserver: { value: ResizeObserverStub, configurable: true },
  getComputedStyle: { value: win.getComputedStyle.bind(win), configurable: true },
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { createElement: h, StrictMode } = await import('react');
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { StickyHorizontalScroll } = await import('../src/components/StickyHorizontalScroll');

const mountNode = win.document.createElement('div');
win.document.body.appendChild(mountNode);
const rootNode = createRoot(mountNode);

const rows = Array.from({ length: 58 }, (_, index) =>
  h('tr', { key: String(index) }, [
    h('td', { key: 'name' }, `Advisor ${index + 1}`),
    h('td', { key: 'email' }, `advisor${index + 1}@example.com`),
    h('td', { key: 'role' }, 'Financial Advisor'),
    h('td', { key: 'team' }, 'Northstar'),
    h('td', { key: 'region' }, 'Gauteng'),
    h('td', { key: 'licence' }, 'Licensed'),
    h('td', { key: 'status' }, 'Active'),
    h('td', { key: 'actions' }, 'Edit'),
  ]),
);

await act(async () => {
  rootNode.render(
    h(StrictMode, null, h(StickyHorizontalScroll, null, [
      h('table', { key: 'table', className: 'data', style: { minWidth: 1400 } }, [
        h('tbody', { key: 'body' }, rows),
      ]),
    ])),
  );
});

const wrap = mountNode.querySelector('.table-wrap');
const bar = mountNode.querySelector('[data-testid="sticky-hscroll-bar"]');
assert.ok(wrap instanceof win.HTMLElement);
assert.ok(bar instanceof win.HTMLElement);

let scrollWidth = 1400;
let wrapScrollLeft = 0;
let barScrollLeft = 0;
Object.defineProperty(wrap, 'scrollWidth', { configurable: true, get: () => scrollWidth });
Object.defineProperty(wrap, 'clientWidth', { configurable: true, get: () => 800 });
Object.defineProperty(wrap, 'scrollLeft', {
  configurable: true,
  get: () => wrapScrollLeft,
  set: (value: number) => { wrapScrollLeft = Number(value); },
});
Object.defineProperty(bar, 'scrollLeft', {
  configurable: true,
  get: () => barScrollLeft,
  set: (value: number) => { barScrollLeft = Number(value); },
});
wrap.getBoundingClientRect = () => ({
  top: 80,
  left: 248,
  width: 800,
  height: 2320,
  bottom: 2400,
  right: 1048,
  x: 248,
  y: 80,
  toJSON() { return this; },
});

await act(async () => {
  wrap.dispatchEvent(new win.Event('scroll', { bubbles: true }));
  win.dispatchEvent(new win.Event('resize'));
});

assert.equal(bar.getAttribute('data-overflowing'), 'true');
assert.equal(bar.getAttribute('data-visible'), 'true');
assert.equal(bar.style.left, '248px');
assert.equal(bar.style.width, '800px');

await act(async () => {
  wrapScrollLeft = 240;
  wrap.dispatchEvent(new win.Event('scroll', { bubbles: true }));
});
assert.equal(barScrollLeft, 240);

await act(async () => {
  barScrollLeft = 80;
  bar.dispatchEvent(new win.Event('scroll', { bubbles: true }));
});
assert.equal(wrapScrollLeft, 80);

wrap.getBoundingClientRect = () => ({
  top: -2200,
  left: 248,
  width: 800,
  height: 2320,
  bottom: 40,
  right: 1048,
  x: 248,
  y: -2200,
  toJSON() { return this; },
});
await act(async () => {
  win.dispatchEvent(new win.Event('scroll'));
});
assert.equal(bar.getAttribute('data-visible'), 'false');

scrollWidth = 800;
await act(async () => {
  win.dispatchEvent(new win.Event('resize'));
});
assert.equal(bar.getAttribute('data-overflowing'), 'false');
assert.equal(bar.getAttribute('data-visible'), 'false');

await act(async () => {
  rootNode.unmount();
});

console.log('sticky horizontal scrollbar checks passed');
