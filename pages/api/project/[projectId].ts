import { Project } from '@prisma/client'
import { NextApiRequest, NextApiResponse } from 'next'
import { AuthService } from '../../../service/auth.service'
import { ProjectService } from '../../../service/project.service'

// PUT { title }: rename a site. DELETE: delete it (soft delete; its comments
// stop being served). Owner only.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authService = new AuthService(req, res)
  const projectService = new ProjectService(req)
  const { projectId } = req.query as { projectId: string }

  const project = (await projectService.get(projectId, {
    select: { ownerId: true },
  })) as Pick<Project, 'ownerId'> | null

  if (!project) {
    res.status(404).json({ message: 'Site not found' })
    return
  }
  if (!(await authService.projectOwnerGuard(project))) {
    return
  }

  if (req.method === 'PUT') {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    if (!title) {
      res.status(400).json({ message: 'A site name is required.' })
      return
    }
    await projectService.rename(projectId, title)
    res.json({ message: 'success' })
  } else if (req.method === 'DELETE') {
    await projectService.delete(projectId)
    res.json({ message: 'success' })
  } else {
    res.status(405).end()
  }
}
