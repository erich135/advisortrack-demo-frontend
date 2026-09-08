/**
 * Interaction tests: advisor name clicks must navigate to Advisor Details.
 * Run: npm run test:advisor-drilldown
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const MAYA_ID = '11111111-1111-4111-8111-111111111111';
const CARA_ID = '22222222-2222-4222-8222-222222222222';
const SIPHO_ID = '33333333-3333-4333-8333-333333333333';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost:5174/',
  pretendToBeVisual: true,
});
const win = dom.window;
Object.defineProperties(globalThis, {
  window: { value: win, configurable: true },
  document: { value: win.document, configurable: true },
  navigator: { value: win.navigator, configurable: true },
  HTMLElement: { value: win.HTMLElement, configurable: true },
  Node: { value: win.Node, configurable: true },
  DocumentFragment: { value: win.DocumentFragment, configurable: true },
  MutationObserver: { value: win.MutationObserver, configurable: true },
  getComputedStyle: { value: win.getComputedStyle.bind(win), configurable: true },
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { createElement: h, StrictMode } = await import('react');
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const {
  createMemoryRouter,
  RouterProvider,
  Outlet,
  useLocation,
  useParams,
  useSearchParams,
  Link,
} = await import('react-router-dom');
const { AdvisorNameLink } = await import('../src/components/AdvisorNameLink');
const { AdvisorProductionTable } = await import('../src/components/AdvisorProductionTable');
const {
  parseAdvisorReturnPath,
  advisorReturnBackLabel,
  advisorDetailsPath,
} = await import('../src/lib/pipelineReturnPath');
const { isFinancialAdvisor, financialAdvisorsInScope } = await import('../src/lib/financialAdvisors');

function Shell() {
  const location = useLocation();
  return h('div', null, [
    h('div', { key: 'loc', 'data-testid': 'location' }, `${location.pathname}${location.search}`),
    h(Outlet, { key: 'outlet' }),
  ]);
}

function DetailsScreen() {
  const { id } = useParams();
  const [search] = useSearchParams();
  const returnPath = parseAdvisorReturnPath(search.get('return'));
  return h('div', null, [
    h('div', { key: 'id', 'data-testid': 'advisor-id' }, id ?? ''),
    h(Link, { key: 'back', to: returnPath || '/advisors', className: 'back-link' }, advisorReturnBackLabel(returnPath)),
  ]);
}

async function mount(initialEntry: string, screen: ReturnType<typeof h>) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: h(Shell),
        children: [
          { index: true, element: screen },
          { path: 'advisors', element: screen },
          { path: 'team-pipeline', element: screen },
          { path: 'advisors/:id', element: h(DetailsScreen) },
        ],
      },
    ],
    { initialEntries: [initialEntry] }
  );
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(h(StrictMode, null, h(RouterProvider, { router })));
  });
  return {
    host,
    clickName: async (name: string) => {
      const links = [...host.querySelectorAll('a.table-link')] as HTMLAnchorElement[];
      const match = links.find((link) => (link.textContent ?? '').trim() === name);
      assert.ok(match, `expected clickable table-link for ${name}, got ${links.map((l) => l.textContent).join(',')}`);
      await act(async () => {
        match.click();
      });
    },
    location: () => host.querySelector('[data-testid="location"]')?.textContent ?? '',
    advisorId: () => host.querySelector('[data-testid="advisor-id"]')?.textContent ?? '',
    backText: () => host.querySelector('a.back-link')?.textContent ?? '',
    clickBack: async () => {
      const back = host.querySelector('a.back-link') as HTMLAnchorElement | null;
      assert.ok(back, 'expected back link');
      await act(async () => {
        back.click();
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      host.remove();
    },
  };
}

const mayaAdvisor = {
  userId: MAYA_ID,
  firstName: 'Maya',
  lastName: 'Brooks',
  issuedAmount: 341750,
  nonIssuedAmount: 0,
  goalAmount: 300000,
  attainmentPercent: 114,
};

const dashboard = await mount(
  '/',
  h(AdvisorProductionTable, {
    advisors: [mayaAdvisor],
    membersById: new Map(),
  })
);
assert.equal(dashboard.host.querySelector('div.nm')?.textContent?.trim(), 'Maya Brooks');
assert.ok(dashboard.host.querySelector('a.table-link'), 'Dashboard name is an anchor, not plain text');
assert.doesNotMatch(dashboard.host.querySelector('div.nm')?.innerHTML ?? '', /^Maya Brooks$/);
assert.equal(
  dashboard.host.querySelector('a.table-link')?.getAttribute('href'),
  advisorDetailsPath(MAYA_ID, '/')
);
await dashboard.clickName('Maya Brooks');
assert.equal(dashboard.location(), `/advisors/${MAYA_ID}?return=${encodeURIComponent('/')}`);
assert.equal(dashboard.advisorId(), MAYA_ID);
assert.equal(dashboard.backText(), 'Back to Dashboard');
await dashboard.clickBack();
assert.equal(dashboard.location(), '/');
await dashboard.unmount();

const advisors = await mount(
  '/advisors',
  h(AdvisorNameLink, { advisorId: CARA_ID, name: 'Cara Jensen', returnPath: '/advisors' })
);
await advisors.clickName('Cara Jensen');
assert.equal(advisors.location(), `/advisors/${CARA_ID}?return=${encodeURIComponent('/advisors')}`);
assert.equal(advisors.advisorId(), CARA_ID);
assert.equal(advisors.backText(), 'Back to advisors');
await advisors.clickBack();
assert.equal(advisors.location(), '/advisors');
await advisors.unmount();

const pipelineReturn = `/team-pipeline?advisor=${SIPHO_ID}&stage=Implementation&status=open`;
const pipeline = await mount(
  pipelineReturn,
  h(AdvisorNameLink, { advisorId: SIPHO_ID, name: 'Sipho Dlamini', returnPath: pipelineReturn })
);
await pipeline.clickName('Sipho Dlamini');
assert.equal(
  pipeline.location(),
  `/advisors/${SIPHO_ID}?return=${encodeURIComponent(pipelineReturn)}`
);
assert.equal(pipeline.advisorId(), SIPHO_ID);
assert.equal(pipeline.backText(), 'Back to Team Pipeline');
await pipeline.clickBack();
assert.equal(pipeline.location(), pipelineReturn);
await pipeline.unmount();

assert.equal(parseAdvisorReturnPath('/advisors/not-a-list'), null);
assert.equal(parseAdvisorReturnPath('https://evil.example/'), null);

const scoped = financialAdvisorsInScope([
  {
    id: MAYA_ID,
    firstName: 'Maya',
    lastName: 'Brooks',
    email: 'maya@example.test',
    role: { id: 'fa', name: 'Financial Advisor' },
    reportsToUserId: null,
    isPlatformAdmin: false,
    isActive: true,
    subscription: null,
    licenceStatus: 'Licensed',
    accountStatus: 'Active',
    rank: 'financial_advisor',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex@example.test',
    role: { id: 'ex', name: 'Executive' },
    reportsToUserId: null,
    isPlatformAdmin: false,
    isActive: true,
    subscription: null,
    licenceStatus: 'Licensed',
    accountStatus: 'Active',
    rank: 'executive',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]);
assert.equal(scoped.length, 1);
assert.equal(scoped[0].id, MAYA_ID);
assert.equal(isFinancialAdvisor(scoped[0]), true);

console.log('Advisor drilldown click interaction checks passed');
