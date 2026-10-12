import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { TournamentDirectory } from "@/components/tournaments/tournament-directory";
import { demoTournaments } from "@/data/tournaments";
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
      {live.error ? <p className="form-message form-error">Live events are temporarily unavailable. Please try again shortly.</p> : live.tournaments.length ? <TournamentDirectory tournaments={live.tournaments} initialNow={now} /> : <div className="info-panel"><h2>Next arena, coming soon.</h2><p>No live tournaments have been published yet. Explore the demonstration events below.</p></div>}
      <div className="section-heading demo-section-heading"><div><span className="eyebrow">EXPLORE THE EXPERIENCE</span><h2>Demonstration events<span className="accent">.</span></h2></div></div>
      <p className="demo-notice"><span className="notice-label">DEMONSTRATION CONTENT</span> The events below have fictional venues, schedules, and fees. Demo competitions cannot accept submissions. All times are shown in Asia/Colombo (UTC+05:30).</p>
      <TournamentDirectory tournaments={demoTournaments} initialNow={now} />
    </section>
  );
}
