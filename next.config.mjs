/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Heads up: `next dev` (App Router) hardcodes the webpack devtool to
// `eval-source-map`, which calls eval() to load source maps. Brave Shields
// block eval() on localhost by default, which silently breaks client
// hydration — the page renders SSR but no JS runs.
//
// Workarounds:
//   1. Click the lion icon in Brave's URL bar → Shields = Down on localhost.
//   2. Use `npm run build && npm run start` (prod build has no eval).
//   3. Use Chrome / Firefox.
//
// You cannot override the dev devtool via this file — Next 14 ignores
// `config.devtool` set in the webpack callback for App Router dev.

export default nextConfig;
