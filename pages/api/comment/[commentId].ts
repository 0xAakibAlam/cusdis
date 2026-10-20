import { NextApiRequest, NextApiResponse } from 'next'
import { AuthService } from '../../../service/auth.service'
import { CommentService } from '../../../service/comment.service'

// DELETE: remove a comment (soft delete). Owner only. Upstream Cusdis had no
// auth check here at all, so anyone could delete any comment.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const commentService = new CommentService(req)
  const authService = new AuthService(req, res)

  if (req.method !== 'DELETE') {
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

  await commentService.delete(commentId)
  res.json({ message: 'Success' })
}
