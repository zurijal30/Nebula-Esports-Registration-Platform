# Phase 3 Supabase setup

This guide covers the initial foundation and Auth setup. Phase 4 adds registration ownership reads and transactional RPCs; follow [the Phase 4 guide](phase4-registration.md) after this migration for exact order, new permissions, variable registration callback destinations and the updated signup confirmation template. The Phase 3-only registration permissions described below are superseded by its migration.

Phase 5 adds the full admin console, private Storage banners and role management. Apply its migration after Phase 4 using [Phase 5 setup](phase5-admin.md). Its validated functions supersede the initial direct event/game write grants; no service-role key is needed.

Implementation follows the official [SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [password guide](https://supabase.com/docs/guides/auth/passwords), [Google OAuth guide](https://supabase.com/docs/guides/auth/social-login/auth-google) and [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Environment

Configure `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<project URL from the Connect dialog>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<project publishable key>
SITE_URL=http://localhost:3000
```

`SITE_URL` is the canonical application origin for email and OAuth redirects. In production, set it to your HTTPS application origin without a path, query or fragment. Redirect origins are never taken from Host/forwarded headers. Restart the dev server after environment changes. The two Supabase variables already existed; `SITE_URL` is new. Privileged keys are neither required nor accepted by public client configuration. Never put a service-role key or `sb_secret_` key in a public variable.

Environment variables do not create database tables. Keep project-owner and database credentials outside this repository.

## Apply the migration

`supabase/migrations/202610110001_phase3_foundation.sql` creates six tables, constraints/indexes, profile/timestamp triggers, grants and RLS policies in one transaction. It backfills existing Auth users as players and inserts no demonstration events.

Option A: open SQL Editor in the intended Supabase development project, paste the migration, and run it once. This initial migration expects its table/type names to be unused. If they exist, inspect and reconcile rather than dropping data. Record it as applied before switching to CLI migrations so it is not applied twice.

Option B: with the official Supabase CLI installed and authenticated:

```sh
supabase link --project-ref <your-project-ref>
supabase db push --dry-run
supabase db push
```

Supply database credentials interactively or through a secure environment. Review the dry-run against the intended project. Do not use `supabase db reset` on shared/production data.

The Auth trigger creates profiles for email and Google users, always assigning player regardless of metadata. Contact phone is added through the profile editor. All six tables enable RLS. Public visitors read active games and published events/competitions only. Players read their own profile and update only display name/phone; column privileges prohibit changes to role, ID and timestamps. Trusted admins read private management data and manage events/games at the database level. The app exposes no event management tools yet. Registration tables allow admin reads only and no API writes, even for admins, until later verified workflows add narrow permissions.

## Auth URLs and email templates

In Authentication → URL Configuration, match Site URL to `SITE_URL`. Allow these exact local redirects and their deployed HTTPS equivalents:

```text
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/dashboard
http://localhost:3000/auth/callback?next=%2Fdashboard
http://localhost:3000/auth/callback?next=/update-password
http://localhost:3000/auth/callback?next=%2Fadmin
http://localhost:3000/auth/confirm
```

Avoid broad production wildcards. Keep email confirmation enabled. Signup without a session shows an inbox message, not a signed-in state. For confirmation across browsers/devices, use these token-hash links in Authentication → Email Templates:

Confirm signup:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup">Confirm your email</a>
```

Reset password:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery">Reset your password</a>
```

The handler accepts only signup/recovery and directs them to dashboard/update-password, stripping credentials from the URL. `/auth/callback` also supports PKCE codes from default email templates and Google. Default PKCE email links require the requesting browser's verifier; token-hash templates support another browser. Configure production SMTP, rate limits and an appropriate Supabase password policy; the app requires at least 10 characters. Recovery success messages do not reveal whether an email has an account. Raw provider errors and tokens are not displayed.

## Google OAuth

Create a Web application OAuth client and consent screen in Google Cloud. Its Authorised redirect URI is the Supabase callback (`https://<project-ref>.supabase.co/auth/v1/callback`), not the Next.js callback. Add applicable website JavaScript origins. Enable Google in Supabase Authentication → Providers and enter its client ID/secret there. Do not put the Google secret in the app environment or repository.

Supabase redirects back to `/auth/callback`, which exchanges the PKCE code for cookies. Return paths are an exact local allowlist; external or encoded destinations are ignored. Google users receive the same player profile as email users. Provider enablement does not prove successful live consent/authentication.

## First administrator

1. Apply the migration.
2. Create the intended owner's account through email or Google, confirm it as required, and sign in to verify its profile.
3. In the trusted Supabase dashboard, find and verify that account's exact UUID under Authentication → Users.
4. Run this in SQL Editor as the trusted database owner:

```sql
update public.profiles
set role = 'admin'
where id = '<verified Auth user UUID>'::uuid
returning id, role;
```

Confirm exactly one intended row changed. Revoke access through the same trusted process by setting player. Signup, user metadata and public APIs cannot choose admin. Server guards read the current profile role, rather than trusting user-controlled or stale JWT metadata. No public admin signup or role-change endpoint exists.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node --experimental-strip-types scripts/check-supabase.mjs
node scripts/check-auth-routes.mjs
```

The read-only diagnostic reports provider/table readiness without keys, tokens or user data. The route smoke script runs against localhost:3000 and verifies unauthenticated protection, callback errors, public pages and 404s without creating an account. Run `supabase/tests/phase3_security.sql` only in a disposable development project after applying the migration. Its rolled-back fixtures check automatic profiles, ignored admin metadata, column privileges, contact privacy, public/draft events, admin access, registration write denial, partial uniqueness and metadata-edit preservation. With psql use `-v ON_ERROR_STOP=1`; roll back a failed SQL Editor transaction before continuing.

Complete these live checks with disposable email/player/admin accounts:

- Signup with confirmation enabled: verify the inbox link, session and player profile. Test confirmation-disabled behaviour in an isolated project too.
- Login: valid password enters dashboard; invalid/unconfirmed credentials get friendly errors. Refresh/reopen the browser to verify persistence.
- Google: complete consent, callback and dashboard landing; verify the player profile. Check cancelled consent.
- Profile: save name/phone and reload. Direct role/ID updates must fail; another player's contacts must be inaccessible.
- Routes: logged-out dashboard/admin/update-password redirect to sign-in. Players are denied admin; trusted admins can enter it. Editing browser metadata must not elevate access.
- Recovery: follow the reset email (including in another browser), change password, and sign in with it. Expired links must fail safely.
- Logout: sign out and verify protected routes redirect.

During implementation Auth was reachable, email signup/confirmation and Google were enabled, but the events query returned PGRST205 (table missing from API schema). No remote migration was executed, no test account was created, and no successful email/Google login, profile write, password change or authenticated logout is claimed. Automated tests cover redirect safety, identity/role logic, validation, configuration and existing tournament behaviour. Database RLS tests and successful live flows require migration setup and test accounts.

## Next phase

Implement verified solo/team registration submissions, game-specific fields, captain ownership, editing/cancellation and narrowly scoped registration permissions. Preserve one active entry per captain per competition. Event editing, banner uploads and Excel exports remain later work. Public browsing still reads `src/data/tournaments.ts`; a future query adapter should map published events and joined games into existing display contracts without treating fictional demos as real announcements.
