const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@coordi/shared"],
  webpack: (config, { isServer }) => {
    // Configure path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname),
    };

    // Help resolve modules in workspace (hoisted dependencies)
    config.resolve.modules = [
      path.resolve(__dirname, "node_modules"),
      path.resolve(__dirname, "../../node_modules"),
      "node_modules",
    ];

    return config;
  },
};

module.exports = nextConfig;


