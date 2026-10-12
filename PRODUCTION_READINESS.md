# Nebula Esports — Phase 7C production readiness

Reviewed **12 October 2026, Asia/Colombo**.

**READY AFTER MANUAL CONFIGURATION.** Local validation and anonymous hosted checks pass. Production URLs, email delivery, Google OAuth credentials/allowlists, the Phase 7A correction and authenticated hosted journeys still require administrator verification. This is preparation for Phase 7D, not approval to launch with those items unfinished.

No deployment, hosting resource creation, migration application, database reset, record deletion, registration edit or hosted setting change was performed. Existing Phase 7A/7B work was preserved.

## A. Current application and inspection results

The existing Next.js App Router application supports real published tournaments, email/password and Google authentication, player accounts, trusted administrator roles, solo/team registrations, optional clans, configurable participant roles/maximums, event/game management, private Storage banners and administrator Excel exports. The supported-game ticker is independent of tournament/database records.

| Area inspected | Evidence / result | Remaining check |
| --- | --- | --- |
| Database | All nine versioned migrations reviewed alongside the existing disposable PostgreSQL security suites. Nine application tables retain RLS; SECURITY DEFINER functions use restricted search paths and grants. Unique slugs, event/game association, active-owner registration uniqueness, foreign keys, deadline checks and query indexes are covered. | Compare actual hosted definitions, grants, policies and migration history as administrator. Anonymous schema access cannot establish those definitions. |
| Authorization | Server pages/actions verify Auth identity and matching `profiles.id` plus the database role. Caller-controlled metadata does not grant admin access. Ordinary callers and direct writes are rejected in PostgreSQL tests. | Signed-in two-user/admin and role-revocation checks on disposable data. |
| Hosted public checks | Auth settings and six public schema probes succeeded; anonymous reads of profiles/registrations/players and three administrator reporting RPCs were denied with `42501`. | These probes do not verify all hosted policies or mutations. |
| Storage | `nebula-event-banners` and `nebula-game-banners` are private buckets in migrations, with admin-only reserved-path uploads/cleanup and published/active read restrictions. Actual image decoding, ownership and shared-image protection have regression coverage. | Verify actual bucket settings, restrictive policies, upload/replace/remove and interrupted-upload cleanup. |
| Authentication | Actual sign-in/signup/reset/password/profile/logout actions and callback handlers have automated coverage. SSR cookies are read/written through the current `@supabase/ssr` integration; Proxy refreshes claims; protected handlers verify with `getUser`. | Hosted email/Google round trips, refresh/expiry, reload and logout in relevant browsers. |
| Public data | Published-only paginated Supabase queries; active game mapping; real windows/dates/fees; local-route aliases resolve real events; deleted/missing events return 404; empty/error states are distinct. | Signed-in admin publication/deletion and cross-session refresh on disposable events. |
| Runtime/security | Excel export explicitly uses Node.js and force-dynamic; generated XLSX stays in memory. No persistent writable filesystem assumptions found in application server routes. Callback/export/image responses have private/no-store headers. No raw token/participant logging found in application source. | Vercel environment, build logs, plan limits and deployed caching remain untested. |

### Confirmed compatibility corrections

- Banner input and processed output now cap at **4 MiB (4,194,304 bytes)**. Both admin forms explain the limit; client and server reject oversized files. Next's complete Server Action body cap is **4,450,000 bytes**, leaving multipart room below the platform ceiling. Existing 5 MiB Storage bucket ceilings remain unchanged; existing images/registrations are untouched.
- Buffered Excel downloads above **4 MiB** return an authorized, private HTTP 413 JSON response asking for a smaller competition. Existing 50,000-registration/participant safeguards remain. This prevents returning an oversized file but does not eliminate workbook generation time/memory costs.
- `package.json` now specifies **Node 24.x**, matching the tested runtime and the planned Vercel setting. ExcelJS stays in Node; no Edge conversion was made.

