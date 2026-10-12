import { notFound, redirect } from "next/navigation";
import { getLiveEvents } from "@/lib/tournaments/live";
export default async function RegistrationAlias({ params }: { params: Promise<{ slug: string; competitionId: string }> }) {
  const { slug, competitionId } = await params;
  const { tournaments, error } = await getLiveEvents(slug);
  if (error) return <section className="container page-section"><h1>Registration temporarily unavailable.</h1><p>Please try again shortly.</p></section>;
  const tournament = tournaments[0];
  if (!tournament?.competitions.some(c => c.id === competitionId)) notFound();
  redirect(`/tournaments/live/${tournament.slug}/register/${competitionId}`);
}
