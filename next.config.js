module.exports = {
  experimental: {
    // Netlify bundles each server function from Next's file trace, which misses
    // Prisma's native query engine under pnpm's node_modules/.pnpm layout. Without
    // this, every API route crashes on Netlify with "could not locate the Query
    // Engine for runtime rhel-openssl-3.0.x".
    outputFileTracingIncludes: {
      '/**': [
        './node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node',
        './node_modules/.pnpm/@prisma+client*/node_modules/.prisma/client/schema.prisma',
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
