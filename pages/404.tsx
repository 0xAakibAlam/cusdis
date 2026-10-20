import NextHead from 'next/head'

export default function NotFoundPage() {
  return (
    <main className="auth-page">
      <NextHead>
        <title>Not found · Comments</title>
      </NextHead>
      <section className="auth-card">
        <p className="kicker">404</p>
        <h1>Nothing here</h1>
        <p className="auth-lede">That page doesn’t exist.</p>
        <a className="btn" href="/">
          Go to your sites <span className="btn-arrow" aria-hidden="true">→</span>
        </a>
      </section>
    </main>
  )
}
