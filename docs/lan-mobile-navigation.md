# Physical-phone navigation over the local network

Reviewed 12 October 2026. **Confirmed development-origin rejection fixed; physical-phone verification still required.** No deployment, production behavior, Supabase configuration, registration logic or navbar redesign was performed.

## Cause and evidence

The installed Next.js **16.4.0** development server blocks dev-resource requests from hosts not in its development allowlist. `.next/dev/logs/next-development.log` explicitly reported:

> Blocked cross-origin request to Next.js dev resource /_next/hmr from "192.168.1.9".

The laptop's Ethernet IPv4 address is `192.168.1.9`. The app's HTML was reachable through `http://192.168.1.9:3000`, proving that the running server already accepted LAN connections. Host binding did not explain the visible-but-unresponsive button.

Before the fix, requesting each of 19 JavaScript assets with the LAN Origin header returned **403**, and the HMR WebSocket could not connect. After the fix, the same asset requests returned **200**, all 19 passed, and HMR connected. An unrelated `https://untrusted.example` Origin still received **403**.

This confirms a dev-server resource/origin problem. It can interrupt development client loading/updates; server-rendered markup alone does not prove React hydrated. Classic same-origin script requests without an Origin header can still succeed, so these probes do not establish the precise failed request sequence on every phone. No physical phone's remote console was available during this task, and no real-device success is claimed.

The supported configuration was checked in the installed Next docs and guard implementation: `allowedDevOrigins` matches hostnames, not URL strings/ports, and is used for development resources. The fix permits only the current exact laptop host—no `*`, subnet-wide allowance, disabled guard, or Server Action `allowedOrigins` expansion.

## Why the earlier fix was insufficient

The previous change corrected menu dismissal, route reset and scroll locking, but tested the UI through localhost. Those handlers cannot correct a server refusing LAN development resources. The navbar already has a client boundary and React click handler. Its header stacking puts the dropdown above the hero, and the hero artwork has `pointer-events: none`. No confirmed touch-specific or CSS obstruction was found, so no further navbar/hero/ticker changes were made.

## Changed files

- `next.config.ts`: `allowedDevOrigins: ["192.168.1.9"]`, a development-only setting.
- `scripts/check-lan-dev.mjs`: repeatable read-only HTML/script/Origin/HMR diagnostic, with failing exit status for blocked trusted assets or an admitted unrelated origin.
- `tests/lan-dev-origin.test.mjs`: exercises the installed Next guard for scripts/HMR, trusted hostname, unrelated origins and Referer fallback.
- This report. Temporary browser-review HTML was removed; no application diagnostic logging was added.

## Validation

`pnpm lint`, `pnpm typecheck`, `pnpm test` (**99 passed, zero failed/skipped**) and `pnpm build` passed. The suite includes the existing account-link navigation render test. `node scripts/check-lan-dev.mjs` passed: LAN HTML 200, all 19 LAN-Origin scripts 200, unrelated Origin 403 and connected HMR.

A browser on the laptop opened the **LAN URL**, with a 375px child viewport. Real clicks changed `aria-expanded` from false to true, displayed the dropdown above the hero, and then closed it via the button and outside click. Body scroll locking worked. No browser error/warning was recorded in that test. These are browser interactions on the laptop, not physical touch-device tests. The prior localhost interaction checks at 320/375/430px remain distinct evidence.

## Exact physical-phone check

1. On the laptop, stop the old Next dev process with **Ctrl+C** in its terminal. From the project folder run:

   ```powershell
   pnpm dev --hostname 0.0.0.0
   ```

   Keep that terminal open. The existing process automatically reloaded the changed configuration during this task, but restarting ensures the phone reaches the updated server.

2. Connect the phone and laptop to the same LAN/Wi-Fi. Open a **new private browser tab** on the phone at **http://192.168.1.9:3000**. Do not use localhost on the phone. This also avoids an old open tab retaining failed/stale development assets.
3. Tap the hamburger: links should appear above the hero. Tap again: they should disappear. Reopen and tap outside: it should close. With the menu open, background scrolling should be blocked.
4. Reopen, select Tournaments, then reopen the menu on that page. Check About, Home and the appropriate Sign In/My Account destination. No login or registration changes are required for the guest menu check.
5. Repeat on the other phone/browser that previously failed. If it still fails, record phone model, OS/browser version, the URL and whether the icon changes to X. Use Android Chrome remote inspection or Safari Web Inspector to capture the **first JavaScript/network error**, failed script URL/status and HMR request; do not share tokens, cookies or account data.

If the laptop's DHCP address changes, replace the exact `192.168.1.9` entry in `next.config.ts` with the new laptop LAN hostname/IP and restart. Do not add the phone's own IP or an unrestricted wildcard.

Remaining limitations: no real-phone remote console/touch trace was captured; browser-specific or stale-cache issues may remain until step 5 is checked. Firewall/network-isolation settings were not changed. If the page itself cannot load, first check the same-network connection and existing Windows firewall rules; that is a different issue from this confirmed dev-origin rejection.
