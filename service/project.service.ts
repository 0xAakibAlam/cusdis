import { Prisma, Project } from '@prisma/client'
import { RequestScopeService } from '.'
import { prisma } from '../utils.server'

// A "project" is a site: one blog (or any other site) whose comments this
// instance stores. Its id is the app id the site embeds.
export class ProjectService extends RequestScopeService {
  async create(title: string) {
    const session = await this.getSession()
    return await prisma.project.create({
      data: {
        title,
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
      },
    })
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

  async rename(projectId: string, title: string) {
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        title,
      },
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
