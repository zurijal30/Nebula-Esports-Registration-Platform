# Phase 6.5: clans and team roster rules

Solo and team registrations now support optional clan names. Team participants require unique gameplay roles: Coach, Player 1–5 or Substitute 1–2. The first participant remains the captain and must have a Player role; their account ownership and contact email remain separate from that role.

## Apply the migration

Do this in **Supabase SQL Editor**, after all existing migrations through `202610120002_storage_banner_upload_fix.sql` have succeeded:

1. Open [202610120003_phase65_rosters.sql](../supabase/migrations/202610120003_phase65_rosters.sql).
2. Copy the **entire file**.
3. Open your Supabase project → **SQL Editor → New query**.
4. Paste it and click **Run once**.
5. If it reports an error, share that error before retrying. Do not rerun older migrations.
6. Refresh the website and open **Admin → Games**.

The migration was **not applied automatically**. It adds nullable game configuration and participant roles, updates registration/export RPCs, and adds an admin-only game configuration RPC. Older migrations remain unchanged. Existing registrations, participants, cancellations, images and owners are preserved. No new environment variables, keys or Storage setup are needed.

## Configure a game

In **Admin → Games**, select **Team** as the catalogue reference type, enter **Maximum Individuals Per Team**, choose available role slots and save.

| Example | Maximum | Enabled roles |
| --- | --- | --- |
| VALORANT | 8 | Player 1–5, Coach, Substitute 1–2 |
| Free Fire | 6 | Player 1–4, Substitute 1–2 |

The maximum is a positive whole number, including the captain, coach and substitutes. It is a maximum only: a one-person team is valid, and no coach, substitute or complete set of player slots is required. No participants are created for empty slots.

**Your selected default:** games without configuration require roles and allow at most **8 people** for new or edited team registrations. Blank maximum uses this default. Historical game rows are not backfilled, and historical rosters are not truncated.

Configured maximums can be greater than eight, but this phase has only eight distinct named roles. Each role can be used once, so the enabled role count also limits how many people can register. Supporting more than eight distinct participants would require additional roles in a later change.

Rules are stored globally on `games` and used by its Team competitions. No event-specific overrides are needed for this phase. **Each competition's Solo/Team mode remains authoritative**: changing a game's catalogue reference never converts a competition or changes unrelated competition records. Roster fields are hidden for Solo/Unspecified catalogue references; saved rules still apply to existing Team competitions for that game.

## Existing registrations and stricter rules

Older participants show **Unassigned** until roles are deliberately assigned on edit. No historical roles are invented. Larger historical rosters remain available for viewing, exporting and cancellation.

When a proposed maximum or role selection conflicts with an existing roster, the game editor shows the number of affected rosters and a confirmation checkbox. The database independently requires confirmation. Historical/cancelled entries are included in this warning. Saving confirmed stricter rules does **not** delete or change participants. Any later roster edit must comply with current rules, including assigning missing roles and reducing the count when necessary.

New and edited registrations enforce the same rules in the form, server action and database RPC. Direct RPC calls also reject excess people, duplicate/unavailable roles and non-Player captains. Saves remain atomic. Player edits/cancellation retain database-clock deadlines and ownership checks. Administrators retain their deadline override, but cannot bypass roster rules. One active player registration per captain/competition and RLS protections remain in place.

## Forms and reports

Player and admin forms show clan names, current count/maximum, remaining places, available roles and clear errors. Add Participant stops at the maximum or when all enabled roles are used. Reordering/removing a teammate preserves their role and all contact fields; the captain stays first. Manual entries still require no captain account.

My Registrations shows solo/team clans, actual team roles and a separate Captain label. Admin registration details/editing use the same form and validation.

Both individual and full-event Excel exports retain existing columns A–K. **Player Role** now contains the assigned gameplay role, **Unassigned** for historical team participants or **Solo** for solo players. Two columns are appended:

- **L: Registration Captain** — Yes/No for team participants.
- **M: Team Maximum Size** — current effective game maximum for team participants.

