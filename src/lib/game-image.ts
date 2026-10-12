import type { TournamentDisplayImage } from "../types/tournament.ts";
export const GAME_BANNER_FALLBACK = "/images/games/default-banner.svg";
export function gameImage(image?:TournamentDisplayImage|null):TournamentDisplayImage {
  return image?.src ? image : {src:GAME_BANNER_FALLBACK,alt:"Nebula Esports game competition"};
}
