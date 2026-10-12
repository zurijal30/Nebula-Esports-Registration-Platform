"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { navigation } from "@/lib/site";

export function Header({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  // A route change starts with a closed disclosure, including browser navigation.
  return <HeaderNavigation key={pathname} pathname={pathname} signedIn={signedIn} />;
}

function HeaderNavigation({ pathname, signedIn }: { pathname: string; signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const mobile = window.matchMedia("(max-width: 760px)");
    if (!mobile.matches) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + gutter}px`;
    body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    }
    function onOutside(event: PointerEvent) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    }
    function onBreakpoint(event: MediaQueryListEvent) { if (!event.matches) setOpen(false); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    mobile.addEventListener("change", onBreakpoint);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      mobile.removeEventListener("change", onBreakpoint);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
    };
  }, [open]);

  return <header ref={header} className="site-header" onBlur={event => { if (open && event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}><div className="container header-inner"><Brand /><button type="button" ref={toggle} className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(current => !current)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button><nav id="primary-navigation" aria-label="Main navigation" className={`navigation ${open ? "is-open" : ""}`}>{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}<Link className="sign-in" href={signedIn ? "/dashboard" : "/sign-in"} aria-current={pathname === (signedIn ? "/dashboard" : "/sign-in") ? "page" : undefined} onClick={() => setOpen(false)}>{signedIn ? "My Account" : "Sign In"} <ArrowUpRight size={16} aria-hidden="true" /></Link></nav></div></header>;
}
