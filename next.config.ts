import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client ships optional native bindings for file: URLs; keep the
  // whole libsql family external so serverless bundlers don't try to inline
  // the package (Turbopack chokes on its LICENSE file) or .node binaries.
  serverExternalPackages: ["@libsql/client", "@libsql/hrana-client", "libsql"],
};

export default nextConfig;
