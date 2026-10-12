import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function ActionLink({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) {
  return <Link className={`action-link ${secondary ? "action-secondary" : "action-primary"}`} href={href}>{children}<ArrowUpRight size={18} aria-hidden="true" /></Link>;
}
