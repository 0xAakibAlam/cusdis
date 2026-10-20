// The public API the blog's comment thread talks to (site/assets/js/comments.js
// in 0xAakibAlam.github.io). No auth: anyone can read approved comments and post.
import {
  CommentService,
  CommentWrapper,
} from '../../../service/comment.service'
import { apiHandler } from '../../../utils.server'
import Cors from 'cors'
import { ProjectService } from '../../../service/project.service'

const MAX_NICKNAME = 60
const MAX_CONTENT = 5000

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

    const comment = await commentService.addComment(
      body.appId,
      body.pageId,
      {
        content,
        email: typeof body.email === 'string' ? body.email.trim() : '',
        nickname,
        pageTitle: body.pageTitle,
        pageUrl: body.pageUrl,
      },
      body.parentId,
    )

    res.json({
      data: comment,
    })
  })
