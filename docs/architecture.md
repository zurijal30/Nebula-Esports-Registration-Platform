# Nebula architecture

Phases 1–6 use Next.js App Router, official Supabase SSR clients and PostgreSQL. Nebula Esports is the only organiser. Roles are player and admin. Setup guides: [Auth and foundation](supabase-setup.md), [player registrations](phase4-registration.md), [admin management](phase5-admin.md), and [Excel exports](phase6-excel-exports.md).

## Events and public browsing

Local demonstration events remain in `src/data/tournaments.ts`, use separate routes and cannot submit registrations. Published Supabase events use `/tournaments/live/[slug]` and the live adapter. Each competition has independent windows, format, availability, venue and informational fee. All display/input times use Asia/Colombo; database values are timestamptz.

Events, games and competitions retain stable IDs. Event slugs are fixed after creation. Admin saves use validated database functions; direct API writes are revoked. Cancel/unpublish preserves registration records. A registered competition's game and format cannot change. [Permanent event deletion](admin-event-deletion.md) is an admin-only, exact-name-confirmed RPC that atomically deletes only the selected event's dependent records. Banner cleanup happens afterward through Storage, with retained receipts for retry.

Public queries are fresh per request. Admin saves invalidate route caches. A public change counter updates through Realtime and triggers refreshes in open public tabs, including unpublication. The counter exposes no private event, account or registration details. Focus/reconnection and a 15-second fallback handle interrupted subscriptions. Dashboard totals come from PostgreSQL, not invented examples or list sizes.

## Registrations

Player entries belong to their authenticated owner. Only a team captain needs an account. Rosters contain full name, IGN, UID and phone; account email is the contact email. Team/clan are registration fields, with no fixed roster limit or teammate accounts.

Player RPCs derive ownership and type, validate published/available competition windows using the database clock after lock waits and at completion, and save or replace rosters atomically. A partial unique index permits one active owner entry per competition. Cancellation retains records and allows another entry while open.

Admin RPCs verify the current database role and may edit/cancel after deadlines. They preserve source, ownership and status. Cancelled entries can be corrected without reactivation. No restoration capability exists.

Manual entries have null owner, source admin and a real administrator creator. They remain private to administrators. A unique request key makes a repeated form submission return the original entry without creating a duplicate. No fake Auth accounts are created. Separate newly opened forms represent separate entries and require ordinary duplicate-participant review.

## Event images

The shared renderer uses model-driven image references on cards, homepage previews and detail pages, with a responsive 16:9 fallback. Admins upload JPEG, PNG or WebP through the event interface; the server decodes, validates and re-encodes WebP while limiting size/pixels.

The private `nebula-event-banners` bucket allows only reserved, unique admin uploads and prevents overwrites. Published current banners are served through `/event-images/[eventId]/[assetId]` with no-store headers. Draft/retired files stay private. Versioned asset URLs and public refresh handling avoid stale replacements.

Upload reservation, activation and retirement are tracked in `event_banner_assets`. Successful uploads replace metadata atomically; failures retain the existing image. Retired or expired pending files are cleaned through the Storage API, with completion markers and retry support. Files still referenced by any event are protected. Banner changes never recreate event/competition IDs or touch registration records. Existing external image URLs are not deleted by the app.

## Accounts and permissions

Protected pages/actions verify Auth identity and a trusted database profile role. Every privileged RPC independently checks the current role and holds an authorization lock while it runs. RLS protects player/roster reads; direct registration writes remain revoked.

Admin user email access is limited to a secured database function. Role changes are serialized, require confirmation, disallow self-change and preserve the last administrator. Column grants prevent player role changes. No passwords, service-role keys, public promotion endpoint or account deletion interface are exposed.

## Excel reporting

Phase 6 uses ExcelJS on Node server routes for individual competitions and event workbooks with one sheet per game. `admin_export_registrations` returns a single consistent JSON snapshot of the selected event's active registrations, current rosters and permitted Auth owner emails. It independently verifies admin authorization and bypasses PostgREST row caps without N+1 requests. No new tables or participant fields are introduced.

Download responses are private/no-store and validate event/competition scope. Captains and solo players receive linked owner emails; teammates and account-free manual entries have blank email cells. Phones/UIDs and formula-like text are literal XLSX strings. Dates display Colombo wall time. Exports reject more than 50,000 registrations or participants instead of truncating. The synchronous JSON/workbook pipeline is buffered in memory; larger workloads may need a later background export design.

## Later scope

Do not add external organisers, staff roles, payment processing/tracking, approvals, waitlists or registration capacity rules. Phase 5 deployment and live verification limits are recorded in its setup guide.
