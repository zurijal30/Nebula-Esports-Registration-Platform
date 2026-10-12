# Nebula Esports

Phase 7C: [Production readiness, migration procedure, environment and authentication checklists](PRODUCTION_READINESS.md). Status: **READY AFTER MANUAL CONFIGURATION**. Node 24.x is pinned; banner uploads and buffered Excel downloads cap at 4 MiB for Vercel compatibility. Nothing has been deployed.

Phase 7B.1: [CSS game ticker, asset sources and public demo cleanup](docs/phase7b1-ticker-cleanup.md). Public tournaments now come only from published Supabase events. The separate 13-game presentation catalog never creates tournament records.

Phase 7A security/functionality audit: see [findings, migration and verification report](docs/phase7a-security-audit.md). Status: **PASSED WITH MANUAL VERIFICATION REQUIRED**; the corrective banner migration is pending and one development-only dependency advisory remains.

Clan names, participant roles and configurable maximum team sizes: see [Phase 6.5 setup](docs/phase65-rosters.md) for the new migration and verification steps. New/edited teams require roles and default to eight people when no game rules are configured, as requested.

Game deletion, reference types and game banners: see [game management update](docs/game-management-update.md) for the new migration and verification steps.

A public tournament website with authenticated solo/team registration for Nebula Esports, a Sri Lankan tournament organiser. Built with Next.js App Router, TypeScript, Tailwind CSS, Lucide React and official Supabase clients. Only published Supabase events appear publicly.

## Setup

Use Node.js 24.x and pnpm 11.25.0, matching the pinned project configuration. Install pnpm if necessary, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:3000. Configure `.env.local` from `.env.example` with the Supabase URL, publishable key and canonical `SITE_URL`. Never put secret keys in public variables. Apply the migration and configure Auth URLs/providers/email templates using [the Supabase setup guide](docs/supabase-setup.md). Environment values alone do not create tables. Missing configuration produces friendly unavailable states; no mock tournaments replace unavailable live data.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`pnpm start` serves the production build after `pnpm build`. On this development machine, pnpm is available at `C:\Users\zuhry\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd`; use that full path if pnpm is not on your PATH.

## Implemented

- Responsive homepage: hero, CSS game ticker, real upcoming tournaments/empty state, organiser introduction and footer.
- Original Nebula logo/arena SVG and shared event fallback artwork. Ticker logos are local publisher assets with documented permission/source notes.
- Event image references live in tournament data. A shared responsive renderer uses the same banner on cards and details, with a default banner for missing or failed images.
- Accessible navigation with active links, mobile disclosure, Escape dismissal, focus indicators, reduced motion support and a skip link.
- Tournament directory with name search, five working filters, results count, reset actions and an empty state.
- Detailed event pages with banners, schedules, venues and individual solo/team competitions, fees and registration windows.
- Published events use `/tournaments/live/[slug]`; Register opens the authenticated solo/team form for that exact competition. Older short routes resolve real published events or return Not Found.
- Dynamic teammates with stable field values/roles, configurable maximums and optional coach/substitute slots; only the captain needs an account. Contact email comes from the owner account. Solo and team clans are optional.
- My Registrations at `/dashboard/registrations`, with active/cancelled entries, rosters, schedules, edit and confirmed soft cancellation before each deadline.
- Transactional registration RPCs with verified ownership, database-clock eligibility, atomic roster replacement and concurrent duplicate protection.
- Email signup/login, Continue with Google, email confirmation/PKCE callbacks, password recovery, cookie sessions and logout.
- Authenticated dashboard with editable display name/contact phone and verified identity on every protected server action.
- Functional admin dashboard with real database counts, event/game/competition management, registration search and roster editing, manual entries and user role management.
- Private Supabase Storage banners with previews, server image validation, safe replacements/removal and unused-file cleanup. Public pages refresh through a non-sensitive Realtime counter.
- Versioned six-table SQL foundation, RLS, private profiles, protected registration tables, timestamps, foreign keys and one-active-registration constraint.
- `/about`, access-denied and custom 404 pages.
- Shared layout, action link, page intro and tournament card components.
- Strict TypeScript, Tailwind v4, CSS design tokens, ESLint and package lockfile.

Dependencies use the latest mutually compatible stable versions verified during setup. ESLint 9 and TypeScript 6 are used because the current Next.js lint plugins do not support ESLint 10 or TypeScript 7.

