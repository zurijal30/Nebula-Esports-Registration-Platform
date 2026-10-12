# Admin event deletion

Every card in **Admin → Events** now has **Edit Event** and a red **Delete Event** button. Delete opens a dialog showing the event name, competition count and all registration counts (including cancelled entries). Type the exact current event name to enable **Permanently Delete Event**. Cancel closes the dialog without submitting.

Deletion permanently removes the selected event, its competitions, registrations and roster records. Global games, profiles, Auth accounts and other events remain. Cancel Event remains a separate option that preserves records.

## Apply the new migration

Run this in **Supabase SQL Editor**, not PowerShell:

1. Make sure the Phase 3, Phase 4 and original Phase 5 migrations have already succeeded. Do not rerun them.
2. Open [202610110004_admin_event_deletion.sql](../supabase/migrations/202610110004_admin_event_deletion.sql).
3. Copy the entire file into **Supabase → SQL Editor → New query**.
4. Click **Run** once. If it reports an error, share the error before retrying.
5. Open your website, sign in as an administrator, and go to **Admin → Events**.

The migration does not delete any existing event or registration. It adds the secured deletion function, updates banner cleanup tracking and checks upload reservations under a row lock to reject late uploads to a deleted event. No new environment variables are needed. This migration has not been run against the connected project automatically.

## Banner cleanup and failures

The database deletion is one transaction. Uploaded files are removed afterward using the Storage API. Only the selected event's tracked, unreferenced upload paths are attempted. Default images, externally hosted URLs and banners referenced by another event are preserved.

If Storage fails, the event stays deleted and the result explicitly reports unfinished banner cleanup. Use **Retry unused-image cleanup** on Admin → Events. This retry is also available after navigating away or if the deletion response was interrupted. Asset metadata remains as cleanup receipts; it contains no registration/player data. Shared banners remain available until their last reference is removed, then become eligible for cleanup.

If a database deletion fails, PostgreSQL rolls back every dependent deletion. The UI shows an error and retains the card. If a response is interrupted, refresh the list before retrying: a repeated request for a deleted event returns an unavailable error rather than claiming a second success.

## Test with a disposable event

Only deliberately delete an event you created for this test:

1. Create and publish a disposable event with solo/team competitions, an uploaded banner and active/cancelled test registrations. Keep an unrelated event with registrations for comparison.
2. On Admin → Events, click its Delete Event button. Confirm the displayed counts include cancelled registrations. Wrong names must keep the final button disabled; Cancel must preserve everything.
3. Type its exact name and confirm permanent deletion. Check the success message and that the card, dashboard counts, public directory and another open public tab update.
4. Open the old `/tournaments/live/<slug>` URL: it must show Not Found. Verify the unrelated event, its entries, global games and user accounts remain intact.
5. If cleanup fails, confirm the message says the event was deleted but cleanup is unfinished. Retry from the Events listing and verify the owned file is removed. Never remove a shared/default image to simulate failure.
6. An ordinary player must be denied admin pages and direct `admin_delete_event` calls. An administrator's RPC call with the wrong name must also fail.

## Verification and limitations

Automated tests use disposable PGlite databases with simulated Supabase Auth/Storage schemas. They cover all four migrations, admin/player/anonymous authorization, exact confirmation, scoped deletion including cancelled entries, forced deletion rollback, repeated requests, preservation of unrelated registrations/games/profiles, shared banners and retryable cleanup. Rendered React tests check each card's target, counts, closed dialog and disabled confirmation; the actual public route's missing-event branch is checked separately. Cleanup unit tests simulate Storage failures.

A local browser interaction check verified opening, wrong/exact names, Cancel and mobile sizing without submitting deletion. Its temporary preview route was removed before the production build.

Completed checks: ESLint, TypeScript, all **47 automated tests**, and the production build passed.

Live Supabase deletion, actual Storage HTTP cleanup and Realtime delivery remain unverified until the migration and disposable-event checklist are completed. PGlite uses one connection and does not prove cross-session races. To protect concurrent writes, the RPC briefly locks the event, competition, registration, roster, asset and Storage object tables during deletion. Concurrent writes can wait; PostgreSQL may abort a conflicting transaction with a deadlock error, which rolls back safely and requires retry. Large events may hold these locks longer.

Changed files: the new migration; `src/lib/admin/actions.ts`, `policy.ts`, `event-deletion.ts`; `src/components/admin/catalogue.tsx`, `delete-event.tsx`, `banner-cleanup.tsx`; `src/app/admin/events/page.tsx`, `src/app/globals.css`; `tests/admin-database.test.mjs`, `event-deletion.test.mjs`, `event-deletion-ui.test.mjs`; this guide and the Phase 5/architecture/README links. Previously applied migrations are unchanged.
