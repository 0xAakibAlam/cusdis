import { useState } from 'react'
import { GetServerSideProps } from 'next'
import NextHead from 'next/head'
import { useRouter } from 'next/router'
import { ProjectService } from '../../service/project.service'
import { CommentService, CommentItem } from '../../service/comment.service'
import { getSession, prisma } from '../../utils.server'
import { api, SiteSummary, Topbar } from '../../components/Topbar'

// One site: its app id, its comments (newest first, with replies), and the
// owner's actions on them: reply as author, approve (only shows for held
// comments, i.e. when AUTO_APPROVE is off), delete. Plus rename/delete site.

type Note = Pick<CommentItem, 'id' | 'content' | 'parsedContent' | 'approved' | 'moderatorId'> & {
  createdAt: string
  by_nickname: string
  by_email: string | null
  page: { slug: string; title: string | null; url: string | null }
  replies: { data: Note[] }
}

type Props = {
  sites: SiteSummary[]
  site: { id: string; title: string }
  comments: Note[]
  page: number
  pageCount: number
  total: number
  held: number
}

const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat
  ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null
function ago(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000
  const units: [number, number, Intl.RelativeTimeFormatUnit][] = [
    [60, 1, 'second'], [3600, 60, 'minute'], [86400, 3600, 'hour'], [604800, 86400, 'day'],
    [2629800, 604800, 'week'], [31557600, 2629800, 'month'], [Infinity, 31557600, 'year'],
  ]
  for (const [limit, div, unit] of units) {
    if (Math.abs(s) < limit) return rtf ? rtf.format(Math.round(s / div), unit) : new Date(iso).toLocaleDateString()
  }
  return new Date(iso).toLocaleDateString()
}

function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/)
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function Comment({ c, isReply, refresh }: { c: Note; isReply?: boolean; refresh: () => void }) {
  const [replying, setReplying] = useState(false)
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isAuthor = !!c.moderatorId

  async function act(fn: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className={'comment' + (c.approved ? '' : ' is-held')} style={isReply ? { padding: 0, border: 0, background: 'none' } : undefined}>
      <header className="c-head">
        <span className={'c-avatar' + (isAuthor ? ' is-author' : '')} aria-hidden="true">
          {initials(c.by_nickname)}
        </span>
        <span className="c-name">{c.by_nickname}</span>
        {isAuthor && <span className="badge">author</span>}
        {!c.approved && <span className="badge">held</span>}
        <time className="c-meta" dateTime={c.createdAt} title={new Date(c.createdAt).toLocaleString()}>
          {ago(c.createdAt)}
        </time>
        {c.by_email && <span className="c-meta">{c.by_email}</span>}
      </header>

      {!isReply && (
        <a className="c-page" href={c.page.url || '#'} target="_blank" rel="noreferrer">
          on {c.page.title || c.page.slug} ↗
        </a>
      )}

      <div className="c-body" dangerouslySetInnerHTML={{ __html: c.parsedContent }} />

      <div className="c-actions">
        {!c.approved && (
          <button className="link-btn" type="button" disabled={busy}
            onClick={() => act(() => api(`/comment/${c.id}/approve`, { method: 'POST' }))}>
            Approve
          </button>
        )}
        <button className="link-btn" type="button" onClick={() => setReplying((v) => !v)}>
          {replying ? 'Cancel reply' : 'Reply'}
        </button>
        <button className="link-btn is-danger" type="button" disabled={busy}
          onClick={() => {
            if (confirm(`Delete this comment by ${c.by_nickname}? It disappears from the blog.`)) {
              act(() => api(`/comment/${c.id}`, { method: 'DELETE' }))
            }
          }}>
          Delete
        </button>
      </div>
      {error && <p className="alert" role="alert" style={{ margin: '10px 0 0 36px' }}>{error}</p>}

      {replying && (
        <form className="c-reply-form" onSubmit={(e) => {
          e.preventDefault()
          act(async () => {
            await api(`/comment/${c.id}/replyAsModerator`, { method: 'POST', body: { content: reply } })
            setReply('')
            setReplying(false)
          })
        }}>
          <textarea className="textarea" value={reply} onChange={(e) => setReply(e.target.value)}
            placeholder={`Reply to ${c.by_nickname} as the author…`} autoFocus />
          <div className="row">
            <button className="btn" type="submit" disabled={busy || !reply.trim()}>Post reply</button>
          </div>
        </form>
      )}

      {c.replies?.data?.length > 0 && (
        <div className="c-replies">
          {c.replies.data.map((r) => <Comment key={r.id} c={r} isReply refresh={refresh} />)}
        </div>
      )}
    </article>
  )
}

