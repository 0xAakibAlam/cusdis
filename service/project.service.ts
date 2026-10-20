import { Prisma, Project } from '@prisma/client'
import { RequestScopeService } from '.'
import { prisma } from '../utils.server'

// A "project" is a site: one blog (or any other site) whose comments this
// instance stores. Its id is the app id the site embeds.
export class ProjectService extends RequestScopeService {
  async create(title: string, slug: string) {
    const session = await this.getSession()
    return await prisma.project.create({
      data: {
        title,
        slug,
        owner: {
          connect: {
            id: session.uid,
          },
        },
      },
    })
  }

  async get(
    projectId: string,
    options?: {
      select?: Prisma.ProjectSelect
    },
  ) {
    return await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: options?.select,
    })
  }

  // The signed-in owner's sites, oldest first.
  async list() {
    const session = await this.getSession()
    return await prisma.project.findMany({
      where: {
        deletedAt: null,
        ownerId: session.uid,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        title: true,
        slug: true,
      },
    })
  }

  // A live site of this owner by its URL name, or by its id (for sites made
  // before URL names existed, and old /dashboard/<id> links).
  async findByKey(ownerId: string, key: string) {
    return await prisma.project.findFirst({
      where: {
        ownerId,
        deletedAt: null,
        OR: [{ slug: key }, { id: key }],
      },
      select: { id: true, title: true, slug: true },
    })
  }

  // Is this URL name already used by another live site of the same owner?
  async slugTaken(ownerId: string, slug: string, exceptId?: string) {
    const hit = await prisma.project.findFirst({
      where: {
        ownerId,
        slug,
        deletedAt: null,
        id: exceptId ? { not: exceptId } : undefined,
      },
      select: { id: true },
    })
    return !!hit
  }

  async getFirstProject(ownerId: string, options?: {
    select?: Prisma.ProjectSelect
  }) {
    const project = await prisma.project.findFirst({
      where: {
        ownerId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: options?.select,
    })

    return project as Project
  }

  async update(projectId: string, data: { title: string; slug: string }) {
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data,
    })
  }

  async delete(projectId: string) {
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        deletedAt: new Date(),
      },
    })
  }

  async isDeleted(projectId: string) {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        deletedAt: true,
      },
    })

    return !(project && !project.deletedAt)
  }
}
