/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Some wagmi/viem deps ship ESM that next can't auto-tree-shake yet.
  transpilePackages: ["wagmi", "viem", "@tanstack/react-query"],
};

export default nextConfig;
