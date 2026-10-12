"use client";

import Image from "next/image";
import { useState } from "react";
import type { Tournament } from "@/types/tournament";
import { defaultTournamentImage, getTournamentImage } from "@/lib/tournament-image";

/** A single data-driven banner renderer shared by cards and event pages. */
export function TournamentArtwork({ tournament, large = false }: { tournament: Tournament; large?: boolean }) {
  const configuredImage = getTournamentImage(tournament);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  // An updated reference is tried immediately, even if the previous URL failed.
  const image = failedSource === configuredImage.src ? defaultTournamentImage : configuredImage;

  return (
    <div className={`tournament-art${large ? " detail-art" : ""}`}>
      <Image
        key={image.src}
        src={image.src}
        alt={image.alt || `${tournament.title} event banner`}
        fill
        sizes={large ? "(max-width: 760px) 100vw, 50vw" : "(max-width: 760px) 100vw, 33vw"}
        className="tournament-image"
        // Direct URLs accept future Storage images without a guessed hostname or
        // an optimisation cache serving the previous image after replacement.
        unoptimized
        loading={large ? "eager" : "lazy"}
        onError={() => {
          if (image.src !== defaultTournamentImage.src) setFailedSource(image.src);
        }}
      />
      <span className="demo-tag">{tournament.source === "live" ? "NEBULA EVENT" : "DEMO EVENT"}</span>
    </div>
  );
}
