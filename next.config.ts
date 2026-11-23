import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // PGlite ships a WASM Postgres that must load from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  partialPrefetching: true,
  // The skill's download name before the rename to ag-hub; links to it are out there.
  redirects() {
    return [{ source: "/agreement-hub-scope.zip", destination: "/ag-hub-scope.zip", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
