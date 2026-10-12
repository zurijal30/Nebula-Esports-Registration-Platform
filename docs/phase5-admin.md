# Phase 5: admin management

Phase 5 adds the administrator console at `/admin`.

## What is included

- Real dashboard totals for events, publication, upcoming schedules, registrations and player accounts.
- Create/edit event drafts, publish/unpublish, cancel and search events.
- Add/edit game catalogue titles and independent solo/team competitions.
- Upload, preview, replace and remove event banners using private Supabase Storage.
- Search/filter all registrations, view complete rosters, edit and cancel entries after player deadlines.
- Manually register participants without creating fake accounts.
- View/search user profiles and emails; confirm trusted role changes with last-admin protection.

Player registration rules remain unchanged. Event edits, schedules, publication, cancellation and banners preserve registration IDs, owners and rosters. Existing event URL names remain fixed. Games and formats cannot change once a competition has any registration, including cancelled entries. The [event deletion addition](admin-event-deletion.md) allows an administrator to deliberately delete an entire event and its entries with exact-name confirmation. There are no separate competition or account deletion controls.

## 1. Apply the migration

Run this part in **Supabase SQL Editor**, not PowerShell. Your Phase 3 and Phase 4 migrations are already applied, so only run the new Phase 5 file.

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the following check and click **Run**:

```sql
select lower(trim(title)) as title, count(*)
from public.games
group by lower(trim(title))
having count(*) > 1;
```

3. If the result shows **no rows**, continue. If it shows duplicate titles, stop and share that result so the names can be corrected without deleting games.
4. Open [202610110003_phase5_admin.sql](../supabase/migrations/202610110003_phase5_admin.sql) in your project. Select all its contents (**Ctrl+A**) and copy (**Ctrl+C**).
5. In Supabase SQL Editor, open another **New query**, paste the complete file, then click **Run** once.
6. If it succeeds, the migration is complete. Continue to **2. Storage setup** below. If it reports an error, share the error before trying again.

This adds the admin database functions, banner storage setup and safeguards. Existing events and registrations are preserved. Do not rerun the Phase 3/4 migrations or reset the database.

## 2. Storage setup

The migration creates **`nebula-event-banners`** automatically:

| Setting | Value |
| --- | --- |
| Bucket visibility | Private |
| Stored format | WebP |
| Maximum stored file | 5 MB |
| Upload/delete access | Administrators only |
| Public reads | Current banner of a published event |

Do not make the bucket public. JPEG, PNG and WebP input files are accepted through the admin form, fully decoded and re-encoded on the server. The app rejects unsupported, corrupt, animated or oversized images; input is limited to 5 MB and 24 megapixels. Images are resized within 2400 × 2400 and stripped of original metadata. The server-action request limit is 6 MB to accommodate upload overhead.

Each upload reserves a unique `<event UUID>/<asset UUID>.webp` path. Only the reserving admin can upload to that pending path; overwrites are blocked. Event metadata is changed only after upload succeeds. Every replacement creates a new `/event-images/<event UUID>/<asset UUID>` URL. That route checks current metadata/publication and returns image bytes with `no-store`; cards, the homepage and details share the same fallback-aware image component.

Replaced/removed images are retired, then deleted through the Storage API. Current images and any file still referenced by another event are protected. Failed/incomplete uploads remain tracked; **Clean unused images** retires pending uploads older than one hour and retries physical cleanup. It marks completed deletions so later batches progress. No Storage object is deleted by SQL. Run cleanup after interrupted uploads; cleanup failures do not undo a saved banner.

Restrictive bucket policies keep these protections even if unrelated buckets have broader policies. Existing external banner URLs remain usable until replaced or removed; the app does not attempt to delete externally hosted files.

## 3. Environment and Realtime

