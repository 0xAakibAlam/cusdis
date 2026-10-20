import { NextApiRequest, NextApiResponse } from 'next'
import { ProjectService } from '../../service/project.service'
import { getSession } from '../../utils.server'

// GET: the signed-in owner's sites. POST { title }: add a site.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const projectService = new ProjectService(req)
  const session = await getSession(req)

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (req.method === 'POST') {
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
    if (!title) {
      res.status(400).json({ error: 'A site name is required.' })
      return
    }

    const created = await projectService.create(title)
    res.json({ data: { id: created.id } })
  } else if (req.method === 'GET') {
    res.json({ data: await projectService.list() })
  } else {
    res.status(405).end()
  }
}
