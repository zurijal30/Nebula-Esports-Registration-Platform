import { Crosshair } from "lucide-react";
export function TournamentEmptyState({ upcoming = false }: { upcoming?: boolean }) {
  return <div className="tournament-empty"><Crosshair size={32} strokeWidth={1.2} aria-hidden="true" /><span className="eyebrow">THE NEXT CHAPTER</span><h3>{upcoming ? "No upcoming tournaments announced yet." : "No tournaments announced yet."}</h3><p>Stay tuned for upcoming competitions.</p></div>;
}
