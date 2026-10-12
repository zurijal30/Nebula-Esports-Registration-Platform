# Performance, navigation and browser branding

Validated locally on 12 October 2026 for v3.0 — Performance & Navigation Improvements. No deployment command was run; a later Git push may trigger the hosting provider's automatic deployment.

## Findings and changes

- Public routes already use Next Link and client-side navigation. No forced document reloads or custom browser-tab spinner were added. Native tab loading indicators remain controlled by the browser.
- Dynamic tournament/account routes had no loading boundaries, preventing useful partial prefetch/loading feedback. Added lightweight listing, detail and account skeletons. Their visual reveal waits 120 ms in CSS to avoid a brief flash; the route/data never waits for this timer. Reduced motion uses static placeholders.
- The live-event component previously reconnected on every public pathname change and refreshed on each connection and window focus. It now keeps a subscription while navigating among public routes, checks versions before focus/reconnect refreshes, and coalesces overlapping probes. One initial reconciliation and actual realtime updates still refresh, preserving edits made during the SSR/subscription gap. Cleanup and error recovery are tested.
- Static game assets previously passed through the session proxy, receiving private/no-store responses. Public game files and exact icon paths now bypass that work. Protected account/admin/auth and private event/game-image routes still match the proxy; permission checks are unchanged.
- The existing shield in `assets/nebula-logo.png` has substantial transparent margins. Cropped only those margins around the shield (120,106,260,289), then proportionally resized to 16/32/48-pixel ICO entries, 32/192-pixel PNG icons and a 180-pixel Apple touch icon. No generated logo or modified shield artwork. App Router file conventions generate the icon metadata automatically; no old default favicon was present.
- Default title is `Nebula Esports | Your Arena. Your Legacy.` Home uses this default. Existing Tournaments, About and account-specific metadata continue using the page title template.
- A small client wrapper animates committed pathname changes with opacity 0.94→1 and vertical translation 3→0 pixels over 180 ms. It does not key/remount the root layout or move the shared header into the animation. Back/forward uses the same pathname mechanism. Animation is cancelled on cleanup or a reduced-motion preference change. No animation dependency was added.
- Existing image dimensions, hero preloading and tournament image freshness behavior are retained. Ticker already uses cached positions and a desktop-only requestAnimationFrame loop; touch/reduced-motion gating remains intact. ExcelJS is imported only by the server export code, not the ticker/transition. No evidence justified changing registrations, permissions, live query pagination, image access or caching sensitive content.

## Measurements

Read-only requests against local `next start` on 127.0.0.1:3006, same existing Supabase project. Five requests per path; warm medians below exclude each first request. These small samples are indicative, not a production benchmark or database speed claim.

| Path / measure | Before | After |
| --- | ---: | ---: |
| `/tournaments` time to response headers | 76.5 ms | 14 ms |
| `/tournaments` complete HTML response | 77.5 ms | 79.5 ms |
| `/about` time to response headers | 16 ms | 17.5 ms |
| Static game-logo Cache-Control | `private, no-store` | `public, max-age=0` |

Tournament streaming delivers feedback earlier; overall backend response completion is essentially unchanged. Static assets use normal public revalidation, not a new long cache lifetime. Hook tests verify one initial reconciliation, zero additional refreshes for unchanged focus/reconnects, refreshes for changed versions/realtime notifications, and cleanup.

## Files changed

- `src/app/layout.tsx`: default title and content transition wrapper.
- `src/app/globals.css`: restrained skeleton styles and responsive/reduced-motion behavior.
- `src/app/favicon.ico`, `src/app/icon1.png`, `src/app/icon2.png`, `src/app/apple-icon.png`: original-shield icons.
- `src/app/tournaments/loading.tsx`, `src/app/tournaments/live/[slug]/loading.tsx`: listing/detail loading boundaries.
- `src/app/dashboard/loading.tsx`, `src/app/admin/loading.tsx`: account/admin loading boundaries.
- `src/components/layout/page-transition.tsx`: route entrance animation.
- `src/components/ui/content-skeleton.tsx`: shared lightweight placeholders.
- `src/components/tournaments/live-refresh.tsx`: stable subscription and version-aware refreshes.
- `src/proxy.ts`: exact public icon paths and static game assets excluded from session work.
- `tests/performance-navigation.test.mjs`: actual component effects, icons and protected-route coverage.
- This report.

## Verification

- ESLint, TypeScript and production build passed.
- Complete suite: 105 passed, 0 failed/skipped. Focused tests also passed after preserving initial realtime reconciliation.
- Production browser preview: Home → Tournaments; browser back/forward; About and Sign In; correct tab titles and icon metadata; icon HTTP URLs return 200 with correct MIME types.
- Desktop and 320/375/430-pixel responsive navigation: menu open, Escape close, link selection close, scroll lock restoration and no horizontal overflow. No captured browser errors or hydration errors.
- Icons were decoded and their ICO entries/dimensions verified; 32-pixel output is compared against a direct resize of the original shield.
- Reduced-motion and animation cleanup verified through actual component-effect tests. Existing registration/auth/admin/export tests remain passing in isolated test databases.

## Manual checks remaining

1. Check real Chrome, Firefox and Safari tabs and iOS/Android touch icons. Browser favicon caching may require a fresh tab or hard refresh after a later deployment. Only the Codex in-app browser was available here.
2. Check transitions on a lower-powered physical phone, with reduced motion enabled and disabled. No real-device smoothness or frame-rate claim is made.
3. Check authenticated player/admin navigation and profile updates with your own accounts; no credentials or production records were changed for this task.
4. On a throttled connection, verify skeletons remain restrained and do not visibly flash on already-prefetched navigation. No formal CLS or mobile CPU profile was collected.

No production database changes, migrations, permission changes, environment changes or deployment were performed.