export default function SitePage({ sites, site, comments, page, pageCount, total, held }: Props) {
  const router = useRouter()
  const refresh = () => router.replace(router.asPath, undefined, { scroll: false })
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(site.title)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function rename(e: React.FormEvent) {
    e.preventDefault()
    try {
      await api(`/project/${site.id}`, { method: 'PUT', body: { title } })
      setRenaming(false)
      refresh()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteSite() {
    if (!confirm(`Delete “${site.title}”? Its comments stop showing on that site.`)) return
    try {
      await api(`/project/${site.id}`, { method: 'DELETE' })
      location.href = '/dashboard'
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <NextHead>
        <title>{site.title} · Comments</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </NextHead>
      <Topbar sites={sites} currentId={site.id} />

      <main className="main">
        <section className="panel">
          <div className="site-head">
            <div>
              <p className="kicker">Site</p>
              {renaming ? (
                <form className="rename-form" onSubmit={rename}>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)}
                    maxLength={80} required autoFocus aria-label="Site name" />
                  <button className="btn" type="submit" disabled={!title.trim()}>Save</button>
                  <button className="btn btn-ghost" type="button"
                    onClick={() => { setRenaming(false); setTitle(site.title) }}>Cancel</button>
                </form>
              ) : (
                <h1 className="site-title">{site.title}</h1>
              )}
              <p className="site-stats">
                {total} {total === 1 ? 'comment' : 'comments'}
                {held > 0 && ` · ${held} held for approval`}
              </p>
            </div>
            {!renaming && (
              <button className="btn btn-ghost" type="button" onClick={() => setRenaming(true)}>
                Rename
              </button>
            )}
          </div>

          <div className="appid">
            <span className="field-label" style={{ margin: 0 }}>App id</span>
            <code>{site.id}</code>
            <button className="link-btn" type="button" onClick={() => {
              navigator.clipboard.writeText(site.id).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              })
            }}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="hint">
            A site shows these comments by calling this server’s <code className="mono">/api/open/comments</code> with
            this app id. On the blog it’s <code className="mono">cusdis.app_id</code> in <code className="mono">site/_config.yml</code>.
          </p>
          {error && <p className="alert" role="alert" style={{ marginTop: 14 }}>{error}</p>}
        </section>

        <div className="section-head">
          <p className="kicker">Comments, newest first</p>
          {pageCount > 1 && <span className="kicker">Page {page} of {pageCount}</span>}
        </div>

        {comments.length === 0 ? (
          <div className="empty">No comments yet. They’ll show up here as people post them.</div>
        ) : (
          <div className="comments">
            {comments.map((c) => <Comment key={c.id} c={c} refresh={refresh} />)}
          </div>
        )}

        {pageCount > 1 && (
          <nav className="pager" aria-label="Pages">
            {page > 1 ? <a href={`?page=${page - 1}`}>← Newer</a> : <span />}
            {page < pageCount ? <a href={`?page=${page + 1}`}>Older →</a> : <span />}
          </nav>
        )}

        <div className="danger-zone">
          <p>Deleting a site hides all its comments everywhere.</p>
          <button className="btn btn-danger" type="button" onClick={deleteSite}>Delete site</button>
        </div>
      </main>
    </>
  )
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const siteId = ctx.params.siteId as string
  const session = await getSession(ctx.req)
  if (!session) {
    return { redirect: { destination: `/login?callbackUrl=/dashboard/${siteId}`, permanent: false } }
  }

  const projectService = new ProjectService(ctx.req)
  const site = await projectService.get(siteId, { select: { id: true, title: true, ownerId: true, deletedAt: true } })
  if (!site || site.deletedAt || site.ownerId !== session.uid) {
    return { notFound: true }
  }

  const page = Math.max(1, Number(ctx.query.page) || 1)
  const result = await new CommentService(ctx.req).getComments(siteId, 0, {
    onlyOwn: true,
    parentId: null,
    page,
    pageSize: 20,
    select: {
      by_nickname: true,
      by_email: true,
      approved: true,
      moderatorId: true,
    },
  })

  const live = { deletedAt: null, page: { projectId: siteId } }
  const [total, held] = await prisma.$transaction([
    prisma.comment.count({ where: live }),
    prisma.comment.count({ where: { ...live, approved: false } }),
  ])

  return {
    props: {
      sites: await projectService.list(),
      site: { id: site.id, title: site.title },
      // Dates to strings for Next's props serialisation.
      comments: JSON.parse(JSON.stringify(result.data)),
      page,
      pageCount: result.pageCount,
      total,
      held,
    },
  }
}
