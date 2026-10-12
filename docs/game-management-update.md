# Game management update

Adds game deletion, informational Solo/Team classification, game banners and responsive public competition cards. Existing Excel exports are preserved; no additional export work or deployment is included.

## Apply the migration once

1. Open `supabase/migrations/202610120001_game_management.sql` in your editor.
2. Copy the entire file, including `begin;` and `commit;`.
3. Open your existing **Supabase project → SQL Editor → New query**.
4. Paste the SQL, click **Run**, confirm success, then refresh **Admin → Games**.

The Phase 3, Phase 4, Phase 5 admin and event deletion migrations must already be applied. This update is independent of the existing Excel export migration. For a fresh database, apply all migrations in timestamp order. Do not rerun older migrations or reset your database.

Existing games, competitions, registrations and event banners are preserved. Existing games receive an Unspecified reference classification. The migration creates deletion functions but does not call them. No live migration, game deletion or Storage cleanup was executed during implementation.

### If banner upload shows DatabaseError

Apply **`supabase/migrations/202610120002_storage_banner_upload_fix.sql`** once, using the same SQL Editor steps above. This file replaces only the game/event upload reservation guards; it does not delete or replace images, games, registrations or Storage policies. Do not rerun the original game-management migration. Refresh the Games tab, edit the existing saved game, select the image again and save.

Supabase Storage checks permissions as the caller and completes the object write under its internal service role. The original guard incorrectly required a player `auth.uid()` in the internal write. The correction validates the actual database role, explicit object owner, matching pending reservation and creator's current admin role. A regression test reproduces the old rejection and confirms internal completion succeeds after the fix while wrong/missing owners, ordinary players, expired reservations and demoted admins remain blocked. See [Supabase's upload implementation](https://github.com/supabase/storage/blob/master/src/storage/uploader.ts).

The corrective migration was tested locally, not applied to your live database. If upload still fails afterward, inspect the failing request in Supabase **Logs → Storage** for its database error; the app's generic DatabaseError alone does not expose the underlying PostgreSQL error.

## Features and usage

- **Add/Edit Game:** name, reference Game Type (Solo, Team or Unspecified), visibility, optional Game Banner and preview. Game IDs and URL slugs stay fixed on edit.
- **Banner:** JPG, PNG or WebP up to 5 MB / 24 megapixels. A wide 16:9 image works best. Leave blank to keep it, select another image to replace it, or check removal to restore the fallback.
- **Delete Game:** red outlined trash button beside Edit Game. Dialog shows the name and count of referencing event competitions. Every reference blocks permanent deletion, including unpublished, past and cancelled competitions. For an unused game, type its exact current name to enable deletion. Hide a referenced game when appropriate.
- **Public cards:** game image on the left, event label/game name/details in the middle and actual competition Solo/Team badge on the right. Mobile stacks content. Deadlines, status and Register/View Registration/Edit Registration actions are preserved.
- **Clean unused game images:** retry failed cleanup. Current/shared images are kept; abandoned uploads have a one-hour grace period.

Global Game Type is informational. Competition-specific `registration_type` remains authoritative for badges, registration and roster validation. No team sizes are invented or restricted.

## Data and Storage changes

New game columns: nullable `reference_type`, `banner_url`, `banner_alt`. New `game_banner_assets` table tracks immutable UUID paths and pending/active/retired/deleted states. Asset receipts outlive deleted games to support cleanup retries.

New private bucket: **nebula-game-banners**. Existing event bucket and policies are unchanged. Server actions verify administrators and decode/re-encode files with Sharp, checking actual format, corruption, size and pixel limits. Uploads become WebP with no overwrite. Public records use versioned `/game-images/{gameId}/{assetId}` references served through RLS and a no-store image endpoint. No privileged keys are used in the browser.

Database RPCs independently require an administrator. Direct table writes stay revoked. Restrictive Storage policies guard against unrelated broad policies. A trigger locks the latest reservation state to reject late uploads after retirement/deletion. Cleanup checks every game and event reference; fallback files are never candidates. Existing public change-counter triggers include game changes, so updates use the existing Realtime/focus/polling refresh.

Games are referenced by `event_games` with FK RESTRICT; registrations reference competitions and players reference registrations. The delete RPC locks the selected game, checks its exact name and blocks any competition reference. FK RESTRICT also protects concurrent competition insertion. It never cascades. Repeated requests return an unavailable-record error.

## Manual checks after migration

Use an admin account and a disposable game:

1. Add a Solo game without a banner; confirm badge and fallback.
2. Edit its reference to Team; verify an existing Solo competition stays Solo.
3. Upload a JPG/PNG/WebP; verify preview and public banner on desktop/mobile.
4. Replace then remove it; verify public updates and the event's main image remains unchanged.
5. Try an unsupported file and a file over 5 MB; both must fail.
6. Verify referenced-game deletion is blocked. For an unused disposable game, test a wrong name then the exact name; delete only that disposable game if desired.
7. Verify ordinary players cannot perform admin mutations/uploads.
8. Verify Register/View Registration/Edit Registration, deadline enforcement and existing rosters remain intact.

## Validation and limitations

Automated tests cover actual migrations in disposable PostgreSQL, admin/RLS boundaries, creation/edit/classification independence, historical deletion blocking, banner upload/replacement/removal/shared cleanup, expired reservations, real image decoding, live mapping and actual component rendering. Existing auth, registration, event deletion and export regressions also run. ESLint and TypeScript passed; all 63 automated tests passed; the production build passed.

Browser checks used synthetic data at 1280px desktop and 375px mobile, with no horizontal overflow. The referenced-game dialog showed the count and disabled deletion. The temporary preview route was removed before production build.

Live signed-in Supabase flows require verification after applying the migration. Metadata save and Storage upload are separate: if upload/attachment fails, game details remain saved, the previous image is preserved, and the form reports the partial result and retains the game ID for retry. Cleanup failures do not undo saves/deletion. Realtime refresh is immediate when connected; the existing fallback polls every 15 seconds and refreshes on focus. Current competition data has no specific team-size field, so badges display Solo or Team.

## Files changed

- `supabase/migrations/202610120001_game_management.sql`.
- Admin: `src/lib/admin/actions.ts`, `data.ts`, `policy.ts`, new `game-policy.ts`; `src/app/admin/games/page.tsx`; `src/components/admin/editors.tsx`, new `game-editor.tsx`, `delete-game.tsx`, `game-cleanup.tsx`.
- Public: `src/lib/tournaments/live.ts`, `live-model.ts`; `src/types/tournament.ts`; `src/app/tournaments/live/[slug]/page.tsx`; `src/app/dashboard/registrations/page.tsx`; `src/components/tournaments/competition-list.tsx`; new `src/lib/game-image.ts`, `src/app/game-images/[gameId]/[assetId]/route.ts`, `public/images/games/default-banner.svg`; `src/app/globals.css`.
- Tests: `tests/admin-database.test.mjs`, new `tests/game-management.test.mjs`.
- Documentation: this guide and `README.md`.
