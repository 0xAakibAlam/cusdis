import { NextApiRequest, NextApiResponse } from 'next'
import { AuthService } from '../../../../service/auth.service'
import { CommentService } from '../../../../service/comment.service'

// POST { content }: reply to a comment as the site's author (shown with an
// "author" badge on the blog). Owner only.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const commentService = new CommentService(req)
  const authService = new AuthService(req, res)

  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : ''
  if (!content) {
    res.status(400).json({ message: 'A reply is required.' })
    return
  }

  const commentId = req.query.commentId as string
  const project = await commentService.getProject(commentId)
  if (!project) {
    res.status(404).json({ message: 'Comment not found' })
    return
  }
  if (!(await authService.projectOwnerGuard(project))) {
    return
  }

  const created = await commentService.addCommentAsModerator(commentId, content)
  res.json({ data: created })
}
