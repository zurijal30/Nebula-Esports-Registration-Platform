import { ArrowUpRight, Gamepad2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import heroBanner from "../../assets/nebula-web-banner.png";
import { ActionLink } from "@/components/ui/action-link";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { GameTicker } from "@/components/tournaments/game-ticker";
import { TournamentEmptyState } from "@/components/tournaments/tournament-empty-state";
import { isUpcomingTournament } from "@/lib/tournament-status";
import { getRequestNow } from "@/lib/server-time";
import { getLiveEvents } from "@/lib/tournaments/live";

export const dynamic = "force-dynamic";
export default async function Home() {
  const now = await getRequestNow();
  const live=await getLiveEvents();
  const upcoming=live.tournaments.filter(t=>isUpcomingTournament(t,now)).slice(0,3);
  return <>
    <section className="hero"><div className="hero-art" aria-hidden="true"><Image src={heroBanner} alt="" fill sizes="(max-width: 760px) 860px, 100vw" preload /></div><div className="container hero-inner"><div className="hero-copy"><div className="hero-kicker"><span className="small-dot" /> SRI LANKA’S COMPETITIVE GAMING STAGE</div><h1>YOUR ARENA.<br /><span>YOUR LEGACY.</span></h1><p>Discover upcoming competitions, register your squad, and compete in tournaments hosted by Nebula Esports.</p><div className="hero-actions"><ActionLink href="/tournaments">Explore Tournaments</ActionLink><ActionLink href="#about" secondary>Learn More</ActionLink></div><div className="hero-footnote"><span className="line-mark" /> THE NEXT CHAPTER STARTS HERE.</div></div></div></section>
    <GameTicker />
    <section className="section container" id="tournaments"><div className="section-heading"><div><span className="eyebrow">01 / FIND YOUR NEXT CHALLENGE</span><h2>Upcoming tournaments<span className="accent">.</span></h2></div><Link className="text-link" href="/tournaments">All tournaments <ArrowUpRight size={18} aria-hidden="true" /></Link></div>{live.error ? <p className="form-message form-error">Tournaments are temporarily unavailable. Please try again shortly.</p> : upcoming.length ? <><p className="directory-help">Published Nebula events. Check each game for its own registration window.</p><div className="tournament-grid">{upcoming.map((tournament) => <TournamentCard key={tournament.slug} tournament={tournament} now={now} />)}</div></> : <TournamentEmptyState upcoming={live.tournaments.length>0} />}</section>
    <section className="about-section" id="about"><div className="container about-inner"><div><span className="eyebrow">02 / THIS IS NEBULA</span><h2>For the players.<br />For the competition.</h2><p>Nebula Esports is a Sri Lankan tournament organiser focused on competitive gaming events. We bring games, teams, and players together under one banner.</p><ActionLink href="/about" secondary>Meet Nebula Esports</ActionLink></div><div className="about-values"><div><Trophy aria-hidden="true" /><h3>One organiser. A shared arena.</h3><p>Every tournament is hosted by Nebula Esports.</p></div><div><Gamepad2 aria-hidden="true" /><h3>Different games. Same competitive spirit.</h3><p>A home for competition across multiple titles.</p></div><div><Users aria-hidden="true" /><h3>Your squad. Your moment.</h3><p>Built around players and the teams they bring.</p></div></div></div></section>
  </>;
}
