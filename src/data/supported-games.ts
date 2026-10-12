export type GamePlatform = "PC" | "Mobile" | "Console";
export interface SupportedGame {
  slug: string;
  name: string;
  platform: GamePlatform;
  /** Publisher-sourced, user-provided, or clearly identified original artwork. */
  logo: { src: string; width: number; height: number; kind: "official" | "provided" | "custom" } | null;
}
// Presentation catalog only: never inserts games or creates tournaments.
// Sources/permission notes: public/assets/games/README.md.
export const supportedGames: readonly SupportedGame[] = [
  { slug: "valorant", name: "VALORANT", platform: "PC", logo: { src: "/assets/games/valorant.webp", width: 213, height: 120, kind: "official" } },
  { slug: "dota-2", name: "Dota 2", platform: "PC", logo: { src: "/assets/games/dota-2-white.webp", width: 128, height: 128, kind: "provided" } },
  { slug: "call-of-duty", name: "Call of Duty", platform: "PC", logo: { src: "/assets/games/call-of-duty-logo.webp", width: 256, height: 83, kind: "provided" } },
  { slug: "league-of-legends", name: "League of Legends", platform: "PC", logo: { src: "/assets/games/league-of-legends-symbol.webp", width: 113, height: 128, kind: "provided" } },
  { slug: "pubg-mobile", name: "PUBG Mobile", platform: "Mobile", logo: { src: "/assets/games/pubg-mobile-logo.webp", width: 220, height: 128, kind: "provided" } },
  { slug: "free-fire", name: "Free Fire", platform: "Mobile", logo: { src: "/assets/games/free-fire-logo.webp", width: 256, height: 81, kind: "provided" } },
  { slug: "mobile-legends", name: "Mobile Legends: Bang Bang", platform: "Mobile", logo: { src: "/assets/games/mobile-legends-logo.webp", width: 222, height: 128, kind: "provided" } },
  { slug: "call-of-duty-mobile", name: "Call of Duty: Mobile", platform: "Mobile", logo: { src: "/assets/games/call-of-duty-mobile-white.webp", width: 256, height: 84, kind: "provided" } },
  { slug: "efootball-mobile", name: "eFootball Mobile", platform: "Mobile", logo: { src: "/assets/games/efootball-mobile-logo.webp", width: 128, height: 128, kind: "provided" } },
  { slug: "ea-sports-fc", name: "EA Sports FC", platform: "Console", logo: { src: "/assets/games/ea-sports-fc.svg", width: 192, height: 101, kind: "official" } },
  { slug: "mortal-kombat", name: "Mortal Kombat", platform: "Console", logo: { src: "/assets/games/mortal-kombat-logo.webp", width: 203, height: 128, kind: "provided" } },
  { slug: "tekken", name: "Tekken", platform: "Console", logo: { src: "/assets/games/tekken-logo.webp", width: 126, height: 128, kind: "provided" } },
  { slug: "f1", name: "F1", platform: "Console", logo: { src: "/assets/games/f1.webp", width: 240, height: 60, kind: "official" } },
];
