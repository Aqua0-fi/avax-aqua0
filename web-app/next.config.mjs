/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // We used to ship transpilePackages: ["wagmi", "viem", "@tanstack/react-query"]
  // because older versions weren't fully ESM. The current versions (wagmi 2.x +
  // viem 2.x + react-query 5.x) ship native ESM, so re-transpiling them through
  // SWC on every HMR cycle just burns CPU + wedges the dev server. Dropping
  // the field made dev compile times 4-5× faster and stopped the random
  // 'localhost se cae cada dos por tres' crashes.

  webpack(config, { webpack }) {
    // WalletConnect (via pino) + the MetaMask SDK declare optional peer
    // dependencies on `pino-pretty` (pretty-print logs in node) and
    // `@react-native-async-storage/async-storage` (RN storage shim). We
    // don't use either — we're in the browser and we don't pretty-print
    // pino. But webpack walks the require() and emits a "Module not found"
    // warning on every HMR rebuild, ~50 lines per recompile, drowning the
    // actual errors we care about. IgnorePlugin silences them without
    // affecting bundle output.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp:
          /^(pino-pretty|@react-native-async-storage\/async-storage)$/,
      }),
    );
    return config;
  },
};

export default nextConfig;
