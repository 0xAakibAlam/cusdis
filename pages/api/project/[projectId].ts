import { Project } from '@prisma/client'
import { NextApiRequest, NextApiResponse } from 'next'
import { AuthService } from '../../../service/auth.service'
import { ProjectService } from '../../../service/project.service'
import { slugProblem } from '../../../lib/slug'

// PUT { title, slug }: rename a site and/or change its URL name. DELETE: delete
// it (soft delete; its comments stop being served). Owner only.
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
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : ''
    if (!title) {
      res.status(400).json({ message: 'A site name is required.' })
      return
    }
    const problem = slugProblem(slug)
    if (problem) {
      res.status(400).json({ message: problem })
      return
    }
    if (await projectService.slugTaken(project.ownerId, slug, projectId)) {
      res.status(409).json({ message: `Another site already uses /${slug}.` })
      return
    }
    await projectService.update(projectId, { title, slug })
    res.json({ message: 'success', slug })
  } else if (req.method === 'DELETE') {
    await projectService.delete(projectId)
    res.json({ message: 'success' })
  } else {
    res.status(405).end()
  }
}
