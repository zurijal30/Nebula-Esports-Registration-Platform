import Link from "next/link";
import { Brand } from "./brand";
import { navigation } from "@/lib/site";

export function Footer() {
  return <footer className="site-footer"><div className="container footer-top"><div><Brand /><p>Built for the competitive spirit.</p></div><nav aria-label="Footer navigation">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}<Link href="/sign-in">Sign In</Link></nav><div className="footer-contact"><span className="eyebrow">GET IN TOUCH</span><p>Contact details coming soon.</p></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} Nebula Esports. All rights reserved.</span><span>SRI LANKA <span className="small-dot" /> READY FOR WHAT’S NEXT.</span></div></footer>;
}
