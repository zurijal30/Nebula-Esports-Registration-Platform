# Phase 4 technical notes

## Automated verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-phase4-routes.mjs
node scripts/check-registration-schema.mjs
node scripts/check-phase4-live.mjs
```

`pnpm test` executes both real migrations in a disposable in-memory PostgreSQL engine (PGlite), with mocked Supabase Auth roles/users. It tests database uniqueness, RLS, direct-write denial, type/source/owner derivation, large rosters, edits, soft cancellation, re-registration, future/closed/draft/cancelled/inactive eligibility and transaction rollback. A deliberately failing player-insert trigger proves failed saves and failed roster replacement roll back completely. PGlite is a development dependency; runtime production code does not use it. Its single connection queues concurrent calls, so cross-connection locking is a separate live test, not claimed by the local suite.

For authenticated live RPC testing create an ignored `.env.test.local` (or supply environment variables) containing the **disposable** project URL/key, `PHASE4_TEST_EMAIL`, `PHASE4_TEST_PASSWORD`, `PHASE4_TEST_SOLO_ID`, `PHASE4_TEST_TEAM_ID`, and `PHASE4_ALLOW_TEST_WRITES=YES_DISPOSABLE_PROJECT`. Optional `PHASE4_OTHER_EMAIL`/`PHASE4_OTHER_PASSWORD` and `PHASE4_TEST_CLOSED_ID` enable other-owner and deadline cases. Run `node scripts/test-phase4-supabase.mjs`. It refuses to write without explicit opt-in, creates test registrations, verifies two independent session submissions, and soft-cancels entries in cleanup. Test records remain cancelled, preserving data; it never permanently deletes or runs SQL. Use fresh competitions with no active test-owner entries. Do not point it at production.

## Security implementation

The two RPCs follow [Supabase function security guidance](https://supabase.com/docs/guides/database/functions): restricted execution, empty `search_path`, qualified objects and explicit authorization. Owner comes exclusively from `auth.uid()`, while type comes from the locked competition; callers cannot set owner, creator, source, status, captain identification or ordering. Public keys remain unprivileged. Registration and player reads use ownership RLS plus existing admin read policies. All direct API writes remain revoked.

Writes occur in a single PostgreSQL transaction. Edits lock the owned registration, validate eligibility and replace its players atomically. Shared competition/event/game locks prevent schedule, publication and cancellation changes while checking/saving; PostgreSQL [row lock behavior](https://www.postgresql.org/docs/current/explicit-locking.html) governs concurrency. `clock_timestamp()` is checked after lock waits and at completion rather than trusting transaction-start time or a browser clock. The existing partial unique index handles racing creates. A cancelled entry is retained and ceases to participate in that index. No edit history is stored.

## Current verification and limitations

Local lint, TypeScript, build, SQL/validation tests and anonymous route checks pass. Desktop/mobile form checks used a temporary local-only component preview, which was removed before the final build; no fake registrations were submitted. Add/remove controls retained data for eight players and at 320/390px without overflow.

Connected Supabase Auth is reachable. Read-only checks confirm the Phase 4 public schema is ready and anonymous registration RPC access is denied. The user confirmed live solo/team submissions, editing and cancellation. Separate multi-session race tests and adversarial Supabase access checks remain unverified; the optional live runner requires disposable test configuration. If an event is unpublished or its game hidden, owned registration details remain readable but its public schedule/name is shown unavailable and player mutations fail closed. Historical records with unrecorded IGN require completion on edit. Normal framework request-size limits still apply; there is no player-count cap.

Admin event management, banner uploads, Excel exports, payment tracking, capacities, waitlists and approvals remain outside Phase 4.

## Changed files

- Database: `supabase/migrations/202610110002_phase4_registration.sql`.
- Registration routes: `src/app/dashboard/registrations/page.tsx`, `src/app/dashboard/registrations/[id]/edit/page.tsx`, `src/app/tournaments/live/[slug]/page.tsx`, `src/app/tournaments/live/[slug]/register/[competitionId]/page.tsx`.
- Registration components: `src/components/registrations/registration-form.tsx`, `src/components/registrations/cancel-form.tsx`.
- Domain/data/actions: `src/lib/registrations/policy.ts`, `src/lib/registrations/data.ts`, `src/lib/registrations/actions.ts`, `src/lib/tournaments/live.ts`, `src/lib/tournaments/live-model.ts`, `src/types/tournament.ts`, `src/lib/tournament-status.ts`.
- Existing UI integration: `src/app/tournaments/page.tsx`, `src/app/tournaments/[slug]/page.tsx`, `src/app/tournaments/[slug]/register/[competitionId]/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/about/page.tsx`, `src/app/admin/page.tsx`, `src/components/tournaments/competition-list.tsx`, `src/components/tournaments/tournament-card.tsx`, `src/components/tournaments/tournament-directory.tsx`, `src/components/tournaments/tournament-artwork.tsx`, `src/app/globals.css`.
- Auth return flow: `src/lib/auth/policy.ts`, `src/lib/auth/actions.ts`, `src/app/sign-in/page.tsx`, `src/app/sign-up/page.tsx`, `src/app/auth/confirm/route.ts`.
- Tests/diagnostics: `tests/registration-policy.test.mjs`, `tests/registration-database.test.mjs`, `scripts/check-registration-schema.mjs`, `scripts/check-phase4-live.mjs`, `scripts/check-phase4-routes.mjs`, `scripts/test-phase4-supabase.mjs`.
- Documentation/dependencies: `README.md`, `docs/architecture.md`, `docs/supabase-setup.md`, this guide, `package.json`, `pnpm-lock.yaml`.


## Migration details

Phase 4 preserves existing registrations. It fills registration type from the competition and source from the creator/owner. Existing players are ordered by creation time and ID, with the first player marked captain; check historical captain assignments before using old records. Missing historical IGNs must be supplied when editing.

If you use the Supabase CLI after applying SQL manually, reconcile migration history first. Review `supabase db push --dry-run` before `supabase db push`; do not reset a shared database.

The simplified guide is `docs/phase4-registration.md`. Supporting documentation added during simplification: this file and `supabase/tests/phase4_test_event.sql` (manual fixture only).
