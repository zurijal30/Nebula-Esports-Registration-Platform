# Phase 7A: security and functionality audit

Audit date: **12 October 2026 (Asia/Colombo)**.

Final status: **PASSED WITH MANUAL VERIFICATION REQUIRED**.

The audited code passes its automated security/functionality checks. No critical application vulnerability or confirmed authorization bypass was found. A corrective banner migration still needs to be applied, signed-in hosted journeys require manual verification, and one high-severity development-only dependency advisory remains unresolved upstream. This status is not a claim that every hosted Supabase policy or external authentication setting was inspected.

## Scope and method

Reviewed authentication, SSR/browser Supabase clients, callbacks, trusted-role guards, server actions, API routes, all versioned migrations and RLS policies, player registrations, game roster rules, admin management, banners/Storage, public pages, exports, environment usage and error handling. Prioritized authorization, private data access and atomic writes before functional issues and dependencies.

Tests used disposable embedded PostgreSQL (PGlite), synthetic records, actual components/actions with mocked dependencies and real XLSX generation/reopening. Live checks were limited to anonymous/read-only schema and permissions, Auth provider settings, and published public data/images through the local application. No real registration was created, edited or cancelled, no Storage object was removed, no destructive live SQL ran, and no migration was applied. The existing UI/design was preserved. Deployment and Phase 7B were not started.

## Findings and fixes

