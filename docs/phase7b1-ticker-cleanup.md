# Phase 7B.1: game ticker and public demo cleanup

Completed **12 October 2026**. The existing Next.js app, navy styling, authentication, registration, admin workflows and database records were preserved.

## Ticker

The homepage game-name strip is replaced by a CSS-only horizontal ticker. All **13 requested games** and PC/Mobile/Console metadata live in one configuration: `src/data/supported-games.ts`. This presentation catalog does not read/write tournament registrations, insert global games, or generate events.

Two identical flex groups form one track. Each group includes its trailing gap, so translating the track by **−50%** moves exactly one complete group and produces the same visible arrangement at the loop boundary. The 65-second linear animation runs right-to-left. Overflow is contained in the masked window, with subtle edge fades.

Hovering the strip or focusing its keyboard-accessible region pauses motion. Only the first list is exposed to assistive technology. Reduced-motion CSS stops the animation, hides the visual duplicate and wraps the complete catalog into a static list. Logos use consistent 76×44 display boxes with `object-fit: contain`; readable names and platform labels remain alongside them. Small local images load eagerly so scrolling does not reveal unloaded duplicates.

## Logos and permissions

**Four authentic local assets** are saved in `public/assets/games/`: VALORANT, League of Legends, edition-neutral EA Sports FC and F1. The user confirmed permission for Riot, EA and F1. The saved variants retain their colors, transparency and proportions. No annual FC edition was selected.

**Nine missing permitted logos** use neutral icons: Dota 2, Call of Duty, PUBG Mobile, Free Fire, Mobile Legends: Bang Bang, Call of Duty: Mobile, eFootball Mobile, Mortal Kombat and Tekken. Official source availability did not establish a suitable usage grant for this tournament website. No unauthorized placeholder trademark was invented.

The [asset manifest](../public/assets/games/README.md) lists exact download URLs, publisher policies, preparation, dimensions, sizes, permission basis and fallback reasons for every game. All saved files exist, fully decode and render in the browser. No remote logo requests are made by the ticker.

## Public demo content removed

- Homepage no longer substitutes sample events when Supabase has no upcoming events. It uses the existing published-event query and real dates/statuses. An empty list has a premium empty state; query failure has a distinct error message.
- Tournament discovery now shows only the published Supabase list. The separate demonstration section is removed.
- Old `/tournaments/[slug]` and registration-preview links query published real events, then redirect to the existing canonical `/tournaments/live/...` routes. Unknown old demo slugs/competition IDs return Not Found. A real published event with the same slug is still supported; no hardcoded name blocklist hides database records.
- Removed demo labels, fake fee/registration branches, metadata descriptions and local runtime fallback routing from shared tournament components.
- Removed the three unused sample event banner SVGs. The intended default event banner and original general arena illustration remain.
- Moved synthetic status/filter test data out of `src/data` into `tests/fixtures/tournaments.ts`. It is no longer imported by public runtime code. Fixture dates/fees remain available only for isolated automated tests.
- No public participant counts, prize pools or demo statistics are introduced. Admin counters retain their existing database queries.

## Database review

A read-only anonymous query found **one published event**, **Nebula Esports Showdown 2027**, and **one active publicly visible global game**, **Valorant** (`valorant`, Team reference, existing null maximum/role configuration). Existing game settings were not overwritten. The ticker's other games were not seeded into the database, so no duplicate database games were created and no new migration is needed.

The published event's title/slug/description/venue had no `demo`, `test`, `sample`, `example`, `fictional`, `disposable`, `fixture` or `phase N` indicators. **No suspected published demo records were found.** This is a heuristic review, not proof of event authenticity.

Unpublished events and hidden games were not accessible to the anonymous check. An administrator can review those records in Admin or run this **read-only** query in Supabase SQL Editor:

