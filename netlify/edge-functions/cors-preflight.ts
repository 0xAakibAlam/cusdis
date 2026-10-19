// Answers CORS preflight (OPTIONS) requests for the widget's public API at the
// edge. The widget sends an x-timezone-offset header, so every comment load and
// post is preceded by a preflight. Through Netlify's Next.js runtime that empty
// 204 response hangs until the 30s function timeout (it returns at once under
// `next start`), which leaves the comment box stuck on "Loading...". Everything
// that isn't OPTIONS passes straight through to the app.
export default async (request: Request) => {
  if (request.method !== 'OPTIONS') return

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers':
        request.headers.get('Access-Control-Request-Headers') ?? 'content-type,x-timezone-offset',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export const config = { path: '/api/open/*' }
