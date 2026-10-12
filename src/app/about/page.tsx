import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { ActionLink } from "@/components/ui/action-link";

export const metadata: Metadata = { title: "About" };
export default function About() {
  return <section className="container page-section"><PageIntro eyebrow="THIS IS NEBULA" title="Built for competition."><p>Nebula Esports is a tournament organiser based in Sri Lanka, focused on bringing players together through competitive gaming events.</p></PageIntro><div className="info-panel"><h2>One banner. Multiple arenas.</h2><p>Nebula Esports hosts its own tournaments. Each event can bring together multiple game competitions, giving individual players and teams a place to compete.</p><h3>Your competition journey</h3><p>Create your player account, explore published tournaments and register for solo or team competitions while their registration windows are open. Only the team captain needs an account.</p></div><ActionLink href="/tournaments">Explore tournaments</ActionLink></section>;
}
