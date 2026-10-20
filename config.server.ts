import Providers, { AppProviders } from 'next-auth/providers'
import { prisma, resolvedConfig } from './utils.server'

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
        if (
          credentials.username === process.env.USERNAME &&
          credentials.password === process.env.PASSWORD
        ) {
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
