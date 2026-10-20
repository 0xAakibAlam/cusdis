// The public API the blog's comment thread talks to (site/assets/js/comments.js
// in 0xAakibAlam.github.io). No auth: anyone can read approved comments and post.
import {
  CommentService,
  CommentWrapper,
} from '../../../service/comment.service'
import { apiHandler } from '../../../utils.server'
import Cors from 'cors'
import { ProjectService } from '../../../service/project.service'
import { prisma } from '../../../utils.server'

const MAX_NICKNAME = 60
const MAX_CONTENT = 5000

// pageUrl and pageTitle come from whoever posts, and the dashboard shows them
// (pageUrl as a link). Keep only http(s) URLs, so a "javascript:" URL can't
// run in the signed-in dashboard, and cap both lengths.
function cleanUrl(raw: unknown) {
  if (typeof raw !== 'string' || raw.length > 500) return undefined
  try {
    const u = new URL(raw)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined
  } catch {
    return undefined
  }
}
function cleanTitle(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().slice(0, 300) || undefined : undefined
}

export default apiHandler()
  .use(
    Cors({
      methods: ['GET', 'POST', 'OPTIONS'],
    }),
  )
  .get(async (req, res) => {
    const commentService = new CommentService(req)
    const projectService = new ProjectService(req)

    const query = req.query as {
      page?: string
      appId: string
      pageId: string
    }

    if (await projectService.isDeleted(query.appId)) {
      res.status(404)
      res.json({
        data: {
          commentCount: 0,
          data: [],
          pageCount: 0,
          pageSize: 10,
        } as CommentWrapper,
      })
      return
    }

    const comments = await commentService.getComments(
      query.appId,
      Number(req.headers['x-timezone-offset']) || 0,
      {
        approved: true,
        parentId: null,
        pageSlug: query.pageId,
        page: Number(query.page) || 1,
        select: {
          by_nickname: true,
          moderator: {
            select: {
              displayName: true,
            },
          },
        },
      },
    )

    res.json({
      data: comments,
    })
  })
  .post(async (req, res) => {
    const commentService = new CommentService(req)
    const projectService = new ProjectService(req)
    const body = req.body as {
      parentId?: string
      appId: string
      pageId: string
      content: string
      email?: string
      nickname: string
      pageUrl?: string
      pageTitle?: string
    }

    // Comments publish straight away (AUTO_APPROVE), so reject the obviously
    // malformed ones here rather than in the dashboard.
    const content = typeof body.content === 'string' ? body.content.trim() : ''
    const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
    if (!content || !nickname || content.length > MAX_CONTENT || nickname.length > MAX_NICKNAME) {
      res.status(400)
      res.json({
        message: `A name (up to ${MAX_NICKNAME} characters) and a comment (up to ${MAX_CONTENT}) are required.`,
      })
      return
    }

    if (await projectService.isDeleted(body.appId)) {
      res.status(404)
      res.json({
        message: 'Project not found',
      })
      return
    }

    // A reply has to answer a live comment on the same page of the same site;
    // otherwise any comment could be hung under any other thread.
    if (body.parentId) {
      const parent = await prisma.comment.findFirst({
        where: {
          id: String(body.parentId),
          deletedAt: null,
          page: { slug: body.pageId, projectId: body.appId },
        },
        select: { id: true },
      })
      if (!parent) {
        res.status(400)
        res.json({ message: 'That comment can’t be replied to.' })
        return
      }
    }

    const comment = await commentService.addComment(
      body.appId,
      body.pageId,
      {
        content,
        email: typeof body.email === 'string' ? body.email.trim() : '',
        nickname,
        pageTitle: cleanTitle(body.pageTitle),
        pageUrl: cleanUrl(body.pageUrl),
      },
      body.parentId ? String(body.parentId) : undefined,
    )

    res.json({
      data: comment,
    })
  })