Clan Name includes solo and team clans. Only active registrations are exported. Owner email still appears only on the captain/solo row; teammate and manual-entry emails remain blank. Phone/UID text values, Colombo timestamps, normal gridlines, borders, frozen headings and filters are preserved. The maximum is the current configuration, not a historical snapshot.

## Manual verification after applying the migration

Use a disposable event and test accounts:

1. Register a solo player with a clan; edit and remove it before the deadline. Check My Registrations, admin details and Excel. Solo must remain Solo even when the game's catalogue reference is Team.
2. Configure VALORANT for eight people/all eight roles. Save teams of 1, 3, 5, 7 and 8 people. Empty roles must not create participants. Try nine people, repeated roles and a Coach/Substitute captain: all must fail.
3. Configure Free Fire for six people with Player 1–4 and Substitute 1–2. Save teams of 1, 4, 5 and 6 people. Seven people and Player 5/Coach must fail.
4. Move and remove teammates. Check that names, IDs, phones and roles stay together; Add Participant disables at the cap. Check on mobile.
5. Create/edit an admin manual entry and edit a player entry after its deadline. Roster rules still apply, and player ownership/source must remain unchanged.
6. Review a historical Unassigned roster. Reduce a game's maximum below an existing team count or remove an assigned role. Confirm the warning; verify the old participants remain stored and displayed, while an unchanged invalid roster cannot be saved again.
7. Export a competition and the full event. Verify clans, actual roles, separate captain flags, current maximum, exact phones/UIDs, permitted email, totals and gridlines. Cancel an entry and confirm it remains in the database but disappears from the export.
8. Check signed-out/player denial of admin configuration, another player's edit denial, registration deadlines and duplicate-registration protection.

## Verification

ESLint, TypeScript, all **78 automated tests** and the production build passed. The updated RPCs also pass forced insertion-failure tests that verify both roster and registration metadata roll back together.

Automated tests apply the real migrations in disposable PostgreSQL (PGlite) with simulated Auth/Storage. Phase 6.5 tests cover legacy 12-person preservation, solo clan creation/editing, role uniqueness, maximum-only team sizes, unavailable roles, captain rules, admin-only configuration/confirmation, direct-write denial, deadline/owner checks, manual entries, cancellation and XLSX exports. Rendering tests inspect actual form components and participant movement. The existing authentication, registration, admin, image and export regression tests also run.

A temporary local preview used synthetic data to check desktop/mobile layout, participant reordering/removal and disabled Add Participant at six people. A stale development-server module was refreshed; the refreshed page had no browser warnings/errors. The preview route was removed before the production build.

These checks are **not live Supabase verification**. Apply the migration and complete the checklist above. Multi-session races on hosted Supabase and native Microsoft Excel rendering remain manual checks. No production data was changed and deployment was not started.

## Changed files

- Migration: `supabase/migrations/202610120003_phase65_rosters.sql`.
- Shared rules/data/actions: `src/lib/registrations/roster-rules.ts`, `policy.ts`, `data.ts`, `actions.ts`; `src/lib/admin/data.ts`, `actions.ts`, `policy.ts`.
- Forms/styles: `src/components/registrations/registration-form.tsx`, `src/components/admin/game-editor.tsx`, `src/app/globals.css`.
- Pages: `src/app/admin/games/page.tsx`, `src/app/admin/registrations/new/page.tsx`, `src/app/admin/registrations/[id]/page.tsx`, `src/app/dashboard/registrations/page.tsx`, `src/app/dashboard/registrations/[id]/edit/page.tsx`, `src/app/tournaments/live/[slug]/register/[competitionId]/page.tsx`.
- Live model: `src/lib/tournaments/live.ts`, `live-model.ts`, `src/types/tournament.ts`.
- Exports: `src/lib/admin/export-workbook.ts`.
- Tests: `tests/phase65-database.test.mjs`, `phase65-ui.test.mjs`, `registration-policy.test.mjs`, `game-management.test.mjs`, `excel-export.test.mjs`.
- Documentation: this guide, `README.md`, `docs/phase6-excel-exports.md`.
