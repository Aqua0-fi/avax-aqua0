/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // We used to ship transpilePackages: ["wagmi", "viem", "@tanstack/react-query"]
  // because older versions weren't fully ESM. The current versions (wagmi 2.x +
  // viem 2.x + react-query 5.x) ship native ESM, so re-transpiling them through
  // SWC on every HMR cycle just burns CPU + wedges the dev server. Dropping
  // the field made dev compile times 4-5× faster and stopped the random
  // 'localhost se cae cada dos por tres' crashes.
};

export default nextConfig;
