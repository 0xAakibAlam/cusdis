module.exports = {
  experimental: {
    // Netlify bundles each server function from Next's file trace, which can miss
    // Prisma's native query engine. Without it, every route crashes on Netlify with
    // "could not locate the Query Engine for runtime rhel-openssl-3.0.x". The path
    // assumes .npmrc's node-linker=hoisted (a flat node_modules).
    outputFileTracingIncludes: {
      '/**': [
        './node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
        './node_modules/.prisma/client/schema.prisma',
      ],
    },
  },
  rewrites() {
    return [
      {
        source: '/doc',
        destination: '/doc/index.html'
      }
    ]
  }
}
