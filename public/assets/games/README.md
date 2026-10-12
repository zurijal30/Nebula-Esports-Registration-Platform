# Game logo provenance and usage notes

Reviewed/downloaded **12 October 2026**. The user confirmed publisher permission for **Riot, EA and F1** in this task. That confirmation is the basis for enabling the four assets below; the permission documents themselves were not supplied or independently verified. Publisher copyright/trademark rights remain with their owners. This manifest does not grant additional usage rights.

Logos are used only beside readable game names in the supported-game catalog, with original colors/proportions and no implication of publisher sponsorship. No third-party hotlinks, invented trademarks, annual FC edition, character art or watermarks are used.

## Saved authentic assets

| Local file | Official source | Preparation / usage basis |
| --- | --- | --- |
| `valorant.webp` | [Riot press page](https://www.riotgames.com/en/press); [official VALORANT ZIP](https://www.riotgames.com/darkroom/original/529d413f0d04b52fa43ac4e0afae762a:5079209ca6c46089fe07ff56ed1cf3d1/valorant-logos.zip) | Official `Logomark/V_Logomark_Off-White.png`. Original 4000×2250; 213×120 transparent lossless WebP, 1,722 bytes. User-confirmed Riot permission. |
| `league-of-legends.webp` | [Riot press page](https://www.riotgames.com/en/press); [official rendered logo](https://www.riotgames.com/darkroom/original/9a50f5b3bdcfb815580ef103ec9b6ee2:d49b78b12cf185e10127cdf81b144a00/lol-logo-rendered-hi-res.png) | Original 3331×2160; 185×120 transparent lossless WebP, 23,832 bytes. User-confirmed Riot permission. |
| `ea-sports-fc.svg` | [EA SPORTS FC official page](https://www.ea.com/games/ea-sports-fc); [publisher-hosted series logo](https://drop-assets.ea.com/images/W7jZ4vGojPtXKtHG0UAQQ/5e4c25d06e2346d2ef1f0db4e130b812/ea-primary-fc-logo-hero-med.svg) | Original 192×101 vector/viewBox, 6,017 bytes. Edition-neutral series branding, not FC 24/25/26. User-confirmed EA permission. SVG checked for scripts/external references. |
| `f1.webp` | [Formula 1 official site](https://www.formula1.com/); [official F1 logo](https://www.formula1.com/etc/designs/fom-website/images/f1-logo-red.png) | Original 480×120; 240×60 transparent lossless WebP, 1,814 bytes. Generic F1 mark, no annual game edition. User-confirmed F1 permission. |

Raster preparation uniformly scales to fit 240×120 without enlarging, cropping, recoloring or changing the mark's proportions. Original transparent padding is preserved. All four files were fully decoded and verified in automated tests and loaded successfully in the browser. SVG remains a vector. Runtime images always use local `/assets/games/` paths.

## Publisher terms checked

- [Riot Legal Jibber Jabber](https://www.riotgames.com/en/legal), section 5: logo/trademark use requires written authorization. Assets are enabled based on the user's confirmed Riot permission, not merely their availability on the press page.
- [EA content policy](https://help.ea.com/en/articles/security-and-rules/ea-content-policy/) and [FC tournament guidelines](https://www.ea.com/games/ea-sports-fc/fc-25/community-guidelines): tournament branding has restrictions. The user confirmed EA permission; the asset is the generic series logo. The FC 25 guideline link is a reviewed policy example, not the catalog's game edition.
- [F1 trademark guidelines](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt): logo use requires express permission. User-confirmed F1 permission is the basis for the saved mark.

## Neutral fallbacks / missing permitted assets

These nine games remain in the ticker with a neutral Lucide gamepad icon and ordinary readable name. Their official logos were **not downloaded or published**, because a suitable grant for Nebula's tournament-site use was not confirmed. The neutral icon is part of the existing Lucide dependency (ISC license); it does not imitate any game logo.

| Game | Official sources reviewed | Reason for fallback |
| --- | --- | --- |
| Dota 2 | [Dota 2](https://www.dota2.com/home), [Valve site terms](https://www.valvesoftware.com/en/legal/site-terms-of-use) | No suitable site-use permission confirmed; general site terms limit reuse. |
| Call of Duty | [Activision Media Center](https://press.activision.com/downloads), [Activision terms](https://www.activision.com/legal/terms-of-use) | Press access/asset availability is not a confirmed tournament-site license. |
| PUBG Mobile | [Official brand assets](https://www.pubgmobile.com/en/event/brandassets/) | Logo downloads exist, but permission for this organizer-site use was not confirmed. No PC PUBG license was assumed to cover PUBG Mobile. |
| Free Fire | [Official brand assets](https://www.freefiremobile.com/en/brand/), [Garena terms](https://content.garena.com/legal/tos/tos_en.html) | Public downloads do not establish commercial-site rights; general terms limit content reuse. |
| Mobile Legends: Bang Bang | [Official community tournament licensing](https://play.mobilelegends.com/thirdpartytournament/form) | Appropriate permission/assets not confirmed. No authorization application was submitted. |
| Call of Duty: Mobile | [Official game site](https://www.callofduty.com/mobile), [Activision Media Center](https://press.activision.com/downloads) | Suitable licensed site asset not confirmed. |
| eFootball Mobile | [Official eFootball site](https://www.konami.com/efootball/en/), [Konami terms](https://legal.konami.com/games/efootball/2024/terms/tou/efootcs_tou_en-us-jp.html) | Suitable logo reuse permission not confirmed. |
| Mortal Kombat | [Official media page](https://www.mortalkombat.com/en-us/media) | Media availability alone did not establish permission for this organizer-site use. |
| Tekken | [Bandai Namco press center](https://www.bandainamcoent.com/press-center), [licensing information](https://www.bandainamcoent.com/licensing) | Press-only assets / broader rights not confirmed for this site. |

To enable another approved logo, save the original/optimized authentic local file here and update its `logo` reference/dimensions in `src/data/supported-games.ts`. Record its source and usage basis here and rerun the asset test. Do not add remote image URLs or replace fallback icons with invented trademarks. Keep any confidential permission documents outside this public directory.
