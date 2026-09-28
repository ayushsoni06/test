import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proposals are private links: never index anything on this host.
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];
  },
  async redirects() {
    return [{ source: "/", destination: "https://www.hex.inc", permanent: false }];
  },
};

export default nextConfig;
