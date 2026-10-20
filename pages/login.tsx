// Custom sign-in page. next-auth's built-in page can't be restyled, so
// `pages.signIn` in pages/api/auth/[...nextauth].ts points here and
// /api/auth/signin redirects to it. Styles: styles/admin.css (.auth-*). Only the
// username/password provider is configured, so it posts straight to
// next-auth's credentials callback.
import { useEffect, useState } from 'react'
import { GetServerSideProps } from 'next'
import NextHead from 'next/head'
import { getCsrfToken, signOut } from 'next-auth/client'
import { getSession } from '../utils.server'

type Props = {
  callbackUrl: string
  error: string | null
  signedIn: boolean
}

const ERRORS: Record<string, string> = {
  CredentialsSignin: 'That username and password don’t match.',
  SessionRequired: 'Sign in to see that page.',
}

export default function Login({ callbackUrl, error, signedIn }: Props) {
  // Fetched in the browser, not in getServerSideProps: the token has to match
  // the csrf cookie, and only a browser request to /api/auth/csrf sets that
  // cookie on the reader's side. Fetching it server-side left the cookie on
  // the server, so every sign-in failed the csrf check.
  const [csrfToken, setCsrfToken] = useState('')
  useEffect(() => {
    getCsrfToken().then((t) => setCsrfToken(t || ''))
  }, [])

  const message = error ? ERRORS[error] || 'Couldn’t sign you in. Try again.' : null

  return (
    <main className="auth-page">
      <NextHead>
        <title>Sign in · Comments · 0xAakibAlam</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </NextHead>

      <section className="auth-card" aria-labelledby="title">
        <p className="kicker">0xAakibAlam · comments</p>
        <h1 id="title">Sign in to moderate</h1>
        <p className="auth-lede">
          The back room of the comments on{' '}
          <a href="https://0xaakibalam.com/blogs/">0xaakibalam.com/blogs</a>.
        </p>

        {message && (
          <p className="alert" role="alert">
            {message}
          </p>
        )}
        {signedIn && (
          <p className="hint" style={{ margin: '0 0 18px' }}>
            You’re still signed in from before.{' '}
            <a href={callbackUrl}>Go to your sites</a> or{' '}
            <button className="link-btn" type="button" style={{ fontSize: 'inherit' }}
              onClick={() => signOut({ callbackUrl: '/login' })}>
              sign out
            </button>
            .
          </p>
        )}

        <form className="auth-form" method="post" action="/api/auth/callback/credentials">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <label className="field-label" htmlFor="username">Username</label>
          <input
            className="input"
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            autoFocus
          />

          <label className="field-label" htmlFor="password">Password</label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          <button className="btn" type="submit" disabled={!csrfToken}>
            Sign in <span className="btn-arrow" aria-hidden="true">→</span>
          </button>
        </form>
      </section>

      <a className="auth-back" href="https://0xaakibalam.com/blogs/">
        ← Back to the blog
      </a>
    </main>
  )
}

// Only ever send people back to a page on this site. next-auth validates its
// own callbackUrl, but this page's redirect below didn't, so
// /login?callbackUrl=https://evil.example was an open redirect.
function safeCallback(raw: unknown): string {
  if (typeof raw !== 'string') return '/'
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  try {
    const url = new URL(raw, base)
    if (url.origin !== new URL(base).origin) return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const q = ctx.query
  const callbackUrl = safeCallback(q.callbackUrl)
  const error = typeof q.error === 'string' ? q.error : null
  const signedIn = !!(await getSession(ctx.req))

  // Already signed in and not coming back from a failed attempt: straight on.
  // After a failed attempt, stay here and show the error. Forwarding to the
  // dashboard on an old, still-valid session made a wrong password look like
  // it had worked.
  if (signedIn && !error) {
    return { redirect: { destination: callbackUrl, permanent: false } }
  }

  return { props: { callbackUrl, error, signedIn } }
}
