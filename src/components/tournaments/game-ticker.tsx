"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { Gamepad2 } from "lucide-react";
import { supportedGames } from "@/data/supported-games";
export function GameTicker() {
  const windowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = windowRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const preference = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const items = Array.from(track.querySelectorAll<HTMLElement>(".ticker-game"));
    const strengths = items.map(() => 0);
    let centers: number[] = [];
    let pointerX: number | null = null;
    let frame = 0;
    let previousTime = 0;
    // Cache unscaled positions; only the track's moving position is read each frame.
    function measure() {
      const left = track!.getBoundingClientRect().left;
      centers = items.map(item => {
        const rect = item.querySelector(".ticker-logo")!.getBoundingClientRect();
        return rect.left - left + rect.width / 2;
      });
    }
    function animate(time: number) {
      frame = 0;
      const smoothing = 1 - Math.exp(-Math.min(time - previousTime || 16, 64) / 85);
      previousTime = time;
      const left = pointerX === null ? 0 : track!.getBoundingClientRect().left;
      let settling = false;
      items.forEach((item, index) => {
        const distance = pointerX === null ? 1 : Math.min(Math.abs(left + centers[index] - pointerX) / 320, 1);
        const target = (1 - distance * distance) ** 3;
        const next = strengths[index] + (target - strengths[index]) * smoothing;
        strengths[index] = next < 0.001 ? 0 : next;
        item.style.setProperty("--ticker-proximity", strengths[index].toFixed(4));
        settling ||= strengths[index] > 0;
      });
      if (pointerX !== null || settling) frame = requestAnimationFrame(animate);
    }
    function start() {
      if (!frame) { previousTime = 0; frame = requestAnimationFrame(animate); }
    }
    function approach(event: PointerEvent) {
      if (!preference.matches || event.pointerType === "touch") return;
      pointerX = event.clientX;
      start();
    }
    function enter(event: PointerEvent) { measure(); approach(event); }
    function leave() { pointerX = null; start(); }
    function reset() {
      pointerX = null;
      cancelAnimationFrame(frame);
      frame = 0;
      strengths.fill(0);
      items.forEach(item => item.style.removeProperty("--ticker-proximity"));
    }
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(viewport);
    viewport.addEventListener("pointerenter", enter);
    viewport.addEventListener("pointermove", approach, { passive: true });
    viewport.addEventListener("pointerleave", leave);
    window.addEventListener("blur", reset);
    preference.addEventListener("change", reset);
    measure();
    return () => {
      reset();
      observer.disconnect();
      viewport.removeEventListener("pointerenter", enter);
      viewport.removeEventListener("pointermove", approach);
      viewport.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", reset);
      preference.removeEventListener("change", reset);
    };
  }, []);
  return <section className="games-ticker" aria-labelledby="games-ticker-title">
    <div className="container games-ticker-inner">
      <div className="games-ticker-label"><Gamepad2 size={18} aria-hidden="true" /><span id="games-ticker-title">THE GAMES. THE COMPETITION.</span></div>
      <div ref={windowRef} className="game-ticker-window" tabIndex={0} role="region" aria-label="Supported games" aria-describedby="games-ticker-help">
        <p className="sr-only" id="games-ticker-help">Games are listed independently of announced tournaments. This strip scrolls continuously; reduced-motion preferences show a static list.</p>
        <div ref={trackRef} className="game-ticker-track">
          {[false, true].map(duplicate => <ul className={`game-ticker-group${duplicate ? " game-ticker-copy" : ""}`} key={String(duplicate)} aria-hidden={duplicate ? true : undefined}>
            {supportedGames.map(game => <li className="ticker-game" key={game.slug} data-platform={game.platform}>
              <span className="ticker-logo" aria-hidden="true">{game.logo ? <Image src={game.logo.src} alt="" width={game.logo.width} height={game.logo.height} loading="eager" unoptimized /> : <Gamepad2 size={28} strokeWidth={1.4} className="ticker-fallback" />}</span>
              <span className="ticker-game-copy"><span className="ticker-game-name">{game.name}</span><span className="ticker-platform">{game.platform}</span></span>
            </li>)}
          </ul>)}
        </div>
      </div>
    </div>
  </section>;
}
