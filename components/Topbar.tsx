import { signOut } from 'next-auth/client'

export type SiteSummary = { id: string; title: string }

// The dashboard's top bar: brand, a switcher between sites, "New site", and
// sign out. `currentId` is null on the new-site page.
export function Topbar({ sites, currentId }: { sites: SiteSummary[]; currentId: string | null }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="/dashboard">
          <span className="brand-mark" aria-hidden="true" />
          Comments
        </a>

        {sites.length > 0 && (
          <select
            className="site-switch"
            aria-label="Site"
            value={currentId ?? ''}
            onChange={(e) => {
              if (e.target.value) location.href = `/dashboard/${e.target.value}`
            }}
          >
            {currentId === null && <option value="">Choose a site</option>}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        )}

        <span className="topbar-spacer" />

        <a className="btn btn-ghost" href="/dashboard/new">
          + New site
        </a>
        <button
          className="link-btn"
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

// Small fetch wrapper for the dashboard's own API calls.
export async function api(path: string, init?: { method?: string; body?: unknown }) {
  const res = await fetch(`/api${path}`, {
    method: init?.method || 'GET',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`)
  return json
}
