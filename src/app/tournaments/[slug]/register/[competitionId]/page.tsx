import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoTournaments, getTournament } from "@/data/tournaments";
import { PageIntro } from "@/components/ui/page-intro";
import { ActionLink } from "@/components/ui/action-link";

export const metadata: Metadata = { title: "Demonstration registration preview" };
export function generateStaticParams() {
  return demoTournaments.flatMap((tournament) => tournament.competitions.map((competition) => ({ slug: tournament.slug, competitionId: competition.id })));
}

export default async function RegistrationInformation({ params }: { params: Promise<{ slug: string; competitionId: string }> }) {
  const { slug, competitionId } = await params;
  const tournament = getTournament(slug);
  const competition = tournament?.competitions.find((game) => game.id === competitionId);
  if (!tournament || !competition) notFound();

  return (
    <section className="container page-section">
      <PageIntro eyebrow="DEMONSTRATION / REGISTRATION PREVIEW" title="Explore your next arena.">
        <p>This fictional competition is for browsing only. No registration has been submitted.</p>
      </PageIntro>
      <div className="info-panel">
        <span className="eyebrow">DEMONSTRATION COMPETITION</span>
        <h2>{competition.gameTitle} · {tournament.title}</h2>
        <p>This fictional event previews {competition.registrationType} registration. Registration dates and fees are examples only.</p>
        <p>{competition.registrationType === "team" ? "For live team competitions, only the captain needs an account." : "For live solo competitions, register with your player account."}</p>
        <p>Visit Live tournaments in the directory to find registration-eligible competitions.</p>
      </div>
      <ActionLink href={`/tournaments/${tournament.slug}#competition-${competition.id}`} secondary>Back to competition</ActionLink>
    </section>
  );
}