Published events come from the database and alone support submissions. Synthetic events exist only in isolated test fixtures. No social profiles, contacts, participant counts or prize pools have been invented. Player flows require Phases 3–4; admin management requires the additional Phase 5 migration. See [Phase 5 setup](docs/phase5-admin.md).

## Tournament status

`src/lib/tournament-status.ts` derives statuses from dates and event cancellation. Registration opens inclusively at the opening instant and closes at the deadline instant. Cancelled events override every competition; completed events and invalid windows are closed. An event is open if any game is open, otherwise upcoming if any window has yet to open, otherwise closed. The directory's Upcoming filter independently selects scheduled events whose main start time is still in the future.

Display formatting explicitly uses `Asia/Colombo`, regardless of the server or visitor timezone. Status-bearing pages render at request time. Directory and competition statuses refresh once per minute while open. Public changes also refresh through the existing Realtime counter/polling fallback.

Upcoming event dates and registration status are separate concepts, so a scheduled event with closed registration may still appear under Upcoming. The homepage never substitutes fixtures when the database has no upcoming events.

`pnpm test` runs Node domain tests and actual migration/RLS/transaction tests in disposable embedded PostgreSQL (PGlite, development-only). It covers player registration, admin authorization, role management, banner validation/Storage policies and registration preservation. Tests require Node.js 22.6+ for TypeScript stripping; Node.js 24 satisfies this. Actual Supabase Storage HTTP operations and multi-session concurrency remain separate live checks; see the Phase 5 guide.

## Structure

Tournament `displayImage` stores `{ src, alt }` or `null`. Event images are managed from `/admin/events` using private Storage and versioned image routes. Cards, homepage previews and details use one renderer. Missing/failed images use the default banner. Safe replacement and retryable cleanup are described in `docs/phase5-admin.md`.

```text
src/app/                    App Router pages, metadata and global design system
src/components/layout/      Shared brand, navigation and footer
src/components/ui/          Reusable action link and page introduction
src/components/tournaments/ Tournament presentation
src/data/supported-games.ts Independent ticker catalog with platform/logo metadata
public/assets/games/        Local authentic logos and provenance/usage manifest
src/types/tournament.ts     Event and game competition data contracts
src/lib/tournament-status.ts Pure registration status and filtering rules
src/lib/tournament-format.ts Colombo date/time and fee formatting
src/lib/server-time.ts      Request-time clock for server pages
src/lib/site.ts             Shared navigation definition
public/images/              Original supplied logo and local arena illustration
assets/                     Preserved original supplied asset
docs/architecture.md        Future scope and domain boundaries
docs/supabase-setup.md       Migration, Auth/provider setup, admin bootstrap and live verification
src/lib/supabase/           Official SSR browser/server clients
src/lib/auth/               Verified account guards, actions, validation and redirect rules
src/components/auth/       Branded account forms and Google login
src/proxy.ts                Verified token refresh and private cache headers
supabase/migrations/        Versioned database foundation
supabase/tests/             Transactional database security tests
scripts/check-supabase.mjs  Read-only provider and schema readiness diagnostic
tests/                      Status, filtering, timezone and data integrity tests
```

Edit the supported ticker catalog in `src/data/supported-games.ts`. Live events use `src/lib/tournaments/live.ts`, with a shared display adapter and model-driven `banner_url`/`banner_alt` artwork. Registration actions/data/policy live under `src/lib/registrations`; forms under `src/components/registrations`. The supplied logo remains in `assets/nebula-logo.png`, with its public copy at `public/images/nebula-logo.png`. Styles are in `src/app/globals.css`.

## Exports and remaining scope

Phase 6 adds [administrator Excel exports](docs/phase6-excel-exports.md) for individual competitions and entire events, with active-only participant rows, latest rosters and secure owner emails. Apply `202610110005_phase6_excel_exports.sql` after the previous migrations. No additional environment variables or production secrets are required. Signed-in Supabase downloads remain unverified.

Phase 6.5 extends those exports with solo clans, assigned gameplay roles, a separate captain indicator and the current team maximum. Apply `202610120003_phase65_rosters.sql` after the game-management and Storage-fix migrations; follow [the roster guide](docs/phase65-rosters.md).

Payments/tracking, capacities, waitlists, approvals and account deletion are not implemented. The user confirmed Phase 4 live registration flows. See [Phase 5 setup](docs/phase5-admin.md) for Storage and [admin event deletion](docs/admin-event-deletion.md) for its separate migration. No migrations were applied automatically.
