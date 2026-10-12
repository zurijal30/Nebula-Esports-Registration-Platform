import type { Tournament, TournamentDisplayImage } from "@/types/tournament";

export const defaultTournamentImage: TournamentDisplayImage = {
  src: "/images/events/default-banner.svg",
  alt: "Default Nebula Esports event banner: Your Next Arena",
};

export function getTournamentImage(tournament: Tournament): TournamentDisplayImage {
  return tournament.displayImage?.src.trim() ? tournament.displayImage : defaultTournamentImage;
}
