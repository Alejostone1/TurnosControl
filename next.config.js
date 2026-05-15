const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    domains: ["localhost"],
  },
  webpack(config, { nextRuntime, webpack }) {
    if (nextRuntime === 'edge') {
      // jose's JWE "zip" compression references CompressionStream / DecompressionStream
      // which are not in Next.js Edge Runtime. next-auth uses signed JWTs (JWS) only,
      // so these code paths are never executed – replace with a safe stub.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /jose[\\/]dist[\\/]webapi[\\/]lib[\\/]deflate\.js$/,
          path.resolve(__dirname, 'src/lib/jose-deflate-stub.mjs')
        )
      )
    }
    return config
  },
}

module.exports = nextConfig
