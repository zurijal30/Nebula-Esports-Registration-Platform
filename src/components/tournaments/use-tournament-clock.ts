"use client";

import { useEffect, useState } from "react";

/** Match server markup on hydration, then refresh open pages once per minute. */
export function useTournamentClock(initialNow: number) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}
