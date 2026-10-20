// Custom sign-in page. next-auth's built-in page can't be restyled, so
// `pages.signIn` in pages/api/auth/[...nextauth].ts points here and
// /api/auth/signin redirects to it. Styles: styles/admin.css (.auth-*). Only the
// username/password provider is configured, so it posts straight to
// next-auth's credentials callback.
import { useEffect, useState } from 'react'
import { GetServerSideProps } from 'next'
import NextHead from 'next/head'
import { getCsrfToken } from 'next-auth/client'
import { getSession } from '../utils.server'

type Props = {
  callbackUrl: string
  error: string | null
}

const ERRORS: Record<string, string> = {
  CredentialsSignin: 'That username and password don’t match.',
  SessionRequired: 'Sign in to see that page.',
}

export default function Login({ callbackUrl, error }: Props) {
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

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const q = ctx.query
  const callbackUrl = typeof q.callbackUrl === 'string' ? q.callbackUrl : '/dashboard'

  if (await getSession(ctx.req)) {
    return { redirect: { destination: callbackUrl, permanent: false } }
  }

  return {
    props: {
      callbackUrl,
      error: typeof q.error === 'string' ? q.error : null,
    },
  }
}
