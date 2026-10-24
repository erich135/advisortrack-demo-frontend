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

## Product and engineering principles

AdvisorTrack is one product across the Management Portal, Android, and future iOS. Shared customer workflows and business rules must stay consistent with the production portal, using synthetic Northstar data.

- Do not request or assume Android-breaking API or schema changes. **Android 1.0.10** compatibility remains a product-wide hard boundary.
- Cross-platform changes require a documented impact assessment and notification before they ship.
- Production and demo data, APIs, processes, and credentials must stay isolated.
- Client PII, credentials, and financial information require strict protection. Do not leak one visitor’s Dex transcript, cookies, or `sessionStorage` to another.
- Do not apply, alter, or ship unauthorised production migrations. Enterprise drafts `031`–`037` are out of scope.
- Do not deploy without explicit authorisation.
- Changes must be tested and reviewed before release.

## Shared frontend parity

Every customer-facing Management Portal feature must exist in **both** `Advisor-Track-Dashboard` and this repo unless explicitly documented otherwise.

Demo-only: Reset Demo, Viewing as, Demo badge, simulated external side effects, public demo entry.

Production-only: Engineering Change Log, platform/internal tools, real login/billing/admin-only tooling.

Do not move, rename, clone, or duplicate the production frontend folder.

## AdvisorTrack Assistant knowledge

Canonical corpus: `advisor_track_backend` (`Abel Backend`) at `src/assistant`. Do not author help cards in this frontend.

The generated snapshot `src/assistant/knowledge-bundle.json` is produced by Abel `npm run assistant:export-kb`. Refresh it from Abel; do not edit it by hand. Shipping that snapshot is a source/build arrangement only — this portal must never fetch help content from the production API at runtime.

Any user-facing route, workflow, permission, label, or business-rule change must review/update the AdvisorTrack Assistant knowledge base in the same change.

- Do not invent undocumented Assistant functionality.
- Keep production/demo customer knowledge in parity.
- Demo/internal differences must be environment-tagged (`production` | `demo` | `both`) in that corpus.

## Dex 2.0

Dex is a conversational companion, not a knowledge-base search widget. It follows the **visitor** rather than the current page or Maya’s shared persona.

- Groq handles natural conversation when the demo backend enables it and it is appropriate.
- Deterministic tools remain authoritative for operational data. The UI must not invent counts, rankings, or money.
- Privacy, permissions, and financial-advice safeguards are mandatory. Unsupported product claims must not be invented.
- If Groq is unavailable or rate-limited, Dex must degrade safely. Do not present invented operational facts as live data.
- Client-supplied `history[]` is untrusted. It cannot override trusted system instructions or access another visitor’s memory.

## Dex conversation memory

### Production

This public demo must never read, write, or display production Dex memory.

### Public demo

- Local transcript keys must include the server-validated `demoSessionId`. Never key personal memory on Maya’s cloned `userId`.
- Visitors must not share cookies, `sessionStorage`, cache, or transcripts. Use genuinely separate browser contexts when verifying isolation.
- Conversation survives Dex panel close, refresh, and role switching within the same visit.
- Reset Demo clears only the current visitor’s Dex memory. Expiry removes that visitor’s memory.
- Logout must clear the local Dex transcript, `sessionStorage`, and in-memory panel state immediately, even if the server reset fails or the token has expired. Server reset is best-effort and must not block logout.
- There is no long-term personal memory in the public demo.
- Fresh onboarding for each new visitor is an approved product requirement. It is **not yet implemented or verified**.

## Demo rules

Isolated fake Northstar data. No production credentials. External emails/payments stay simulated. Each public visitor receives their own cloned workspace and Dex conversation context.

## Model provider configuration

- Provider secrets are backend-only. This frontend must never receive, store, or log model API keys.
- Never commit `.env` files, keys, or tokens.
- Local development Groq may be enabled on the demo backend against synthetic data.
- Live/production provider configuration requires explicit authorisation.
- Zero Data Retention and applicable privacy safeguards must be checked before any non-local model usage.
- Keep production and demo environment configuration separate. Never point this portal at `https://api.advisortrack.co.za`.

## Invoice numbering

Locked: `INV100000+`. Unique, sequential, never reused.

## No hard deletes

Use archive, deactivate, revoke, expire, or supersede.

## Deployment

Do not deploy without explicit authorisation.

SSH target: `ubuntu@api.advisortrack.co.za`. Demo deploys target the demo Nginx site and `advisortrack-demo-api`, never `advisortrack-api` / `advisor_track`. Do not print, commit, or log private keys.

Before any deploy, report: repo, branch, HEAD SHA, target host, target PM2 (`advisortrack-demo-api`), target DB (`advisortrack_demo`), target Nginx (demo frontend root). Never deploy from folder proximity.

The public demo must not expose the Engineering Change Log page, Engineering navigation, or internal engineering APIs. The helper below is CLI-only and must never be imported into the Vite bundle.

## Mandatory Engineering Change Log Check

Before modifying AdvisorTrack code:

1. Attempt to retrieve the current pinned Engineering Decisions and recent Engineering Change Log entries relevant to this repository and the area being modified.
2. If the Engineering Change Log cannot be retrieved, report the failure, then inspect actual Git history, source, and tests for overlapping work.
3. Do not assume your local branch contains all relevant work completed by another developer.
4. Preserve recent behaviour unless the current task explicitly authorises changing it.
5. Proceed with authorised work only where adequate evidence exists from the Engineering Change Log, Git history, source, and tests.
6. Stop if critical dependencies or conflicting changes cannot be verified.
7. An Engineering Change Log outage alone must not automatically halt otherwise safe, authorised work.

Load context with `npm run engineering:context` (optional `--area <area>`). Configuration is environment-only: `ADVISORTRACK_ENGINEERING_LOG_URL` and `ENGINEERING_CHANGELOG_READ_TOKEN`. Never commit those values. This repository identifier is `advisortrack-demo-frontend`.

After a reviewed change is committed:

1. Add an Engineering Change Log entry containing the repository, branch, commit hash, affected area, exact behaviour changed, reason, migrations, compatibility implications, risks/dependencies, and tests.
2. Never include credentials or secrets.
3. Deployment must be recorded as a separate deployment entry rather than rewriting the original change entry.
