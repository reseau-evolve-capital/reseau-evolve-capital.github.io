import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  //basePath: '/omniventus-gh-pages',
  //assetPrefix: '/omniventus-gh-pages/',
  // Enable static generation of locale paths
  trailingSlash: true,
};

export default nextConfig;
