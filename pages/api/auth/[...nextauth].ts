import NextAuth from "next-auth";
import Adapters from "next-auth/adapters";
import { prisma, resolvedConfig } from "../../../utils.server";
import { authProviders } from "../../../config.server";

// Using Module Augmentation
// https://next-auth.js.org/getting-started/typescript

declare module "next-auth" {
  interface Session {
    uid: string
  }
  interface User {
    id: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}

// Without a secret, next-auth v3 quietly derives one from its own options,
// which anyone with this source can reproduce, and could then forge sessions.
// Refuse to run instead.
if (!resolvedConfig.jwtSecret || resolvedConfig.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters')
}

export default NextAuth({
  providers: authProviders,

  adapter: Adapters.Prisma.Adapter({ prisma: prisma }),

  // Signs the csrf token and cookies.
  secret: resolvedConfig.jwtSecret,

  session: {
    jwt: !!resolvedConfig.useLocalAuth,
    // One admin, a few logins a month: a week is plenty (next-auth's default
    // is 30 days).
    maxAge: 7 * 24 * 60 * 60,
  },

  jwt: {
    secret: resolvedConfig.jwtSecret,
  },

  // Custom sign-in page styled like the blog (pages/login.tsx). Errors such as
  // a wrong password come back to it as ?error=CredentialsSignin.
  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    session(session, user) {
      session.uid = user.id
      return session
    },
    jwt(token, user) {
      if (user) {
        token.id = user.id
      }
      return token
    },
  },

  events: {
    async error(message) {
      console.log(message)
    },
  },
})