Keep the existing `.env.local` values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SITE_URL=http://localhost:3000
```

No service-role key or new production secret is required. Restart after environment changes.

The migration adds `public.event_public_refresh` to `supabase_realtime` if that publication exists. In Supabase → Database → Publications, confirm this table is enabled. Only a change counter is broadcast; private user/registration data and draft event details are not published. Public tabs refresh on counter changes, including unpublishing, and after reconnect/focus. A 15-second check provides a fallback when Realtime is unavailable. New page requests always query fresh event data; admin saves invalidate route caches. No events, Auth users or registrations need to be added to Realtime.

## 4. Manual registrations and roles

Manual entries have `source = admin`, `captain_id = null`, and the real administrator in `created_by`. No Auth user or profile is invented. They are managed from `/admin/registrations`, not a player's dashboard. Captain information is the first roster record; teammates have no accounts. A unique request key prevents repeated submissions of the same form from creating extra entries. Opening a new form starts a new entry; independently entered duplicate participants still require administrator review.

Editing keeps ownership, source and status intact. Admins may correct cancelled records, but saving never reactivates them. There is no restoration feature. Player-created entries retain the existing one-active-owner-per-competition constraint and player deadlines.

User emails are returned by an admin-only database function rather than browser service credentials. Role changes require explicit confirmation, a verified admin session and a current database role check. You cannot change your own role. To replace the initial owner, promote another trusted account and have that administrator change the original owner's role. Serialized changes and database triggers protect the final admin. There is no password viewing, account deletion or public promotion endpoint.

## 5. Test the admin system

Sign in with an existing verified admin account after applying the migration. If no administrator exists yet, use the trusted [first-admin setup](supabase-setup.md#first-administrator); do not expose a public promotion endpoint.

1. **Dashboard:** compare totals with your database. Empty data should show real zeros; failures should show an error.
2. **Games:** add/edit a title. Try the same title with different letter case; duplication should fail. Hiding a game must preserve competitions and entries.
3. **Events:** create a draft, add solo/team competitions with different registration windows, then publish it. Verify the homepage/directory/detail pages update. Check Colombo inputs and invalid date errors.
4. **Banners:** upload JPEG/PNG/WebP, verify preview, replace and remove. Check cards and details in another open public tab. Try an invalid/oversized file. Draft banners must not be publicly readable. Run unused-image cleanup.
5. **Preservation:** register a player, then change event text, venue, dates and image. Unpublish/cancel the event. Existing entries, owners and player details must remain. Attempts to change the registered competition's game/format must fail.
6. **Registrations:** search/filter by event, game and status. Add a manual solo/team entry with seven or more teammates. Repeat the same submitted request: it must return the same entry. Edit a player entry after its deadline, then cancel it. Correcting a cancelled entry must keep it cancelled.
7. **Users:** search/filter accounts and inspect role/email/phone/date. Confirm a role change on another test account. Check self-change and last-admin safeguards.
8. **Permissions:** repeat admin URLs/RPCs and Storage uploads as an ordinary player. Access must be denied; other players' private entries must remain hidden. Recheck the existing player registration flow.

Use disposable events/accounts for tests. Do not run destructive SQL or test role demotions against an unreviewed production owner.

## 6. Automated checks

In PowerShell:

```powershell
cd "C:\Users\zuhry\OneDrive\Desktop\nebula-esports"
$runtimeTools = "C:\Users\zuhry\.cache\codex-runtimes\codex-primary-runtime\dependencies"
$env:Path = "$runtimeTools\bin\fallback;$runtimeTools\node\bin;$env:Path"
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-phase5-live.mjs
```

With the app running, also run `node scripts/check-phase5-routes.mjs`. Existing auth/Phase 4 route checks remain available. The live diagnostic uses anonymous public reads and permission probes only; it never prints private records or modifies production data.

Tests execute the Phase 3/4/5 migrations and the event deletion addition in disposable PostgreSQL with simulated Auth and Storage schemas. They cover authorization, event/game/competition validation, publication privacy, registration preservation, manual retry keys, roster rollback, admin deadline overrides, cancellation, user roles, banner processing and Storage RLS, including a simulated unrelated broad Storage policy. PGlite queues a single connection: real multi-session races and actual Storage HTTP/file deletion require the live checklist.

## Verification limits

Phase 4 live submission/edit/cancellation were confirmed by the user before Phase 5. Local Phase 5 tests, lint, TypeScript/build, anonymous route protection and responsive forms are checked separately. The temporary component preview used for desktop/mobile checks was removed from the final application; no live statistics were invented and no uploads were saved to Supabase during review.

The connected project still lacks Phase 5 tables/functions (`PGRST205` / `PGRST202`). The migration was not applied automatically. Live administrator mutations, user role changes, Supabase Storage HTTP operations and Realtime delivery therefore remain unverified until setup and manual testing. Public Phase 4 reads and anonymous registration denial remain operational.

Admin lists fetch records in batches to avoid Supabase's default result limit; filtering happens in the authorized admin browser. Very large catalogues may need server-side pagination later. Dashboard counts are computed in PostgreSQL and do not depend on fetched list size. Inactive games and unpublished events pause player changes; admins retain access. Optional competition starts are resolved from the event start when saved and remain independent afterward.

Excel exports, payments/payment statuses, capacity limits, waitlists, approvals and account deletion are not implemented.

## Changed files

- Migration: `supabase/migrations/202610110003_phase5_admin.sql`.
- Admin routes: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/events/page.tsx`, `src/app/admin/events/new/page.tsx`, `src/app/admin/events/[id]/page.tsx`, `src/app/admin/games/page.tsx`, `src/app/admin/registrations/page.tsx`, `src/app/admin/registrations/new/page.tsx`, `src/app/admin/registrations/[id]/page.tsx`, `src/app/admin/users/page.tsx`.
- Admin components: `src/components/admin/admin-form.tsx`, `banner-form.tsx`, `catalogue.tsx`, `confirmation-form.tsx`, `editors.tsx`, `navigation.tsx`, `unavailable.tsx`.
- Admin server/domain: `src/lib/admin/actions.ts`, `data.ts`, `banner.ts`, `policy.ts`.
- Public integration: `src/app/event-images/[eventId]/[assetId]/route.ts`, `src/components/tournaments/live-refresh.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- Shared registration compatibility: `src/components/registrations/registration-form.tsx`, `src/lib/registrations/data.ts`.
- Checks: `tests/admin-database.test.mjs`, `tests/admin-policy.test.mjs`, `scripts/check-phase5-live.mjs`, `scripts/check-phase5-routes.mjs`.
- Config/docs: `next.config.ts`, `package.json`, `pnpm-lock.yaml`, `README.md`, `docs/architecture.md`, `docs/supabase-setup.md`, `docs/phase4-registration.md`, `docs/phase4-technical-notes.md`, this guide.

Implementation references: [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control), and [Realtime Postgres changes](https://supabase.com/docs/guides/realtime/postgres-changes).
