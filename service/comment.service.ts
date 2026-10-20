import { Comment, Page, Prisma } from '@prisma/client'
import { RequestScopeService } from '.'
import { prisma } from '../utils.server'
import { PageService } from './page.service'
import dayjs from 'dayjs'
import MarkdownIt from 'markdown-it'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

// Raw HTML is off by default in markdown-it, and links and images are disabled,
// so parsedContent is safe for the blog to insert as HTML.
export const markdown = MarkdownIt({
  linkify: true,
})

markdown.disable(['image', 'link'])

export type CommentWrapper = {
  commentCount: number
  pageSize: number
  pageCount: number
  data: CommentItem[]
}

export type CommentItem = Comment & {
  page: Page
} & {
  replies: CommentWrapper
  parsedContent: string
  parsedCreatedAt: string
}

export class CommentService extends RequestScopeService {
  pageService = new PageService(this.req)

  async getComments(
    projectId: string,
    timezoneOffset: number,
    options?: {
      parentId?: string
      page?: number
      select?: Prisma.CommentSelect
      pageSlug?: string | Prisma.StringFilter
      onlyOwn?: boolean
      approved?: boolean
      pageSize?: number
    },
  ): Promise<CommentWrapper> {
    const pageSize = options?.pageSize || 10

    const select = {
      id: true,
      createdAt: true,
      content: true,
      ...options?.select,
      page: true,
      moderatorId: true,
    } as Prisma.CommentSelect

    const where = {
      approved: options?.approved === true ? true : options?.approved,
      parentId: options?.parentId,
      deletedAt: {
        equals: null,
      },
      page: {
        slug: options?.pageSlug,
        projectId,
        project: {
          deletedAt: {
            equals: null,
          },
          ownerId: options?.onlyOwn
            ? (await this.getSession()).uid
            : undefined,
        },
      },
    } as Prisma.CommentWhereInput

    const page = options?.page || 1

    const [commentCount, comments] = await prisma.$transaction([
      prisma.comment.count({ where }),
      prisma.comment.findMany({
        select,
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ])

    // If there are 0 comments, there is still 1 page
    const pageCount = Math.ceil(commentCount / pageSize) || 1

    const allComments = await Promise.all(
      comments.map(async (comment: Comment) => {
        const replies = await this.getComments(projectId, timezoneOffset, {
          ...options,
          page: 1,
          // Nested replies aren't paginated; 100 is plenty for one thread.
          pageSize: 100,
          parentId: comment.id,
          pageSlug: options?.pageSlug,
          select,
        })

        const parsedCreatedAt = dayjs
          .utc(comment.createdAt)
          .utcOffset(timezoneOffset)
          .format('YYYY-MM-DD HH:mm')
        const parsedContent = markdown.render(comment.content) as string
        return {
          ...comment,
          replies,
          parsedContent,
          parsedCreatedAt,
        } as CommentItem
      }),
    )

    return {
      data: allComments,
      commentCount,
      pageSize,
      pageCount,
    }
  }

  async getProject(commentId: string) {
    const res = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
      select: {
        page: {
          select: {
            project: {
              select: {
                id: true,
                ownerId: true,
              },
            },
          },
        },
      },
    })

    return res?.page.project
  }

  async addComment(
    projectId: string,
    pageSlug: string,
    body: {
      content: string
      email: string
      nickname: string
      pageUrl?: string
      pageTitle?: string
    },
    parentId?: string,
  ) {
    const page = await this.pageService.upsertPage(pageSlug, projectId, {
      pageTitle: body.pageTitle,
      pageUrl: body.pageUrl,
    })

    return await prisma.comment.create({
      data: {
        content: body.content,
        by_email: body.email,
        by_nickname: body.nickname,
        pageId: page.id,
        parentId,
        // AUTO_APPROVE=true publishes comments immediately instead of holding
        // them for approval in the dashboard.
        approved: process.env.AUTO_APPROVE === 'true',
      },
    })
  }

  async addCommentAsModerator(parentId: string, content: string) {
    const session = await this.getSession()
    const parent = await prisma.comment.findUnique({
      where: {
        id: parentId,
      },
    })

    return await prisma.comment.create({
      data: {
        content: content,
        by_email: session.user.email,
        by_nickname: session.user.name,
        moderatorId: session.uid,
        pageId: parent.pageId,
        approved: true,
        parentId,
      },
    })
  }

  async approve(commentId: string) {
    await prisma.comment.update({
      where: {
        id: commentId,
      },
      data: {
        approved: true,
      },
    })
  }

  // Soft-deletes the comment and every reply under it, level by level (a BFS
  // over the reply tree). Without the cascade, orphaned replies stayed in the
  // counts while never being shown.
  async delete(commentId: string) {
    const now = new Date()
    let frontier = [commentId]
    while (frontier.length) {
      await prisma.comment.updateMany({
        where: { id: { in: frontier } },
        data: { deletedAt: now },
      })
      const children = await prisma.comment.findMany({
        where: { parentId: { in: frontier }, deletedAt: null },
        select: { id: true },
      })
      frontier = children.map((c) => c.id)
    }
  }
}
