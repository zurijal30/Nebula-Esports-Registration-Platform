import type { Metadata } from "next";
import { PageIntro } from "@/components/ui/page-intro";
import { ActionLink } from "@/components/ui/action-link";

export const metadata: Metadata = { title: "Access denied" };
export default function AccessDenied() {
  return <section className="container page-section"><PageIntro eyebrow="ACCESS DENIED" title="This area is restricted."><p>Your account does not have administrator access. Only trusted administrators can enter this area.</p></PageIntro><ActionLink href="/dashboard" secondary>Back to your account</ActionLink></section>;
}
