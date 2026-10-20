import { PrismaClient } from '@prisma/client'
import { UserSession } from './service'
import { getSession as nextAuthGetSession } from 'next-auth/client'
import { NextApiRequest, NextApiResponse } from 'next'
import nc from 'next-connect'
import Boom from '@hapi/boom'

export const resolvedConfig = {
  useLocalAuth: process.env.USERNAME && process.env.PASSWORD,
  jwtSecret: process.env.JWT_SECRET,
}

export const singletonSync = <T>(id: string, fn: () => T) => {
  if (process.env.NODE_ENV === 'production') {
    return fn()
  } else {
    if (!global[id]) {
      global[id] = fn()
    }
    return global[id] as T
  }
}

export const prisma = singletonSync('prisma', () => {
  return new PrismaClient()
})

export const HTTPException = Boom
export const apiHandler = () => {
  const router = nc<NextApiRequest, NextApiResponse>({
    onError(e, req, res, next) {
      if (Boom.isBoom(e)) {
        res.status(e.output.payload.statusCode)
        res.json({
          error: e.output.payload.error,
          message: e.output.payload.message,
        })
      } else {
        res.status(500)
        res.json({
          message: 'Unexpected error',
        })
        console.error(e)
      }
    },
  })

  // next-connect 0.10 settles the handler's promise only when the last handler
  // calls next(), which route handlers never do, so it stays pending forever.
  // `next start` ends the response anyway, but Netlify's Next.js runtime waits
  // for that promise, so every request held its connection open until the 30s
  // function timeout. Settle it once the response has actually gone out.
  router.run = (req, res) =>
    new Promise<void>((resolve, reject) => {
      res.once('finish', () => resolve())
      res.once('close', () => resolve())
      router.handle(req, res, (err) => (err ? reject(err) : resolve()))
    })

  return router
}

export const getSession = async (req) => {
  return (await nextAuthGetSession({ req })) as UserSession
}
