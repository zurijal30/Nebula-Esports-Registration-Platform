import Image from "next/image";
import Link from "next/link";

export function Brand({ glitch = false }: { glitch?: boolean }) {
  return <Link href="/" className={`brand${glitch ? " brand-glitch" : ""}`} aria-label="Nebula Esports home"><Image src="/images/nebula-logo.png" width={64} height={64} alt="" priority /><span className="brand-wordmark"><span className="brand-line" data-text="NEBULA">NEBULA</span><span className="brand-subtitle brand-line" data-text="ESPORTS">ESPORTS</span></span></Link>;
}
