import type { NextConfig } from "next";

const isElectronExport = process.env.ELECTRON_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isElectronExport
    ? {
        output: "export",
        images: {
          unoptimized: true,
        },
      }
    : {}),
};

export default nextConfig;
