import { GetServerSideProps } from 'next'
import { ProjectService } from '../service/project.service'
import { getSession } from '../utils.server'

// No landing page: "/" opens your first site (/<slug>), "new site" if you have
// none, or the sign-in page if you're signed out.
export default function Index() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }

  const first = await new ProjectService(ctx.req).getFirstProject(session.uid, {
    select: { id: true, slug: true },
  })

  return {
    redirect: {
      destination: first ? `/${first.slug || first.id}` : '/new',
      permanent: false,
    },
  }
}
