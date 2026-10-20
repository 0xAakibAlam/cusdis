// A site's URL name in the dashboard: /<slug>, e.g. /blogs. Shared by the
// pages (to suggest one from a site's name) and the API (to validate it).

// Paths the app itself uses; a site can't take them.
export const RESERVED_SLUGS = new Set([
  'api', 'login', 'new', 'dashboard', '404', '500', '_next', 'favicon.svg', 'index',
])

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

// Returns an error message, or null if the slug is fine (uniqueness is
// checked separately, against the database).
export function slugProblem(slug: string): string | null {
  if (!SLUG_PATTERN.test(slug)) {
    return 'Use 1–40 lowercase letters, digits, or dashes, not starting or ending with a dash.'
  }
  if (RESERVED_SLUGS.has(slug)) return `“${slug}” is used by the app itself.`
  return null
}
