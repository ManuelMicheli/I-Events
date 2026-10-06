import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@i-events/core", "@i-events/db"],
};

export default config;
