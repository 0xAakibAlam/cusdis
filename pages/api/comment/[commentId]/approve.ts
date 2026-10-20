import { NextApiRequest, NextApiResponse } from 'next'
import { AuthService } from '../../../../service/auth.service'
import { CommentService } from '../../../../service/comment.service'

// POST: approve a held comment. Owner only. Only matters if AUTO_APPROVE is off.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const commentService = new CommentService(req)
  const authService = new AuthService(req, res)

  if (req.method !== 'POST') {
    res.status(405).end()
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

  await commentService.approve(commentId)
  res.json({ message: 'success' })
}
