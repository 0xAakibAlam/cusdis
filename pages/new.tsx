import { useState } from 'react'
import { GetServerSideProps } from 'next'
import NextHead from 'next/head'
import { ProjectService } from '../service/project.service'
import { getSession } from '../utils.server'
import { api, SiteSummary, Topbar } from '../components/Topbar'
import { slugify } from '../lib/slug'

// Add a site. Each site gets its own app id and its own comments.
export default function NewSite({ sites }: { sites: SiteSummary[] }) {
  const [title, setTitle] = useState('')
  // Follows the name until the URL field is edited by hand.
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await api('/projects', { method: 'POST', body: { title, slug } })
      location.href = `/${res.data.slug}`
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <>
      <NextHead>
        <title>New site · Comments</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </NextHead>
      <Topbar sites={sites} currentId={null} />
      <main className="main">
        <section className="panel new-site">
          <p className="kicker">{sites.length ? 'Add a site' : 'First things first'}</p>
          <h1>New site</h1>
          <p className="hint">
            A site is one place that shows comments, like a blog. It gets an app id you put in that
            site’s config.
          </p>
          {error && <p className="alert" role="alert">{error}</p>}
          <form onSubmit={submit}>
            <div>
              <label className="field-label" htmlFor="title">Name</label>
              <input
                className="input"
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (!slugTouched) setSlug(slugify(e.target.value))
                }}
                placeholder="e.g. My blog"
                maxLength={80}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="field-label" htmlFor="slug">URL</label>
              <div className="slug-field">
                <span className="slug-prefix">/</span>
                <input
                  className="input"
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSlug(e.target.value.toLowerCase())
                  }}
                  placeholder="blogs"
                  maxLength={40}
                  pattern="[a-z0-9]([a-z0-9-]*[a-z0-9])?"
                  required
                  spellCheck={false}
                />
              </div>
            </div>
            <button className="btn" type="submit" disabled={busy || !title.trim() || !slug}>
              Create site <span className="btn-arrow" aria-hidden="true">→</span>
            </button>
          </form>
        </section>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getSession(ctx.req)
  if (!session) {
    return { redirect: { destination: '/login?callbackUrl=/new', permanent: false } }
  }
  return { props: { sites: await new ProjectService(ctx.req).list() } }
}
