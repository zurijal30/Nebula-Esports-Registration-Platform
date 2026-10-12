# Phase 4: registration guide

Players can register for solo or team competitions, edit their entries and cancel before registration closes. Only the team captain needs an account.

## Current status

- Phase 4 database readiness checks pass.
- Anonymous registration writes are blocked.
- Lint, TypeScript, build and 27 automated tests passed.
- Desktop and mobile forms were checked.
- The user confirmed signed-in submissions, editing and cancellation work.

Your published test event is ready: [open the test event](http://localhost:3000/tournaments/live/phase4-registration-test).

## 1. Database setup

For a new Supabase project, apply these files in order through SQL Editor:

1. [Phase 3 foundation](../supabase/migrations/202610110001_phase3_foundation.sql)
2. [Phase 4 registration](../supabase/migrations/202610110002_phase4_registration.sql)

**Your connected project passes the Phase 4 readiness check. Do not rerun migrations already applied.** Do not reset or drop existing tables.

## 2. Check configuration

Keep these values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SITE_URL=http://localhost:3000
```

No service-role key is needed. Restart the app after changing environment values.

In Supabase → Authentication → URL Configuration, allow:

```text
http://localhost:3000/auth/callback?next=**
http://localhost:3000/auth/confirm
```

Keep existing login and password-reset URLs. For deployment, use your exact HTTPS site address instead of localhost; do not wildcard the hostname.

To return new users to their competition after confirming their email, use this Confirm signup email template:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup&amp;redirect_to={{ .RedirectTo | urlquery }}">Confirm your email</a>
```

## 3. Test solo registration

1. Open the test event and select **Register** for the solo game.
2. Sign in. You should return to the same registration form.
3. Enter your full name, IGN, game ID and phone number. Your account email is used automatically.
4. Submit and open [My Registrations](http://localhost:3000/dashboard/registrations).
5. Edit your details and save.
6. Cancel the entry using the confirmation step. Register again while the window is open.

## 4. Test team registration

1. Select **Register** for the team game.
2. Enter the team name, optional clan name and captain details.
3. Add seven or more teammates and fill in their details. Teammates need no accounts or emails.
4. Remove a middle teammate. Check that the remaining values stay intact.
5. Submit, then edit the team and roster from **My Registrations**.
6. Test cancellation and registering again.

Also check that another player cannot view or change your entry. Once the deadline passes, submission, editing and cancellation must be blocked. Fees are paid at the venue; there is no payment tracking.

## 5. Create a test event in another project

After applying both migrations, run [the test-event SQL](../supabase/tests/phase4_test_event.sql) **once in a disposable development project**. It creates one published event with solo and team competitions and returns their IDs.

Your current test event already exists, so do not run that SQL again. Its registration window closes one day after it was created.

## 6. Run checks

Open PowerShell in the project folder. On this machine, add the installed tools to the current terminal's PATH first:

```powershell
cd "C:\Users\zuhry\OneDrive\Desktop\nebula-esports"
$runtimeTools = "C:\Users\zuhry\.cache\codex-runtimes\codex-primary-runtime\dependencies"
$env:Path = "$runtimeTools\bin\fallback;$runtimeTools\node\bin;$env:Path"

pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-phase4-routes.mjs
node scripts/check-phase4-live.mjs
```

The PATH setup applies only to this terminal; repeat it in a new terminal. Start the app with `pnpm dev` before the route checks, or use the instance already running in your next-server tab. Automated database tests use disposable local PostgreSQL; they do not change your Supabase data.

For optional signed-in Supabase tests, configuration details and the complete changed-file list, see [technical notes](phase4-technical-notes.md).

## Important rules

- Demo events cannot accept registrations. Use published live events.
- One active entry is allowed per account per competition.
- Saving or editing either succeeds completely or saves nothing.
- Cancellation keeps the record and allows a new entry while registration is open.
- The database checks ownership and deadlines; browser buttons do not decide eligibility.
- Hidden or cancelled competitions cannot accept changes.

Admin event management, banner uploads, Excel exports and payment features are reserved for later phases.
