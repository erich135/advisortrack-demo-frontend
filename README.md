# AdvisorTrack — Admin Dashboard

Internal web dashboard for the AdvisorTrack creation team (Erich, Johan, Abel).
A Director/Admin console to **track sales, oversee advisors, manage company
licenses, issue invoices, and handle customer queries**.

This is the **web** companion to Abel's mobile app. It is read-mostly today and
runs entirely on **seed data** until the AWS/PostgreSQL backend is connected.

## Stack

- **React 18 + TypeScript + Vite**
- **react-router-dom** for routing
- **recharts** for charts
- **lucide-react** for icons
- No backend yet — all data flows through a single `DataService` seam.

## Getting started

```bash
cd web-dashboard
npm install
npm run dev      # http://localhost:5173
```

Other scripts:

```bash
npm run build      # typecheck + production build
npm run preview    # preview the production build
npm run typecheck  # types only
```

## Project structure

```
src/
  domain/         Core types + the calculation engine (tax, target cascade, points)
  data/           DataService interface, seed data, seed implementation
  lib/            Formatting, analytics, invoice math, async hook
  components/     Layout, shared UI, invoice document
  pages/          One file per route
  styles/         Global theme + invoice/print CSS
```

## The DataService seam (how the backend plugs in)

Every page reads data through [`DataService`](src/data/DataService.ts). Today it
is implemented by [`seedDataService`](src/data/seedDataService.ts). When Abel's
API is ready, write a second implementation (e.g. `apiDataService`) that calls
`fetch()` against the AWS endpoints and returns the same shapes — then swap the
import. **No page or component needs to change.**

## The calculation engine

[`src/domain/calculations.ts`](src/domain/calculations.ts) is the single source
of truth for AdvisorTrack's financial math:

- 2025/2026 SA income-tax brackets
- The target cascade: `Nett → +Tax → +Deductions → ÷ CommSplit → × 1.25 = Gross`
- Cases-per-month and the weekly activity deliverables per pipeline phase
- Activity points per phase (1 / 2 / 5 / 10 / 15 / 25)

> ⚠️ The mobile app and this dashboard **must** agree on these numbers. The
> long-term plan is to extract this file into a shared package both apps consume.

## Features

| Area | What it does |
|------|--------------|
| **Dashboard** | MRR/ARR, subscribers, issued commission, activity trend, top performers, open queries |
| **Advisors** | Searchable list + per-advisor drill-down with target breakdown and production |
| **Production** | Submitted vs issued commission across the base |
| **Subscriptions** | Licenses, trials, renewals, past-due |
| **Companies** | Corporate license pools and seat utilisation |
| **Invoices** | Generate and **print/save-to-PDF** tax invoices |
| **Support** | Query inbox — assign and resolve tickets |
| **Settings & Roles** | Team access + the permission matrix for future company/team tiers |

## Notes

- All data is **fake** sample data modelled on `Activity Tracker.xlsx`.
- Invoices print via the browser dialog (Print → Save as PDF), A4 formatted.
- Permission tiers (Super Admin → Company Admin → Team Manager → Advisor) are
  modelled now; v1 grants the founders full Super Admin access.
