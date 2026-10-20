module.exports = {
  // The dashboard used to live under /dashboard; sites are now at /<slug>.
  // /<app id> still resolves (pages/[site].tsx moves it on to /<slug>).
  async redirects() {
    return [
      { source: '/dashboard', destination: '/', permanent: true },
      { source: '/dashboard/new', destination: '/new', permanent: true },
      { source: '/dashboard/:id', destination: '/:id', permanent: true },
    ]
  },
}
