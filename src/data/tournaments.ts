import type { Tournament } from "@/types/tournament";

// Fictional examples only. Timestamps include Sri Lanka's UTC+05:30 offset.
// Dates intentionally age with the real clock; registration statuses are derived.
export const demoTournaments: readonly Tournament[] = [
  {
    slug: "arena-series",
    title: "Arena Series",
    description: "A demonstration of a two-day event bringing tactical team play and battle royale competition together under one Nebula banner.",
    startsAt: "2026-11-07T09:00:00+05:30",
    endsAt: "2026-11-08T20:00:00+05:30",
    venue: "Example venue · Colombo arena",
    eventStatus: "scheduled",
    displayImage: { src: "/images/events/arena-series.svg", alt: "Cyan Arena Series concept banner reading Enter the Arena" },
    competitions: [
      {
        id: "valorant", gameTitle: "VALORANT", registrationType: "team",
        startsAt: "2026-11-07T10:00:00+05:30",
        registrationOpensAt: "2026-10-01T09:00:00+05:30",
        registrationClosesAt: "2026-11-01T23:59:00+05:30",
        registrationFeeLkr: 2500,
      },
      {
        id: "pubg-mobile", gameTitle: "PUBG Mobile", registrationType: "team",
        startsAt: "2026-11-08T11:00:00+05:30",
        registrationOpensAt: "2026-10-20T09:00:00+05:30",
        registrationClosesAt: "2026-11-03T18:00:00+05:30",
        venue: "Example venue · Colombo mobile stage", registrationFeeLkr: 1500,
      },
    ],
  },
  {
    slug: "mobile-showdown",
    title: "Mobile Showdown",
    description: "A sample mobile gaming event with independent registration windows for each team competition. All schedules and fees are illustrative.",
    startsAt: "2026-12-05T09:00:00+05:30",
    endsAt: "2026-12-05T21:00:00+05:30",
    venue: "Example venue · Kandy gaming hall",
    eventStatus: "scheduled",
    displayImage: { src: "/images/events/mobile-showdown.svg", alt: "Blue Mobile Showdown concept banner reading Small Screen, Big Plays" },
    competitions: [
      {
        id: "mobile-legends", gameTitle: "Mobile Legends: Bang Bang", registrationType: "team",
        startsAt: "2026-12-05T10:00:00+05:30",
        registrationOpensAt: "2026-11-01T09:00:00+05:30",
        registrationClosesAt: "2026-11-28T23:59:00+05:30",
      },
      {
        id: "pubg-mobile", gameTitle: "PUBG Mobile", registrationType: "team",
        startsAt: "2026-12-05T15:00:00+05:30",
        registrationOpensAt: "2026-11-10T09:00:00+05:30",
        registrationClosesAt: "2026-11-30T18:00:00+05:30", registrationFeeLkr: 1000,
      },
    ],
  },
  {
    slug: "versus-cup",
    title: "Versus Cup",
    description: "An example solo competition day, featuring fighting games and virtual football. Its sample registration windows close ahead of the event.",
    startsAt: "2026-10-24T09:00:00+05:30",
    endsAt: "2026-10-24T19:00:00+05:30",
    venue: "Example venue · Colombo competition hall",
    eventStatus: "scheduled",
    displayImage: { src: "/images/events/versus-cup.svg", alt: "Silver Versus Cup concept banner reading The Next Challenger" },
    competitions: [
      {
        id: "tekken", gameTitle: "Tekken", registrationType: "solo",
        startsAt: "2026-10-24T10:00:00+05:30",
        registrationOpensAt: "2026-09-01T09:00:00+05:30",
        registrationClosesAt: "2026-10-05T18:00:00+05:30", registrationFeeLkr: 500,
      },
      {
        id: "ea-sports-fc", gameTitle: "EA Sports FC", registrationType: "solo",
        startsAt: "2026-10-24T14:00:00+05:30",
        registrationOpensAt: "2026-09-10T09:00:00+05:30",
        registrationClosesAt: "2026-10-08T23:59:00+05:30",
      },
    ],
  },
  {
    slug: "arena-rematch",
    title: "Arena Rematch",
    description: "A cancelled demonstration event. Its original schedule remains visible to show how cancellation takes priority over registration dates.",
    startsAt: "2026-11-14T09:00:00+05:30",
    endsAt: "2026-11-14T19:00:00+05:30",
    venue: "Example venue · Galle gaming hall",
    eventStatus: "cancelled",
    // Demonstrates the same default banner on cards and the event detail page.
    displayImage: null,
    competitions: [
      {
        id: "valorant", gameTitle: "VALORANT", registrationType: "team",
        startsAt: "2026-11-14T10:00:00+05:30",
        registrationOpensAt: "2026-10-01T09:00:00+05:30",
        registrationClosesAt: "2026-11-07T18:00:00+05:30",
      },
    ],
  },
];

export function getTournament(slug: string) {
  return demoTournaments.find((tournament) => tournament.slug === slug);
}
