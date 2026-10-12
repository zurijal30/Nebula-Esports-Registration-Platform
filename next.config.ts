import type { NextConfig } from "next";

// 4 MiB files plus multipart metadata, below Vercel's 4.5 MB ceiling.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Dev-only: exact trusted laptop LAN host; update if DHCP changes its address.
  allowedDevOrigins: ["192.168.1.9"],
  experimental: { serverActions: { bodySizeLimit: 4_450_000 } },
};
export default nextConfig;
