# AdvisorTrack demo Management Portal — agent instructions

## Repository identity

This repository is the **demo frontend**.

- Local: `C:\Dev\AdvisorTrack\advisortrack-demo-frontend`
- Remote: `erich135/advisortrack-demo-frontend`
- Identifier: `advisortrack-demo-frontend`
- Purpose: isolated public demo Management Portal
- Live: `https://demo.advisortrack.co.za`
- Local: normally `http://localhost:5174`

## Paired service

```text
advisortrack-demo-frontend  (this repo)
        ↓
advisortrack-demo-backend
        ↓
advisortrack_demo           (demo DB)
```

This frontend talks to the **demo backend only**. It must never talk to the production backend (`https://api.advisortrack.co.za`).

## Forbidden cross-connections

- Production frontend must never use the demo backend.
- Demo frontend must never use the production backend.
- Demo backend must never use production DB.
- Production backend must never use the demo DB for production runtime.

## Shared frontend parity

Every customer-facing Management Portal feature must exist in **both** `Advisor-Track-Dashboard` and this repo unless explicitly documented otherwise.

Demo-only: Reset Demo, Viewing as, Demo badge, simulated external side effects, public demo entry.

Production-only: Engineering Change Log, platform/internal tools, real login/billing/admin-only tooling.

## AdvisorTrack Assistant knowledge

Canonical corpus: `advisor_track_backend` (`Abel Backend`) at `src/assistant`. Do not author help cards in this frontend.

The generated snapshot `src/assistant/knowledge-bundle.json` is produced by Abel `npm run assistant:export-kb`. Refresh it from Abel; do not edit it by hand. Shipping that snapshot is a source/build arrangement only — this portal must never fetch help content from the production API at runtime.

Any user-facing route, workflow, permission, label, or business-rule change must review/update the AdvisorTrack Assistant knowledge base in the same change.

- Do not invent undocumented Assistant functionality.
- Keep production/demo customer knowledge in parity.
- Demo/internal differences must be environment-tagged (`production` | `demo` | `both`) in that corpus.

## Demo rules

Isolated fake Northstar data. No production credentials. External emails/payments stay simulated.

## Invoice numbering

Locked: `INV100000+`. Unique, sequential, never reused.

## No hard deletes

Use archive, deactivate, revoke, expire, or supersede.

## AdvisorTrack AWS key (operator note only)

Working copy: `C:\Users\erich.ERICHPC\.ssh\advisortrack-main.pem`  
SSH target: `ubuntu@api.advisortrack.co.za`

Do not print, commit, or log the key. Demo deploys target the demo Nginx site and `advisortrack-demo-api`, never `advisortrack-api` / `advisor_track`.

## Deployment checklist

Before any deploy, report: repo, branch, HEAD SHA, target host, target PM2 (`advisortrack-demo-api`), target DB (`advisortrack_demo`), target Nginx (demo frontend root). Never deploy from folder proximity.

The public demo must not expose the Engineering Change Log page, Engineering navigation, or internal engineering APIs. The helper below is CLI-only and must never be imported into the Vite bundle.

## Mandatory Engineering Change Log Check

Before modifying AdvisorTrack code:

1. Read the current pinned Engineering Decisions.
2. Read recent Engineering Change Log entries relevant to this repository and the area being modified.
3. Inspect any referenced commits that overlap the proposed work.
4. Do not assume your local branch contains all relevant work completed by another developer.
5. Preserve recent behaviour unless the current task explicitly authorises changing it.
6. If Engineering Change Log context cannot be retrieved, STOP and report that the mandatory pre-change check could not be completed rather than proceeding blindly.

Load context with `npm run engineering:context` (optional `--area <area>`). Configuration is environment-only: `ADVISORTRACK_ENGINEERING_LOG_URL` and `ENGINEERING_CHANGELOG_READ_TOKEN`. Never commit those values. This repository identifier is `advisortrack-demo-frontend`.

After a reviewed change is committed:

1. Add an Engineering Change Log entry containing the repository, branch, commit hash, affected area, exact behaviour changed, reason, migrations, compatibility implications, risks/dependencies, and tests.
2. Never include credentials or secrets.
3. Deployment must be recorded as a separate deployment entry rather than rewriting the original change entry.
