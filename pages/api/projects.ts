import { NextApiRequest, NextApiResponse } from 'next'
import { ProjectService } from '../../service/project.service'
import { getSession } from '../../utils.server'
import { slugProblem } from '../../lib/slug'

// GET: the signed-in owner's sites. POST { title, slug }: add a site.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectService = new ProjectService(req)
  const session = await getSession(req)

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (req.method === 'POST') {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    const slug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : ''
    if (!title) {
      res.status(400).json({ error: 'A site name is required.' })
      return
    }
    const problem = slugProblem(slug)
    if (problem) {
      res.status(400).json({ error: problem })
      return
    }
    if (await projectService.slugTaken(session.uid, slug)) {
      res.status(409).json({ error: `Another site already uses /${slug}.` })
      return
    }

    const created = await projectService.create(title, slug)
    res.json({ data: { id: created.id, slug } })
  } else if (req.method === 'GET') {
    res.json({ data: await projectService.list() })
  } else {
    res.status(405).end()
  }
}
