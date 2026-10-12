"use client";

import { useId, useState } from "react";
import { Search, SearchX } from "lucide-react";
import type { Tournament, TournamentFilter } from "@/types/tournament";
import { filterTournaments } from "@/lib/tournament-status";
import { TournamentCard } from "./tournament-card";
import { useTournamentClock } from "./use-tournament-clock";

const filters: readonly { value: TournamentFilter; label: string }[] = [
  { value: "all", label: "All events" },
  { value: "upcoming", label: "Upcoming" },
  { value: "open", label: "Registration open" },
  { value: "closed", label: "Registration closed" },
  { value: "cancelled", label: "Cancelled" },
];

export function TournamentDirectory({ tournaments, initialNow }: { tournaments: readonly Tournament[]; initialNow: number }) {
  const [query, setQuery] = useState("");
  const searchId = useId();
  const [filter, setFilter] = useState<TournamentFilter>("all");
  const now = useTournamentClock(initialNow);
  const visible = filterTournaments(tournaments, query, filter, now);
  const activeLabel = filters.find((item) => item.value === filter)?.label;
  function reset() { setQuery(""); setFilter("all"); }

  return (
    <div className="tournament-directory">
      <div className="directory-controls">
        <div role="group" aria-label="Filter tournaments" className="filter-buttons">
          {filters.map((item) => <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => setFilter(item.value)}>{item.label}</button>)}
        </div>
        <div className="search-field">
          <label htmlFor={searchId} className="sr-only">Search tournaments by name</label>
          <Search size={18} aria-hidden="true" />
          <input id={searchId} type="search" placeholder="Search tournaments…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      <div className="directory-results">
        <p role="status" aria-live="polite" aria-atomic="true">{visible.length} {visible.length === 1 ? "event" : "events"} · {activeLabel}{query.trim() && ` · “${query.trim()}”`}</p>
        {(query || filter !== "all") && <button type="button" className="reset-filters" onClick={reset}>Clear filters</button>}
      </div>
      {visible.length ? (
        <div className="tournament-grid">
          {visible.map((tournament) => <TournamentCard key={tournament.slug} tournament={tournament} now={now} />)}
        </div>
      ) : (
        <div className="empty-state">
          <SearchX size={32} aria-hidden="true" /><h2>No events found.</h2>
          <p>Try another tournament name or choose a different filter.</p>
          <button type="button" className="action-link action-secondary" onClick={reset}>Reset search and filters</button>
        </div>
      )}
      <p className="directory-help">“Upcoming” includes scheduled events that have not started. Event registration is open when at least one competition is open; check each game for its own deadline.</p>
    </div>
  );
}
