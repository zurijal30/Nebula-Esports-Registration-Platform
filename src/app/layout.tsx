import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";
import { getCurrentAccount } from "@/lib/auth/account";
import { LiveEventRefresh } from "@/components/tournaments/live-refresh";

export const metadata: Metadata = {
  title: { default: "Nebula Esports — Your Arena. Your Legacy.", template: "%s | Nebula Esports" },
  description: "Discover Nebula Esports tournaments in Sri Lanka and register for solo and team competitions. Sample events are clearly labelled as demonstrations.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account = await getCurrentAccount();
  return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a><Header signedIn={Boolean(account.user)} /><main id="main-content">{children}</main><Footer /><LiveEventRefresh/></body></html>;
}