Vercel documents a **4.5 MB request/response ceiling** for Functions. The application uses smaller limits; it does not bypass the platform limit. [Function limits](https://vercel.com/docs/functions/limitations). Node 24 is supported for builds/functions. [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## B. Supabase setup and corrective migration

### Migration inventory

The established project workflow is to review versioned SQL and run the complete file in **Supabase → SQL Editor → New query**. Do not mix an untracked SQL Editor history with an assumed CLI migration history.

| Order | File |
| --- | --- |
| 1 | `supabase/migrations/202610110001_phase3_foundation.sql` |
| 2 | `supabase/migrations/202610110002_phase4_registration.sql` |
| 3 | `supabase/migrations/202610110003_phase5_admin.sql` |
| 4 | `supabase/migrations/202610110004_admin_event_deletion.sql` |
| 5 | `supabase/migrations/202610110005_phase6_excel_exports.sql` |
| 6 | `supabase/migrations/202610120001_game_management.sql` |
| 7 | `supabase/migrations/202610120002_storage_banner_upload_fix.sql` |
| 8 | `supabase/migrations/202610120003_phase65_rosters.sql` |
| 9 | [202610120004_phase7a_shared_event_banners.sql](supabase/migrations/202610120004_phase7a_shared_event_banners.sql) |

Earlier files are prerequisites, not instructions to rerun them against an existing project. The new correction was **not applied during Phase 7C**. Its hosted application status is unconfirmed; treat it as pending until definitions are verified. Public REST access cannot read `pg_get_functiondef` or the administrator's SQL history.

### What the Phase 7A correction does

The transaction replaces `public.admin_set_banner(uuid,uuid,text)` and `public.admin_unused_banners()`, retains their authenticated-only grants and internal administrator requirement, and repairs retired event-banner metadata still referenced by an event.

Replacing/removing an event's image must not retire a shared image used by another event. Cleanup must also retire unreferenced active assets after their final reference ends, even if their original event still exists. Without the correction, shared images can stop displaying or unused assets can escape cleanup.

Only referenced retired `event_banner_assets.state` values are repaired during application. Event URLs, image bytes, game configurations, registrations, rosters and owners are not rewritten. The cleanup function's later invocation still retires old pending uploads and returns eligible paths; application itself does not delete objects.

No planned downtime is required for this small transaction, but function replacement and row updates acquire locks. Apply during low activity, review affected row counts and avoid concurrent banner management/cleanup. Long-lived transactions can delay completion. The repair cannot restore image bytes already missing from Storage.

### Manual backup and application procedure

1. Identify the intended Supabase project and confirm migrations through Phase 6.5 are present. Record current event/game/banner and registration counts locally, without publishing participant data.
2. Check the latest dashboard backup/PITR availability for the project's plan and recovery point. If unavailable, export an off-site backup using a compatible Supabase CLI/PostgreSQL workflow. Keep credentials outside the repository and logs. Verify the backup can be restored to an isolated disposable project before relying on it. [Database backups](https://supabase.com/docs/guides/platform/backups).
3. For a separately configured, correctly linked CLI, the documented backup pattern is `supabase db dump --linked --role-only -f roles.sql`, `supabase db dump --linked -f schema.sql`, and `supabase db dump --linked --data-only --use-copy -f data.sql`. Verify coverage of Auth/custom schemas using the backup guide; a default schema-only dump is not a full data backup. Keep exports in a private off-repository location. CLI setup/linking is a manual prerequisite, not something performed in this task. [CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
4. Separately back up Storage object bytes and relevant hosted Auth/SMTP/provider settings. Database backups include Storage metadata, **not the actual stored files**. [Backup scope](https://supabase.com/docs/guides/platform/backups).
5. Save the two current function definitions (`pg_get_functiondef`) and affected asset IDs/states privately. Review the entire correction against them. The read-only checks below provide a baseline.
6. Paste the entire corrective file, including `begin;` and `commit;`, into a new Supabase SQL Editor query. Verify the project again, then run once. If it reports an error, stop and inspect it; do not rerun older migrations or reset the database. The transaction prevents a partially committed correction.
7. Run the verification SQL, compare registration/roster counts and unrelated records with the baseline, inspect representative published banners and check disposable banner sharing/replacement/cleanup. Watch for failed image requests or authorization errors.
8. Record who applied it, the timestamp/result and verification evidence in the project's migration log. If migrating to CLI management later, reconcile history explicitly before any `db push`; do not blindly push/reset an existing project.

### Read-only administrator verification SQL

Run in SQL Editor before and after the correction. These statements do not change records.

```sql
select pg_get_functiondef('public.admin_set_banner(uuid,uuid,text)'::regprocedure);
select pg_get_functiondef('public.admin_unused_banners()'::regprocedure);

select count(*) as referenced_retired_assets
from public.event_banner_assets a
where a.state = 'retired'
  and exists (
    select 1 from public.events e
    where e.banner_url = '/event-images/' || a.event_id::text || '/' || a.id::text
  );

select (select count(*) from public.registrations) as registrations,
       (select count(*) from public.registration_players) as roster_rows;

select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in (
  'profiles','games','events','event_games','registrations',
  'registration_players','event_banner_assets','game_banner_assets','event_public_refresh'
);
select schemaname, tablename, policyname, roles, cmd
from pg_policies where schemaname in ('public','storage') order by 1,2,3;

select p.proname, p.prosecdef, p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef order by p.proname;

select id, public, file_size_limit, allowed_mime_types from storage.buckets
where id in ('nebula-event-banners','nebula-game-banners');
select * from public.event_public_refresh;
select * from pg_publication_tables
where pubname='supabase_realtime' and tablename='event_public_refresh';
```

Afterward, compare function bodies to the file: both protect referenced assets; each keeps `private.require_admin()` and empty `search_path`. Referenced retired count should be zero unless a concurrent update occurred. Required RLS flags must be true, public admin SECURITY DEFINER functions must not allow anonymous execution, and the two buckets must remain private. Do not automatically “fix” unrelated policies returned by the query.

### Rollback

A failed transaction rolls back before commit. A post-commit rollback requires administrator review. Restoring saved function definitions is technically possible but reintroduces the known shared-image bug. Blindly reverting repaired states can hide currently referenced images. Prefer a reviewed forward correction. A whole-database restore can discard registrations created after the backup and is not a safe routine rollback. No automatic rollback/reset SQL is provided or executed.

## C. Authentication and Google OAuth checklist

Actual application endpoints are **`/auth/callback`** (PKCE code exchange) and **`/auth/confirm`** (signup/recovery token-hash verification). Password recovery returns to **`/update-password`**. Do not invent `/api/auth/callback`, `/auth/google` or framework-specific alternative routes.

Anonymous hosted settings currently report email enabled, Google enabled, email confirmation required and signup enabled. They do **not** prove the provider secret, consent screen, delivery or session flow works.

- In Google Cloud, confirm an OAuth web client and consent-screen/audience settings appropriate for intended users. Review testing restrictions and required publisher/Google verification where applicable.
- Obtain the provider callback shown by **Supabase → Authentication → Google**. Google Authorized Redirect URI is the Supabase endpoint, normally `https://<PROJECT_REF>.supabase.co/auth/v1/callback`, not Nebula's `/auth/callback`. Copy the actual dashboard value, especially if Supabase uses its own custom domain. [Supabase Google configuration](https://supabase.com/docs/guides/auth/social-login/auth-google).
- Google client ID/secret belong in Supabase's provider settings, not `NEXT_PUBLIC_` variables or this repository. The application needs no Google-secret environment variable.
- Review Google authorized JavaScript origins for the chosen flow and actual deployment origins. No custom domain is assumed or created.
- Set Supabase Site URL and redirect allowlist as section F describes; keep canonical origins in each app environment.
- Test Google login from the intended deployment, code exchange, dashboard/registration return destination, reload/session refresh, logout and access after role revocation. Never put authorization codes, token hashes or cookies into the report/logs.

### Email confirmation and reset

Signup and password reset construct links from server-only `SITE_URL`, never request Host headers. The confirmation handler accepts only `signup` or `recovery`; recovery always returns to `/update-password`. The callback applies an exact local destination allowlist, including the implemented registration routes, preventing open redirects.

Inspect hosted confirmation/recovery templates. For the token-hash flow, a signup template can target `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}`; recovery uses `type=recovery`. The configured template URL must target the selected environment, encode nested redirect values correctly and preserve the allowed return route. Test the rendered email, not just the template text. Default PKCE confirmation links also need a successful real `/auth/callback` exchange; PKCE links can depend on the browser holding the verifier.

Custom SMTP status was **not inspectable through anonymous Auth settings**. Verify it in the dashboard. For public production signup/recovery, configure or confirm custom SMTP in Supabase; no app email package or new provider was added. The default service is for development, currently restricted to organization-team recipients and **2 messages/hour**, without delivery SLA. Custom SMTP starts with a low default limit; inspect the dashboard's configured rate limits and sender authentication. Disable provider link tracking that rewrites Auth URLs. [SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp), [production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

Do not disable confirmation to avoid delivery problems. Actual email delivery, verification, expiry and reset behavior remain manual requirements.

## D. Environment variables and secrets

[.env.example](.env.example) contains placeholders only. `.env.local` and `Keys.txt` are ignored; only `.env.example` is tracked among environment files. Real local values were not printed or replaced. The current canonical origin was detected as **local**, so it must not be copied unchanged to hosted Production/Preview.

| Variable | Purpose | Required | Visibility | Vercel assignment / source |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API/Auth/Storage base | Required for configured application | Public client and server | Development: dev project; Preview: staging project; Production: intended production project. Obtain from project Connect/API settings. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase access under RLS | Required | Public client and server | Same scope/project as URL. Use `sb_publishable_…` or the supported legacy **anon** JWT from API settings. Never a service-role or `sb_secret_` key. |
| `SITE_URL` | Canonical origin for OAuth/email links | Required in Preview/Production; development has localhost default | Server-only | Exact HTTPS origin for that deployment, from its Vercel URL or optional configured custom domain. No path/query/fragment. Local: `http://localhost:3000`. |
| `NODE_ENV` | Framework production/development behavior | Provided by framework | Build/server standard variable | Let Next/Vercel supply it; do not manually override it. |

There is **no application service-role key**, SMTP variable, Google secret, bucket variable or custom-domain variable to add. Bucket names are defined by the existing application/migrations. Public config actively rejects privileged keys and credential-bearing URLs. Public values are bundled at build time; redeploy later after changing them. Server-only values must remain outside client imports.

Existing diagnostic-only variables are not production requirements: `TEST_ORIGIN`, `TEST_BASE_URL`; and `PHASE4_TEST_EMAIL`, `PHASE4_TEST_PASSWORD`, `PHASE4_TEST_SOLO_ID`, `PHASE4_TEST_TEAM_ID`, optional `PHASE4_OTHER_EMAIL`, `PHASE4_OTHER_PASSWORD`, `PHASE4_TEST_CLOSED_ID`, plus `PHASE4_ALLOW_TEST_WRITES`. The Phase 4 script requires the explicit disposable-project write opt-in. It was not run with writes and these values do not belong in production environment assignments. Keep test credentials private.

Vercel/Corepack may additionally use the platform build setting `ENABLE_EXPERIMENTAL_COREPACK=1`; this is a documented hosting/package-manager setting, not an application variable or new `.env.example` requirement. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build).

## E. Vercel settings and runtime review

For the later, explicitly authorized deployment:

- Framework: **Next.js**. Repository root is the project root. Node version **24.x**. Build command **`pnpm build`**. Output directory: Next.js default; do not set `out` or force static export.
- Package manager pinned to **pnpm 11.25.0**. Keep `pnpm-lock.yaml` and `pnpm-workspace.yaml`, including the patched `exceljs>uuid` override and build-script approval. Do not let an old auto-detected pnpm version silently replace them.
- Vercel's published package-manager auto-detection table currently lists pnpm only through 10. Use its Corepack mechanism to honor `packageManager`, then verify **11.25.0** and frozen-lockfile installation in Preview build logs. If unavailable, a deliberate install command such as `npx --yes pnpm@11.25.0 install --frozen-lockfile` uses the exact registry package; verify it in Preview before Production. Neither path was executed on Vercel. [Package managers](https://vercel.com/docs/package-managers).
- Do not add permissive Server Action `allowedOrigins` wildcards. Same-origin actions work with the normal Vercel host; review only a confirmed reverse-proxy mismatch.
- ExcelJS export explicitly runs in Node.js, creates bytes in memory and uses an authorized database snapshot. No export file persists locally. Larger workloads still need realistic Preview memory/time testing; the output cap does not prevent earlier resource exhaustion.
- Sharp runs server-side for full banner decode/re-encode, strips metadata and applies pixel/format limits. Uploaded images are WebP in Supabase Storage. Existing game/event proxy routes use private/no-store responses and RLS; cached public static logos are separate.
- Homepage banner is a static asset import handled by Next image optimization. Its original PNG stays in `assets/`. Game logos are local files; event/game banners use their existing proxy URLs and fallbacks. No remote image hostname wildcard is needed.
- Public routes are dynamic and published-only; admin mutation paths revalidate. `LiveEventRefresh` subscribes to the public version row, polls visible tabs every 15 seconds and refreshes on focus. Verify hosted Realtime publication/connection; polling provides eventual refresh if Realtime is unavailable. Do not claim instantaneous cross-session delivery without a hosted test.
- Proxy adds private/no-store and preserves refresh cookies. Callback headers strip sensitive referrers; exports vary by Cookie. Verify these headers on deployed responses and any extra CDN/proxy configuration.
- Storage bucket limits remain 5 MiB. Legacy images larger than Vercel's response limit must be reviewed by an administrator: the current image proxy buffers bytes, so a large existing object can still exceed the host's ceiling. No hosted objects were removed/replaced. Re-encoding/replacing an oversized existing object should be a reviewed admin operation before launch.

No `vercel.json`, hosting project or deployment was created. Current platform duration/memory quotas depend on plan/settings; confirm them during Phase 7D Preview testing rather than assuming a large export will fit.

## F. Local, Preview and Production origins

Use actual assigned hostnames in place of the illustrative placeholders below; no domain is assumed.

| Environment | `SITE_URL` | Supabase Site URL / redirect entries |
| --- | --- | --- |
| Local with hosted Supabase | `http://localhost:3000` | Development project: local Site URL and `http://localhost:3000/auth/callback**`, `http://localhost:3000/auth/confirm**`. Use 127.0.0.1 only if actually browsing there. |
| Preview | Exact `https://<ACTUAL_PREVIEW_HOST>` | Prefer a separate staging Supabase project. Add that exact host's `/auth/callback**` and `/auth/confirm**`; set staging Site URL for the chosen stable preview/testing origin. |
| Production | Exact `https://<ACTUAL_PRODUCTION_HOST>` | Production Supabase Site URL must equal the canonical origin. Allow its `/auth/callback**` and `/auth/confirm**`. `**` covers the implemented query parameters; hosts stay exact. |
| Optional custom domain | Actual verified HTTPS origin | Only after configuring it later: update both origin settings and corresponding allowlist paths, then test old links/session behavior. |

Supabase supports redirect globs, but prefer exact trusted Preview hosts and tight production hosts. Do not allow arbitrary `*.vercel.app` deployments or use an unrestricted `https://**` rule. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).

`SITE_URL` is explicit and does not automatically follow `VERCEL_URL`. Configure a stable branch-preview origin or assign the exact per-deployment origin through the later deployment workflow. Using Production `SITE_URL` inside Preview redirects authentication to Production and can break PKCE cookies. Using `localhost` in hosted links breaks authentication for users.

Email template `.SiteURL` comes from the Supabase project's settings, not the app variable. If several environments share a Supabase project, coordinate templates/allowlists and test the appropriate target; separate staging avoids links and real data crossing environments. A Preview using the production project also has production write capability for authenticated users under existing RLS—do not use it for destructive smoke tests.

## G. Game catalog and real-data verification

The static catalog has **13 unique games**, with the requested 4 PC, 5 Mobile and 4 Console classifications. EA Sports FC is edition-neutral. Four authentic local logos fully decode in the asset tests: VALORANT, League of Legends, EA Sports FC and F1. Nine intentionally use neutral fallbacks: Dota 2, Call of Duty, PUBG Mobile, Free Fire, Mobile Legends: Bang Bang, Call of Duty: Mobile, eFootball Mobile, Mortal Kombat and Tekken. No broken configured asset paths were found. Permission/source notes are in [the asset manifest](public/assets/games/README.md); publisher permission for Riot/EA/F1 was confirmed by the user, not independently audited from license documents.

Anonymous hosted inventory found **one visible global game, Valorant (`valorant`)**, reference classification `team`, with null stored roster settings. The existing effective default is maximum 8 with required unique roles; nothing was overwritten. Reference classification does not replace each competition's actual solo/team format. Both formats and historical-roster preservation pass tests. Inactive games and full administrator inventory are not visible to this anonymous review. No ticker game was inserted into Supabase.

There is **one publicly published event**, “Nebula Esports Showdown 2027” (`nebula-esports-showdown-2027`), scheduled, with a banner and one team competition. No unpublished/orphan rows appeared in anonymous public reads. No published record matched the demo/test/fixture heuristic. A legitimate title does not prove operational details are final; the administrator must review its dates, venue, registration windows and fee before launch.

Public runtime has no synthetic tournament substitution, fake participant counters or invented prize pools. Synthetic records exist only in `tests/fixtures/` for automated testing. Missing events produce an empty state; query errors produce an unavailable message. Unpublished/deleted visibility is covered by actual query/component and PostgreSQL tests, not a live destructive test.

For administrator review of hidden/suspected records, use read-only SQL:

```sql
select id, slug, title, is_published, status, starts_at, ends_at
from public.events
where concat_ws(' ',slug,title,description,venue)
  ~* '(demo|test|sample|fixture|fictional|disposable|phase[ -]?[0-9])';
select id, slug, title, is_active, reference_type, max_team_size, available_roles
from public.games order by title;
```

Treat matches as review candidates, not proof that records should be deleted. If an additional real competition needs a global game, review the full inventory, reuse an existing record where appropriate, then obtain administrator approval for its actual name/classification/roster settings. No catalog migration is necessary merely to match the ticker.

## H. Validation, warnings and remaining manual gates

| Command executed | Actual result |
| --- | --- |
| `pnpm lint` | Passed, exit 0. |
| `pnpm typecheck` | Passed, exit 0. |
| `pnpm test` | **97 passed, 0 failed, 0 skipped, 0 cancelled**, exit 0. Includes actual multipart-overhead and oversized-authorized-export regressions. |
| `pnpm build` | Passed, exit 0. Current Node 24 runtime; Next.js 16.4.0, server routes and export preserved. |
| `pnpm audit --prod --json` | Passed, exit 0; zero vulnerabilities. |
| `pnpm audit --json` | Exit 1; one high development-only `braces` advisory, no published patch indicated. Not suppressed. |
| `node --experimental-strip-types scripts/check-supabase.mjs` | Passed anonymous hosted Auth/settings/public schema check. |
| `node --experimental-strip-types scripts/check-phase7a-live.mjs` | Passed 6 schema probes, 3 private-table denials, 3 admin-report RPC denials. |
| `node --experimental-strip-types scripts/check-production-readiness.mjs` | Passed read-only public game/event inventory and configuration-presence diagnostic. No record/account/Storage mutations. |
| `node scripts/check-auth-routes.mjs` | Passed local public/auth pages, protected redirects, invalid callbacks and missing event. |
| `node scripts/check-phase6-routes.mjs` | Passed anonymous export rejection with no-store; no private registration data requested. |
| `node scripts/check-phase7a-routes.mjs` | Passed local admin/player detail guards and unknown/invalid image/event rejection. |
| `git diff --check` | Passed. |

The remaining lint-tool chain is `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. It processes tooling patterns and is not in the production dependency audit. Recheck upstream before launch; do not claim the full audit passed. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

The build reports the configured `serverActions` experimental option; no failing build warning was recorded. The new diagnostic initially had an unused-variable lint warning; it was corrected and final lint is clean. A local build is not a successful Vercel build. Hosted anonymous probes are not authenticated application tests. Test fixtures use disposable PostgreSQL rather than modifying the live database.

Before production launch, complete these manual gates:

1. Verify backups/recovery, apply or confirm the Phase 7A correction, compare deployed RLS/functions/buckets and Realtime publication.
2. Configure actual Preview/Production origins, Supabase redirect allowlists and Google client/consent settings. Verify custom SMTP, sender authentication, confirmation/reset templates and appropriate Auth rate limits.
3. Use a separate staging project and disposable accounts/events for complete signup/confirmation, password login, Google login, recovery, refresh/expiry/logout, ordinary-user admin denial and role-revocation journeys.
4. Test solo/team clans and configured roles/caps, opening/deadline boundaries, duplicate sessions, failed edits and cancellation/re-registration. Preserve real registrations; do not test against legitimate participant rows.
5. Test admin event/game/manual-registration workflows, published/unpublished/missing pages, event/game banner upload/replace/remove and shared cleanup using disposable data only. Review existing stored images for response-size compatibility.
6. Download individual/full-event exports in native Excel. Confirm exact contact/UID text, latest roles/clans, authorized email visibility and canceled exclusion. Benchmark largest realistic event within memory/time and file-size limits; a single competition above the byte cap needs a future separately approved large-export solution.
7. Confirm pnpm 11.25.0 installation, Node 24, secrets/build-time public values, cookie/cache headers and images in the actual Vercel Preview. Resolve an incompatible package-manager install before Production.
8. Review real event details, hidden suspected demo candidates and full game inventory. Retain the existing logo source/permission manifest when packaging the release.

No critical confirmed application authorization issue was found. The manual gates above block a public launch until verified; the lint-only advisory remains a disclosed development risk. The classification is **READY AFTER MANUAL CONFIGURATION**, not “every external workflow verified.”

## I. Later deployment procedure — do not execute during Phase 7C

1. Complete migration/backup and Auth configuration gates. Review the final working-tree changes, including prior Phase 7A/7B work and the source banner; verify ignored secrets are absent from the proposed commit.
2. When deployment is explicitly authorized, create/import the intended Vercel project and apply the settings in E. Create no hosting resources merely by following this preparation report.
3. Assign staging Preview variables and the actual trusted origin; configure allowlists/email templates for that environment. Build Preview, inspect package/runtime logs and run the manual smoke tests with disposable data.
4. Resolve Preview findings. Configure Production variables and the chosen Vercel production origin; add a custom domain only if separately requested/configured.
5. Perform the authorized Production deployment. Confirm anonymous public pages/empty states/assets, login/reset, signed-in player/admin access and private cache headers without changing real participant data for testing.
6. Record the release, keep the previous application release available and monitor application/Auth errors without tokens or contact details. Roll back application code if necessary; database rollback is a separate reviewed operation.

### Files inspected and changed in Phase 7C

Inspected: all versioned migration files; Next configuration/package/lock/workspace files; authentication config/policy/origin/actions/account/callback/confirmation/client/Proxy files; public event loaders/models/status/refresh/routes; registration/admin authorization/data/actions; banner processing/Storage proxy routes; Excel workbook/response/route; catalogs/logo provenance; environment references/ignore rules; existing audit scripts/reports and security/regression suites.

Changed: `.env.example`, `package.json`, `next.config.ts`, `src/lib/game-image.ts`, `src/lib/admin/banner.ts`, `src/lib/admin/actions.ts`, `src/lib/admin/export-response.ts`, `src/components/admin/banner-form.tsx`, `src/components/admin/game-editor.tsx`, `tests/admin-policy.test.mjs`, `tests/phase7a-actions.test.mjs` and `README.md`.

Added: this report, `scripts/check-production-readiness.mjs`, `tests/phase7c-runtime.test.mjs`. Earlier migrations were not edited. Local validation logs use ignored `.log` files; no credentials or participant details were recorded.