```sql
select id, title, slug, is_published, starts_at, ends_at, venue
from public.events
where concat_ws(' ', title, replace(slug, '-', ' '), description, venue)
  ~* '\m(demo|test|sample|example|fictional|disposable|fixture|phase[[:space:]]*[0-9])'
order by created_at desc;

select id, title, slug, is_active, reference_type, max_team_size, available_roles
from public.games
order by lower(title), id;
```

Review any matches manually; legitimate names can match these indicators. No real rows or Storage objects were changed, hidden or deleted by this task.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build`: **passed, exit 0**. `pnpm test`: **95 passed, 0 failed, 0 skipped**, including existing auth/admin/registration/Storage/export regressions.
- New public tests inspect the actual ticker and real homepage/discovery/alias page code. They cover all requested platform lists, local-only asset paths, full decoding/dimensions/transparency, SVG safety, accessible duplicate handling, neutral fallbacks, zero-event/error states, real event rendering and exact published competition redirects.
- Browser checks confirmed identical group widths (**2828.453125 px each** at desktop), total track width exactly twice a group, identical group content, leftward movement, hover-only pause and keyboard-only pause with the pointer outside the ticker.
- All eight rendered image elements (four logos × two groups) completed loading. No browser warnings/errors were recorded in the checked homepage.
- Mobile checks at 390×844 found document width 375 px, with no horizontal page overflow. Reduced-motion declarations from the actual media-query block were rendered in an isolated preview: animation none, duplicate hidden, full list wrapping correctly on desktop/mobile. The operating-system motion preference was not changed.
- The empty component was visually checked in that same isolated preview and actual page empty/error branches were tested with mocks. The temporary preview route was removed before the final build.
- Real published homepage/discovery/event details and anonymous registration/admin guards are checked using the local app and read-only live data. Signed-in live saves were not repeated because this task leaves those workflows unchanged; their automated regressions pass.
- `node scripts/check-auth-routes.mjs`, `node scripts/check-phase4-routes.mjs` and `node scripts/check-phase7a-routes.mjs`: passed. Additional read-only HTTP assertions passed for all four local logo MIME/byte responses, removed sample artwork (404), real event/registration aliases and a missing event.
- The first post-preview type check encountered stale generated development route types after the local server stopped. A temporary server refreshed those types; the rerun and final production build passed. Next.js automatically generated the root `AGENTS.md` guidance file during that restart.

## Files changed for this task

- Catalog/ticker: `src/data/supported-games.ts`, `src/components/tournaments/game-ticker.tsx`, `src/app/globals.css`.
- Empty state: `src/components/tournaments/tournament-empty-state.tsx`.
- Public pages: `src/app/page.tsx`, `src/app/tournaments/page.tsx`, `src/app/tournaments/[slug]/page.tsx`, `src/app/tournaments/[slug]/register/[competitionId]/page.tsx`, `src/app/layout.tsx` metadata.
- Runtime cleanup: `src/components/tournaments/tournament-artwork.tsx`, `tournament-card.tsx`, `competition-list.tsx`, `src/lib/tournaments/live-model.ts`, `src/types/tournament.ts`.
- Removed runtime dataset: `src/data/tournaments.ts`; fixtures moved to `tests/fixtures/tournaments.ts`.
- Removed sample images: `public/images/events/arena-series.svg`, `mobile-showdown.svg`, `versus-cup.svg`.
- Assets: `public/assets/games/valorant.webp`, `league-of-legends.webp`, `ea-sports-fc.svg`, `f1.webp`, `README.md`.
- Tests/checks: `tests/phase7b1-public.test.mjs`, `tournament-status.test.mjs`, `registration-policy.test.mjs`, `scripts/check-auth-routes.mjs`, `check-phase4-routes.mjs`.
- Documentation: this guide and project `README.md`.
- Incidental framework output: root `AGENTS.md`, automatically generated by Next.js dev and left as generated.

Earlier Phase 7A changes remain present; this task did not apply its pending migration or resolve its separate upstream lint dependency advisory. No Vercel deployment was configured or run.