| Finding | Severity / impact | Result |
| --- | --- | --- |
| ExcelJS resolved `uuid@8.3.2`, affected by a buffer-bounds advisory | Moderate dependency advisory. ExcelJS's installed code uses `v4()`, whereas the affected APIs are `v3/v5/v6`; no reachable application exploit was established. | Scoped override to patched CommonJS-compatible `uuid@11.1.1`. Actual conditional-format writer and XLSX tests pass. [Advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). |
| Replacing/removing an event banner retired its old asset even when another event still referenced it | Medium functional availability issue: shared images became inaccessible through RLS and the image route despite their bytes being retained. | New migration preserves referenced active assets and repairs previously retired referenced metadata. |
| A shared event banner could stay active after its last reference ended while its original event still existed | Low functional issue: unused images could never enter cleanup. | New migration retires unreferenced active assets on authorized cleanup, regardless of whether the original event exists. Referenced objects remain protected. |
| Public event and owner-registration loaders fetched one API page | Medium functional issue: lists beyond the provider row cap could be silently incomplete, and existing registrations could appear absent. | Stable 500-row pagination shared with admin data; failed pages return an error and no partial list. Actual loaders tested with 1,003 rows; helper tested with 1,507. |
| Disposable live registration script still expected unassigned 9/12-person teams | Low verification issue after Phase 6.5 | Script now derives its roles/maximum from the selected game's current rules and tests valid smaller rosters, configured limits and two-session duplicates. Write opt-in remains required; it was not run with writes during this audit. |
| Next.js warned about undeclared smooth scrolling during navigation | Low functional warning | Added `data-scroll-behavior="smooth"` to the existing root HTML. Browser navigation now has no recorded warnings/errors; appearance unchanged. |
| `braces@3.0.3` stack-exhaustion advisory in the ESLint dependency chain | High upstream severity, development-only exposure. Path: `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. | Unresolved: the registry/advisory has no published patched version. Not suppressed or ignored. Production dependency audit is clean. [Advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). |

The remaining `braces` issue concerns processing deeply nested patterns in tooling; the application does not expose that lint dependency to public requests. Recheck the advisory when an upstream fix is published. Do not treat the full dependency audit as passing until it is resolved.

## Controls verified

| Area | Evidence and result | Remaining live checks |
| --- | --- | --- |
| Authentication | Actual sign-in/signup/reset/logout/profile/password actions tested with mocks. Signup sends display name only; forged ID/role fields cannot change profile ownership. Canonical origins and local destination allowlist prevent external redirects. Expired identity prevents password writes. | Actual email delivery/confirmation, Google login, cookies/session refresh/revocation and logout across browsers. |
| Callbacks | Actual OAuth and email-confirmation route code tested: invalid/external destinations, provider failures, credential stripping, supported OTP types, recovery destination, private/no-store and no-referrer. Local invalid callback URLs also tested over HTTP. | Real Google PKCE round trip, confirmation/recovery links, external provider redirect allowlists. |
| Authorization | Every exported administrator server action rejects an unprivileged caller before obtaining a client. Latest schema rejects all 21 admin RPC workflows for ordinary players; anonymous admin reporting RPCs denied. Protected local routes redirect to sign-in. | Signed-in player/admin HTTP actions against disposable hosted data; verify role revocation during an open session. |
| RLS/database | All nine application tables retain RLS. Every application SECURITY DEFINER function has an empty search path; public privileged functions are not executable by `anon`. Direct event/game/registration writes and role escalation denied; Auth metadata cannot elevate roles. Existing last-admin tests pass. | Confirm deployed policies/function definitions match the migrations; hosted multi-session races. |
| Registration | Ownership, opening/deadline checks using database clock, duplicate uniqueness, re-registration after cancellation, solo clans, manual entries, admin deadline override and association checks pass in real disposable PostgreSQL. Forced insertion failures preserve headers/rosters. | Signed-in create/edit/cancel/re-register through the browser on a disposable event. |
| Roster rules | VALORANT eight-slot and Free Fire six-slot configurations accept smaller teams; unique valid roles, captain-as-Player, optional coach/substitutes and configured slots enforced. Manipulated actual server-action payloads cannot override database format/cap. Historical 12-person rosters preserved; reductions require confirmation. | Browser saves for both game configurations after current migrations are applied. |
| Admin management | Disposable tests cover event/game/competition create/edit, publishing, cancellation, exact permanent deletion confirmation, scoped deletion, referenced-game deletion refusal, manual entries, role changes and private emails. | Review the signed-in admin screens using disposable fixtures; do not test deletion on real tournaments. |
| Storage | Image bytes/type/size/pixel limits and full re-encoding tested. Isolated bucket policies, reservation/owner checks, internal Storage service-role compatibility, independent game/event namespaces, shared-image protection and retryable cleanup pass. | Real HTTP upload/replace/remove and interrupted-upload cleanup on disposable images. |
| Exports | Actual XLSX bytes reopened: active-only scope, latest rosters, solo/team clans, assigned roles, captain indicator, permitted owner emails, blank teammate/manual emails, exact text phones/UIDs, literal formula operators, grouping, dates, gridlines and borders. Scalar RPC exports 1,005 registrations without truncation. | Signed-in individual/full-event downloads on hosted Supabase; native Excel display. |
| Public journeys | Browser search/filter combination, empty/reset, details, published event/game banner loading and registration-to-sign-in return route verified. Current banner bytes came from public live Storage reads through the local app. | Realtime cross-session propagation after actual admin changes. |
| Environment/logs | `.env.local` and `Keys.txt` remain ignored. Example env has blank public credentials. No application service-role client; public config rejects privileged keys. Targeted source scan found no matching hardcoded private tokens/keys. Error handlers avoid raw participant/provider details. | Hosting environment, Auth rate-limit configuration and production logs are outside this local audit. |

Older phase-specific database suites deliberately test their historical migration stages. The Phase 6.5 suite tests the latest roster RPCs, and the Phase 7A matrix applies all prior migrations plus the new correction. These results are simulated Supabase roles in PostgreSQL, not a claim of live signed-in Supabase testing.

## Commands and actual results

The bundled Node/pnpm runtime was added to the PowerShell PATH as in earlier phases.

| Command | Final result |
| --- | --- |
| `pnpm install` | Passed; scoped UUID override and lockfile updated. |
| `pnpm lint` | Passed, exit 0. |
| `pnpm typecheck` | Passed, exit 0. Production build also checks TypeScript. |
| `pnpm test` | **91 passed, 0 failed, 0 skipped, 0 cancelled**, exit 0. Includes unit, actual action/route/component and disposable PostgreSQL integration tests. |
| `pnpm build` | Passed, exit 0; all 30 generated pages/routes, no temporary preview route. |
| `pnpm audit --prod --json` | Passed: zero production advisories. |
| `pnpm audit --json` | **Exit 1**: one high-severity development-only `braces` advisory; zero other advisories. Initial audit also had the now-fixed moderate UUID advisory. |
| `node scripts/check-supabase.mjs` | Passed live read-only check: Auth reachable, email/Google enabled, confirmation required, signup enabled, public event schema available. |
| `node scripts/check-phase7a-live.mjs` | Passed live read-only check: six public schema probes, three anonymous private-table denials and three anonymous admin-read RPC denials. No row/contact details retrieved. |
| `node scripts/check-auth-routes.mjs` | Passed local Auth/public routes, protected redirects, invalid callbacks and unknown event. |
| `node scripts/check-phase4-routes.mjs` | Passed local player return destinations and informational demo registration. |
| `node scripts/check-phase5-routes.mjs` | Passed local admin guards and uncached unknown/private event image rejection. |
| `node scripts/check-phase6-routes.mjs` | Passed anonymous export rejection and no-store. |
| `node scripts/check-phase7a-routes.mjs` | Passed local detail/form guards, unknown/invalid images and nonexistent live event. |
| `git diff --check` | Passed. Earlier applied migration files are unchanged. |

During development, new audit tests initially failed because of an incorrect ExcelJS test call, a misplaced test step and an unnecessary hardcoded action count. Those test-fixture issues were corrected; the final suite has no failed tests. The full dependency audit remains a real unresolved failure, as listed above.

Live signed-in/destructive tests were **not run**, rather than reported as passes. No production deployment checks were attempted.

## Apply the corrective migration

After migrations through `202610120003_phase65_rosters.sql` have succeeded:

1. Open [202610120004_phase7a_shared_event_banners.sql](../supabase/migrations/202610120004_phase7a_shared_event_banners.sql).
2. Copy the **entire file** into **Supabase → SQL Editor → New query**.
3. Click **Run once**. If it reports an error, share the error before retrying; do not rerun earlier migrations.
4. Refresh the application. Use a disposable event/image to verify replacement/removal and safe cleanup.

The transaction replaces two admin-authorized functions and restores active metadata for already referenced retired event banners. It does not delete Storage objects or registrations, change event URLs/owners, add public write access, reset the database or require new secrets. It was **not applied automatically**.

## Manual verification checklist

Use a disposable Supabase event/test accounts and image objects. Keep real participant/tournament data unchanged.

1. Apply the corrective migration. Confirm no SQL errors; existing event/game banners and registrations remain available.
2. Complete email signup/confirmation, password login, Google login, password recovery, session reload/expiry and logout. Verify the registered return route is local and preserved.
3. As an ordinary player, try direct admin routes, export URLs and RPCs. Check a second player's registration is hidden and cannot be edited/cancelled. Demote a test administrator using another admin and verify access disappears; never demote your only administrator.
4. Save solo clans; create/edit/cancel/re-register team entries; test duplicates from two sessions and at opening/deadline boundaries. Check complete rosters after rejected saves.
5. Test VALORANT maximum 8/all eight roles and Free Fire maximum 6/Player 1–4 plus two substitutes. Smaller teams must work. Invalid/duplicate roles and excessive participants must fail through player and manual/admin flows.
6. Lower a game's maximum below a saved roster or remove an assigned role. Confirm the warning, preserved historical details and rejection of later invalid edits. Changing the game's reference classification must not change competition formats.
7. Manage disposable events/competitions and unused games; verify referenced games cannot be deleted. Test permanent event deletion only on disposable records and confirm unrelated events/profiles remain intact.
8. Upload/replace/remove disposable event and game banners, including invalid files. If you maintain shared URLs, verify the other event still displays the old image after replacement; removing the final reference should make it eligible for authorized cleanup. Verify retry after a simulated cleanup failure.
9. Download individual and full-event exports. Check current clan/roles, exact phones/UIDs, allowed owner emails, blank teammate/manual emails, cancelled exclusion, empty sheets and native Excel gridlines. Keep exported private data local.
10. Verify public refresh from a second session after banner/publication changes. Review Auth redirect allowlists, email templates, SMTP/rate limits and actual hosted RLS/function definitions separately.

## Changed files

- Dependency fix: `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
- Corrective migration: `supabase/migrations/202610120004_phase7a_shared_event_banners.sql`.
- Complete reads: `src/lib/supabase/pagination.ts`, `src/lib/admin/data.ts`, `src/lib/registrations/data.ts`, `src/lib/tournaments/live.ts`.
- Navigation warning: `src/app/layout.tsx`.
- Verification scripts: `scripts/test-phase4-supabase.mjs`, `scripts/check-phase7a-live.mjs`, `scripts/check-phase7a-routes.mjs`.
- Tests: `tests/phase7a-actions.test.mjs`, `tests/phase7a-auth.test.mjs`, `tests/phase7a-data.test.mjs`, `tests/phase7a-database.test.mjs`.
- Documentation: this report and `README.md`.

## Remaining risks and status

The unpatched development-only `braces` advisory remains visible to the full audit. The corrective migration is pending on hosted Supabase. Actual provider email/OAuth flows, session expiry/revocation, signed-in admin/player journeys, Storage HTTP mutations, multi-session races and native Excel rendering need the manual checks above. Offset pagination returns complete lists in ordinary use but does not provide a single database snapshot under simultaneous list edits; exports independently retain their one-statement snapshot. Very large export memory/time limits remain as documented in Phase 6.

**PASSED WITH MANUAL VERIFICATION REQUIRED** applies to the completed local audit and fixes, with these explicit qualifications. No critical issue currently blocks the audited code, but this does not authorize deployment or replace the pending hosted verification.
