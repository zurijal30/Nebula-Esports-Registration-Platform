import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return <Link href="/" className="brand" aria-label="Nebula Esports home"><Image src="/images/nebula-logo.png" width={64} height={64} alt="" priority /><span>NEBULA<span className="brand-subtitle">ESPORTS</span></span></Link>;
}
