import { ArrowUpRight, Crosshair, Gamepad2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { ActionLink } from "@/components/ui/action-link";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { demoTournaments } from "@/data/tournaments";
import { isUpcomingTournament } from "@/lib/tournament-status";
import { getRequestNow } from "@/lib/server-time";
import { getLiveEvents } from "@/lib/tournaments/live";

export const dynamic = "force-dynamic";
export default async function Home() {
  const now = await getRequestNow();
  const live=await getLiveEvents();
  const liveUpcoming=live.tournaments.filter(t=>isUpcomingTournament(t,now)).slice(0,3);
  const showingLive=liveUpcoming.length>0;
  const upcoming = showingLive?liveUpcoming:demoTournaments.filter((tournament) => isUpcomingTournament(tournament, now)).slice(0, 3);
  return <>
    <section className="hero"><div className="container hero-inner"><div className="hero-copy"><div className="hero-kicker"><span className="small-dot" /> SRI LANKA’S COMPETITIVE GAMING STAGE</div><h1>YOUR ARENA.<br /><span>YOUR LEGACY.</span></h1><p>Discover upcoming competitions, register your squad, and compete in tournaments hosted by Nebula Esports.</p><div className="hero-actions"><ActionLink href="/tournaments">Explore Tournaments</ActionLink><ActionLink href="#about" secondary>Learn More</ActionLink></div><div className="hero-footnote"><span className="line-mark" /> THE NEXT CHAPTER STARTS HERE.</div></div><div className="hero-visual"><Image src="/images/arena.svg" alt="Original illustration of an illuminated cyan esports arena with a central stage" width={800} height={700} priority unoptimized /><div className="visual-label"><Crosshair size={17} aria-hidden="true" /><span>THE STAGE IS YOURS</span><span>01 / NEBULA</span></div></div></div></section>
    <div className="games-strip"><div className="container games-inner"><span className="games-label"><Gamepad2 size={18} aria-hidden="true" /> THE GAMES. THE COMPETITION.</span><div><span>VALORANT</span><span>PUBG MOBILE</span><span>MOBILE LEGENDS</span><span>TEKKEN</span><span>EA SPORTS FC</span></div></div></div>
    <section className="section container" id="tournaments"><div className="section-heading"><div><span className="eyebrow">01 / FIND YOUR NEXT CHALLENGE</span><h2>Upcoming tournaments<span className="accent">.</span></h2></div><Link className="text-link" href="/tournaments">All tournaments <ArrowUpRight size={18} aria-hidden="true" /></Link></div>{showingLive ? <p className="directory-help">Published Nebula events. Check each game for its own registration window.</p> : <p className="demo-notice"><span className="notice-label">DEMONSTRATION CONTENT</span> These sample events have fictional schedules, venues and fees. Demo registration is unavailable.</p>}<div className="tournament-grid">{upcoming.map((tournament) => <TournamentCard key={tournament.slug} tournament={tournament} now={now} />)}</div>{upcoming.length === 0 && <p className="directory-help">No upcoming demonstration events. Explore the directory for past and cancelled examples.</p>}</section>
    <section className="about-section" id="about"><div className="container about-inner"><div><span className="eyebrow">02 / THIS IS NEBULA</span><h2>For the players.<br />For the competition.</h2><p>Nebula Esports is a Sri Lankan tournament organiser focused on competitive gaming events. We bring games, teams, and players together under one banner.</p><ActionLink href="/about" secondary>Meet Nebula Esports</ActionLink></div><div className="about-values"><div><Trophy aria-hidden="true" /><h3>One organiser. A shared arena.</h3><p>Every tournament is hosted by Nebula Esports.</p></div><div><Gamepad2 aria-hidden="true" /><h3>Different games. Same competitive spirit.</h3><p>A home for competition across multiple titles.</p></div><div><Users aria-hidden="true" /><h3>Your squad. Your moment.</h3><p>Built around players and the teams they bring.</p></div></div></div></section>
  </>;
}
