import type { TournamentDisplayImage } from "../types/tournament.ts";
export const GAME_BANNER_FALLBACK = "/images/games/default-banner.svg";
// Leave multipart overhead below Vercel's 4.5 MB request limit.
export const MAX_BANNER_BYTES = 4 * 1024 * 1024;
export function gameImage(image?:TournamentDisplayImage|null):TournamentDisplayImage {
  return image?.src ? image : {src:GAME_BANNER_FALLBACK,alt:"Nebula Esports game competition"};
}
