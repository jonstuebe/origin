import { type StoredFact, archiveBefore, publishedFact } from './facts'
import factsData from './facts.json'

const FACTS: ReadonlyArray<StoredFact> = factsData
const FACT_ROUTE = /^\/api\/fact\/(\d{1,6})$/
const ARCHIVE_ROUTE = /^\/api\/archive\/(\d{1,6})$/

/**
 * Serves `GET /api/fact/:number` and `GET /api/archive/:number`. Both refuse an
 * edition whose date hasn't started anywhere yet, so future facts stay private.
 */
export const handle = (
  request: Request,
  now: number,
  facts: ReadonlyArray<StoredFact> = FACTS,
): Response => {
  const { pathname } = new URL(request.url)
  const factMatch = FACT_ROUTE.exec(pathname)
  const archiveMatch = ARCHIVE_ROUTE.exec(pathname)
  if (!factMatch && !archiveMatch) {
    return json({ error: 'Not found' }, 404)
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, HEAD' })
  }

  if (factMatch) {
    const fact = publishedFact(facts, Number(factMatch[1]), now)
    return fact
      ? json(fact, 200, { 'Cache-Control': 'public, max-age=3600' })
      : json({ error: 'No fact for that number yet' }, 404)
  }

  const entries = archiveBefore(facts, Number(archiveMatch![1]), now)
  return entries
    ? json({ entries }, 200, { 'Cache-Control': 'public, max-age=600' })
    : json({ error: 'That edition is not out yet' }, 404)
}

const json = (
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(status === 200 ? {} : { 'Cache-Control': 'no-store' }),
      ...headers,
    },
  })

export default {
  fetch(request: Request): Response {
    return handle(request, Date.now())
  },
}
