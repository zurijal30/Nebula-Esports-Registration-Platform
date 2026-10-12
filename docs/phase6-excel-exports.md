# Phase 6: Excel exports

Administrators can download active participant reports using **ExcelJS 4.4.0**. Registration forms and existing records are unchanged.

**Phase 6.5 update:** apply the additional [roster migration](phase65-rosters.md) for solo clan names and actual assigned gameplay roles. Columns A–K retain their positions; Registration Captain and current Team Maximum Size are appended as L/M. Historical team roles display Unassigned. Captain/solo email rules, active-only scope and workbook gridlines/borders are unchanged.

## 1. Apply the migration

Run this in **Supabase SQL Editor**, after the previous migrations have succeeded:

1. Open [202610110005_phase6_excel_exports.sql](../supabase/migrations/202610110005_phase6_excel_exports.sql).
2. Copy the entire file into **Supabase → SQL Editor → New query**.
3. Click **Run** once. Do not rerun older migrations. Share any error before retrying.

This adds one read-only administrator RPC. It creates no tables and does not modify registrations or delete data. It was not applied automatically. No new environment variables or privileged keys are required; keep the existing public Supabase configuration and `SITE_URL`.

## 2. Download reports

- **Entire event:** Admin → Events → **Export Entire Event** beneath the chosen event. The event management page also offers this action.
- **One competition:** open **Edit Event**, expand a game competition and click **Export Game Registrations**.
- **Registrations page:** select an event, then optionally a competition. Export actions appear for that scope. Search text and the visible status filter do not change exports: they always include all active entries in the selected scope.

Buttons show **Generating Excel…** and disable during download. Errors appear beside them. Filenames use the event and, for individual exports, game name. No export file is stored on the server.

## Workbook contents

Each game competition has its own sheet, including inactive games or cancelled competitions that still have active registration records. Inclusion depends strictly on **registration status = active**. Cancelled entries and their players never appear. Empty competitions contain headings, zero totals and an empty-state message. An event with no competitions contains one informational sheet.

Each participant row includes registration ID/source, team/clan, player role, full name, IGN, UID, phone, email and original registration creation timestamp. Captains appear first, followed by teammates in saved order. Registration groups use creation date and ID ordering. Team and registration fields repeat on every participant row. Current saved rosters supply the report; removed teammates and historical values are not exported.

Phones and UIDs are XLSX string cells with text format, preserving leading zeros, `+94` and long numeric IDs. User text is written as literal strings, never formula objects. Missing contacts remain blank. Timestamps are sortable Excel dates displaying **Asia/Colombo** wall time; the sheet states that timezone. Each game sheet shows generation time and active registration/participant totals.

Player-created registrations retrieve their linked owner's Auth email through the secured RPC. Team captain and solo rows receive it; teammate cells stay blank. Manual admin-created entries have no participant email field in the current schema, so their email cells stay blank. The creator administrator's email is never substituted. No teammate account or email is required.

Sheets use normal Excel gridlines, light cell borders around participant rows, navy headers, white text, cyan accents, readable widths, frozen headings, a frozen identifying column and autofilters. Empty sheets also show gridlines. Names are sanitized, limited to 31 characters and unique without case sensitivity.

## Security and complete retrieval

`GET /admin/exports/events/<event UUID>` exports an event. Add `?competition=<competition UUID>` for one competition in that event. Requests verify Auth identity and its matching trusted admin profile. The RPC independently checks the current database role using a safe empty search path. Players/anonymous users cannot retrieve records or Auth emails.

The RPC filters the chosen scope and active registrations in PostgreSQL, then aggregates all matching rosters and permitted emails in **one statement snapshot**. A scalar JSON response avoids PostgREST row limits: no registration or roster is silently cut off at 1,000. Indexed joins avoid one request per participant. Edits/cancellations committed after the snapshot appear on the next download.

Responses use `private, no-store`, `Vary: Cookie` and `nosniff`. Participant details are not logged or returned in error messages. Missing/deleted events or unrelated competitions return an error, not an empty successful report. Database/generation failures never deliver partial files.

## Practical limits

The synchronous export supports at most **50,000 active registrations and 50,000 participants per request**. Larger requests fail explicitly rather than truncating. Try individual competition exports if a full event exceeds the limit. Snapshot JSON, XLSX generation and browser downloads are buffered in memory; hosting time, memory and response limits can require smaller exports. Very large tournaments may need a later background-job or streaming design. Deployment is outside this phase.

## Test with a disposable event

1. Use a disposable event with solo, team and empty competitions.
2. Add active player-created solo/team entries and a manual entry. Keep a cancelled entry for comparison.
3. Edit team/clan, captain/teammate details, phones and roster membership, then export that competition.
4. Open it in Excel. Verify latest values, captain-first grouping, exact phones/UIDs and owner email. Teammate/manual email cells must be blank; cancelled details must be absent.
5. Export the full event. Check one sheet per game, empty-sheet zero totals and no unrelated entries. Compare totals with Supabase.
6. Try download URLs as a signed-out visitor and ordinary player: both must be denied. Check invalid/nonexistent IDs and a competition belonging to another event.
7. Cancel an active entry, export again and confirm it is absent from the file but still stored in Supabase.

Using the PowerShell runtime PATH from the Phase 5 guide:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-phase6-routes.mjs
```

## Verification status

ESLint, TypeScript, **54 automated tests** and the production build passed. Local anonymous download protection also passed with no-store headers.

A temporary static UI preview verified event/competition export controls, readable signed-out errors and mobile sizing without overflow. The development server's stale card module was refreshed and the final preview had no hydration errors. The preview route was removed from the final application.

Database tests execute all five migrations in disposable PGlite with simulated Auth/Storage. They verify admin-only email retrieval, active-only/event/competition scope, latest edits, manual entries and complete retrieval of 1,005 registrations. Workbook tests reopen actual XLSX bytes with ExcelJS to inspect strings, leading zeros, long UIDs, formula operators, emails, totals, dates, names and formatting. Handler tests inject accounts/RPC responses to check authorization, validation, errors and cache headers. These are not live Supabase downloads.

Synthetic populated/empty sheets were rendered for layout review. The preview importer coerces numeric-looking strings, so its in-memory preview restores the original ExcelJS string values; the generated XLSX itself remains unchanged and passes exact-value/type checks.

**Signed-in Excel downloads against the real Supabase project have not been tested successfully yet.** Apply the migration and complete the disposable-event checklist. Native Microsoft Excel rendering and cross-session concurrency also remain unverified. No real participant data was used for previews and no real registrations were changed.

## Changed files

- Dependency/config: `package.json`, `pnpm-lock.yaml`, `tsconfig.json` (explicit TypeScript extensions for testable shared server modules).
- Migration: `supabase/migrations/202610110005_phase6_excel_exports.sql`.
- Server: `src/lib/admin/export-workbook.ts`, `export-response.ts`, `src/app/admin/exports/events/[eventId]/route.ts`.
- UI: `src/components/admin/export-button.tsx`, `catalogue.tsx`, `src/app/admin/events/[id]/page.tsx`, `src/app/globals.css`.
- Checks: `tests/excel-export.test.mjs`, `admin-database.test.mjs`, `event-deletion-ui.test.mjs`, `scripts/check-phase6-routes.mjs`, `preview-phase6-workbook.mjs`.
- Documentation: this guide, `README.md`, `docs/architecture.md`.

Workbook APIs follow the [official ExcelJS documentation](https://github.com/exceljs/exceljs/blob/master/README.md).
