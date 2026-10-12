"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Animate committed route content, keeping the shared layout and DOM state. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches || !content.current?.animate) return;
    const animation = content.current.animate(
      [{ opacity: 0.94, transform: "translateY(3px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 180, easing: "ease-out" },
    );
    const stop = () => { if (preference.matches) animation.cancel(); };
    preference.addEventListener("change", stop);
    return () => { animation.cancel(); preference.removeEventListener("change", stop); };
  }, [pathname]);
  return <div ref={content} className="page-transition">{children}</div>;
}
