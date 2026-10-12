import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { TournamentDirectory } from "@/components/tournaments/tournament-directory";
import { TournamentEmptyState } from "@/components/tournaments/tournament-empty-state";
import { getRequestNow } from "@/lib/server-time";
import { getLiveEvents } from "@/lib/tournaments/live";

export const metadata: Metadata = { title: "Tournaments" };
// Registration states reflect request time, not the last production build.
export const dynamic = "force-dynamic";

export default async function Tournaments() {
  const now = await getRequestNow();
  const live = await getLiveEvents();
  return (
    <section className="container page-section">
      <PageIntro eyebrow="THE COMPETITION / EVENT DIRECTORY" title="Find your arena.">
        <p>One organiser. Multiple games. Explore events and find the competition for you.</p>
      </PageIntro>
      <div className="section-heading"><div><span className="eyebrow">PUBLISHED BY NEBULA</span><h2>Live tournaments<span className="accent">.</span></h2></div></div>
      {live.error ? <p className="form-message form-error">Live events are temporarily unavailable. Please try again shortly.</p> : live.tournaments.length ? <TournamentDirectory tournaments={live.tournaments} initialNow={now} /> : <TournamentEmptyState />}
    </section>
  );
}
