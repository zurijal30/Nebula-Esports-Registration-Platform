export type RegistrationStatus = "upcoming" | "open" | "closed" | "cancelled";
export type TournamentFilter = "all" | RegistrationStatus;

/** Public data contract, independent of a future database or UI framework. */
export interface GameCompetition {
  competitionStatus?: "scheduled" | "cancelled";
  id: string;
  gameTitle: string;
  gameImage?: TournamentDisplayImage | null;
  rosterRules?: import("../lib/registrations/roster-rules").RosterRules;
  registrationType: "solo" | "team";
  startsAt: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  /** Omit to inherit the main event venue. */
  venue?: string;
  /** Sri Lankan rupees. Omit or use zero for free entry. */
  registrationFeeLkr?: number;
}

export interface TournamentDisplayImage {
  /** Local public path today; a versioned Supabase Storage URL in a later phase. */
  src: string;
  alt: string;
}

export interface Tournament {
  /** Published database events use the explicit live route namespace. */
  source?: "live";
  slug: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  eventStatus: "scheduled" | "cancelled";
  /** Null represents no banner or a banner removed by an administrator. */
  displayImage: TournamentDisplayImage | null;
  competitions: readonly GameCompetition[];
}
