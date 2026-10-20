import { GetServerSideProps } from 'next'
import { ProjectService } from '../../service/project.service'
import { getSession } from '../../utils.server'

// Sends you to your first site's comments, or to "new site" if you have none.
export default function Dashboard() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (!session) {
    return { redirect: { destination: '/login?callbackUrl=/dashboard', permanent: false } }
  }

  const first = await new ProjectService(ctx.req).getFirstProject(session.uid, {
    select: { id: true },
  })

  return {
    redirect: {
      destination: first ? `/dashboard/${first.id}` : '/dashboard/new',
      permanent: false,
    },
  }
}
