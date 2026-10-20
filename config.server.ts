import Providers, { AppProviders } from 'next-auth/providers'
import { createHash, timingSafeEqual } from 'crypto'
import { prisma, resolvedConfig } from './utils.server'

// Constant-time string comparison. Both sides are hashed first so the buffers
// have equal length (timingSafeEqual requires it) and the length of the real
// value doesn't leak either.
function safeEqual(a: unknown, b: string | undefined) {
  if (typeof a !== 'string' || !b) return false
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

/**
 * Auth: a single username/password, from the USERNAME and PASSWORD env vars.
 * (Upstream also offered GitHub, GitLab, and Google sign-in; this fork only
 * ever has one admin, so those were removed.)
 */
const providers: AppProviders = []

if (resolvedConfig.useLocalAuth) {
  providers.push(
    Providers.Credentials({
      name: 'Username',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: { username: string; password: string }) {
        // Evaluate both, so a wrong username takes as long as a wrong password.
        const userOk = safeEqual(credentials?.username, process.env.USERNAME)
        const passOk = safeEqual(credentials?.password, process.env.PASSWORD)
        if (userOk && passOk) {
          return await prisma.user.upsert({
            where: { id: credentials.username },
            create: { id: credentials.username, name: credentials.username },
            update: { name: credentials.username },
          })
        }
        return null
      },
    }),
  )
}

export const authProviders = providers
