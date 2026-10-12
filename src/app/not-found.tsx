import { PageIntro } from "@/components/ui/page-intro";
import { ActionLink } from "@/components/ui/action-link";

export default function NotFound() {
  return <section className="container page-section"><PageIntro eyebrow="404 / OUTSIDE THE ARENA" title="Page not found."><p>The page you’re looking for doesn’t exist.</p></PageIntro><ActionLink href="/">Back to home</ActionLink></section>;
}
