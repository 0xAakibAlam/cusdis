# Comments for 0xaakibalam.com/blogs

The comment backend behind [0xaakibalam.com/blogs](https://0xaakibalam.com/blogs/). It's a
trimmed fork of [Cusdis](https://github.com/djyde/cusdis) (MIT, now deprecated upstream): only
what the blog's comments need is left. Live at
<https://comments.0xaakibalam.com> (Netlify, with a free Neon Postgres).

## What's here

- **Public API** the blog calls (CORS open, no auth):
  - `GET /api/open/comments?appId&pageId&page`: a page's approved comments, with replies.
  - `POST /api/open/comments`: post a comment (`appId, pageId, nickname, content, parentId?`).
  - `GET /api/open/project/<appId>/comments/count?pageIds=a,b`: approved counts per page.
- **Dashboard** (one admin): each site lives at `/<slug>` (the blog is `/blogs`), `/new`
  adds one, `/` opens the first. Rename a site or change its URL, delete it, read every
  comment, reply as the author, delete, approve held comments.
- **Sign-in page** (`/login`), styled like the blog.

The blog's side is `site/_includes/comments.html` and `site/assets/js/comments.js` in
[0xAakibAlam.github.io](https://github.com/0xAakibAlam/0xAakibAlam.github.io).

## Environment

| Variable | What it is |
|---|---|
| `DB_URL` | Neon's **direct** Postgres URL (not `-pooler`; migrations break through a pooler) |
| `USERNAME`, `PASSWORD` | The one admin login |
| `JWT_SECRET` | Signs the session cookie |
| `NEXTAUTH_URL` | This site's own URL |
| `AUTO_APPROVE` | `true` publishes comments immediately; anything else holds them for approval |

## Run it

```sh
pnpm install
pnpm dev          # needs a .env with the variables above
pnpm build        # prisma generate + migrate deploy + next build
```

## Netlify-only fixes

Each is explained where it lives; keep them if this is ever rebased on upstream.

- `netlify/plugins/copy-prisma-engine`: Netlify's build machines don't generate Prisma's
  Lambda engine where the function expects it, so this copies it in.
- `netlify/edge-functions/cors-preflight.ts`: answers CORS preflights at the edge; through
  Netlify's Next.js runtime they hung until the 30s timeout.
- `apiHandler` in `utils.server.ts`: settles next-connect's promise when the response is
  sent; otherwise every open-API request held its connection for 30s.

The database schema still has upstream's unused tables (subscriptions, usage, etc.). They
cost nothing, and dropping them would need a migration.
