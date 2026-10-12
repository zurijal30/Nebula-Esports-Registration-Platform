"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "./brand";
import { navigation } from "@/lib/site";

export function Header({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && open) { setOpen(false); toggle.current?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return <header className="site-header"><div className="container header-inner"><Brand /><button ref={toggle} className="menu-toggle" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button><nav id="primary-navigation" aria-label="Main navigation" className={`navigation ${open ? "is-open" : ""}`}>{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setOpen(false)}>{item.label}</Link>)}<Link className="sign-in" href={signedIn ? "/dashboard" : "/sign-in"} aria-current={pathname === (signedIn ? "/dashboard" : "/sign-in") ? "page" : undefined} onClick={() => setOpen(false)}>{signedIn ? "My Account" : "Sign In"} <ArrowUpRight size={16} aria-hidden="true" /></Link></nav></div></header>;
}
