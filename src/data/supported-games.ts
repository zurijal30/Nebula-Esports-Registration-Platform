export type GamePlatform = "PC" | "Mobile" | "Console";
export interface SupportedGame {
  slug: string;
  name: string;
  platform: GamePlatform;
  /** Only local, authentic assets with confirmed usage rights. Null uses a neutral icon. */
  logo: { src: string; width: number; height: number } | null;
}
// Presentation catalog only: never inserts games or creates tournaments.
// Sources/permission notes: public/assets/games/README.md.
export const supportedGames: readonly SupportedGame[] = [
  { slug: "valorant", name: "VALORANT", platform: "PC", logo: { src: "/assets/games/valorant.webp", width: 213, height: 120 } },
  { slug: "dota-2", name: "Dota 2", platform: "PC", logo: null },
  { slug: "call-of-duty", name: "Call of Duty", platform: "PC", logo: null },
  { slug: "league-of-legends", name: "League of Legends", platform: "PC", logo: { src: "/assets/games/league-of-legends.webp", width: 185, height: 120 } },
  { slug: "pubg-mobile", name: "PUBG Mobile", platform: "Mobile", logo: null },
  { slug: "free-fire", name: "Free Fire", platform: "Mobile", logo: null },
  { slug: "mobile-legends", name: "Mobile Legends: Bang Bang", platform: "Mobile", logo: null },
  { slug: "call-of-duty-mobile", name: "Call of Duty: Mobile", platform: "Mobile", logo: null },
  { slug: "efootball-mobile", name: "eFootball Mobile", platform: "Mobile", logo: null },
  { slug: "ea-sports-fc", name: "EA Sports FC", platform: "Console", logo: { src: "/assets/games/ea-sports-fc.svg", width: 192, height: 101 } },
  { slug: "mortal-kombat", name: "Mortal Kombat", platform: "Console", logo: null },
  { slug: "tekken", name: "Tekken", platform: "Console", logo: null },
  { slug: "f1", name: "F1", platform: "Console", logo: { src: "/assets/games/f1.webp", width: 240, height: 60 } },
];
