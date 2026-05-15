const path = require('path')

// Orígenes permitidos para Server Actions (localhost + dominio de Vercel)
const vercelOrigins = [
  process.env.VERCEL_URL,                 // ej: tu-app-xxxx.vercel.app
  process.env.VERCEL_PROJECT_PRODUCTION_URL, // ej: tu-app.vercel.app
  process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, ''),
].filter(Boolean)

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", ...vercelOrigins],
    },
  },
  images: {
    domains: ["localhost", "vercel.app"],
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
