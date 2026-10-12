import { notFound, redirect } from "next/navigation";
import { getLiveEvents } from "@/lib/tournaments/live";
export default async function TournamentAlias({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tournaments, error } = await getLiveEvents(slug);
  if (error) return <section className="container page-section"><h1>Event temporarily unavailable.</h1><p>Please try again shortly.</p></section>;
  if (!tournaments.length) notFound();
  redirect(`/tournaments/live/${tournaments[0].slug}`);
}
