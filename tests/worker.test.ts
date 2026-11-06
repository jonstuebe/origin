import { describe, expect, test } from 'vitest'

import {
  type StoredFact,
  archiveBefore,
  isPublished,
  publishedFact,
} from '../worker/facts'
import { handle } from '../worker/index'

const FACTS: ReadonlyArray<StoredFact> = [1, 2, 3, 4].map(n => ({
  question: `Question ${n}?`,
  headline: `Headline ${n}.`,
  body: `Body ${n}.`,
}))

const HOUR = 3_600_000
const utc = (iso: string): number => Date.parse(iso)
const get = (path: string, now: number, method = 'GET') =>
  handle(new Request(`https://origin.test${path}`, { method }), now, FACTS)

describe('isPublished', () => {
  test('an edition opens when its date begins in UTC+14', () => {
    const edition2Utc = utc('2026-11-06T00:00:00Z')
    expect(isPublished(2, edition2Utc - 14 * HOUR - 1)).toBe(false)
    expect(isPublished(2, edition2Utc - 14 * HOUR)).toBe(true)
  })

  test('past editions stay published', () => {
    expect(isPublished(1, utc('2027-06-01T00:00:00Z'))).toBe(true)
  })
})

describe('publishedFact', () => {
  const now = utc('2026-11-06T12:00:00Z')

  test('returns the fact with its number and date', () => {
    expect(publishedFact(FACTS, 2, now)).toEqual({
      number: 2,
      date: '2026-11-06',
      question: 'Question 2?',
      headline: 'Headline 2.',
      body: 'Body 2.',
    })
  })

  test('refuses future editions, numbers before launch, and numbers past the list', () => {
    expect(publishedFact(FACTS, 4, now)).toBeNull()
    expect(publishedFact(FACTS, 0, now)).toBeNull()
    expect(publishedFact(FACTS, 5, utc('2030-01-01T00:00:00Z'))).toBeNull()
  })
})

describe('archiveBefore', () => {
  test('lists earlier questions newest first, without answers', () => {
    expect(archiveBefore(FACTS, 3, utc('2026-11-07T12:00:00Z'))).toEqual([
      { number: 2, date: '2026-11-06', question: 'Question 2?' },
      { number: 1, date: '2026-11-05', question: 'Question 1?' },
    ])
  })

  test('still lists everything once the facts run out', () => {
    expect(archiveBefore(FACTS, 9, utc('2026-11-13T12:00:00Z'))).toHaveLength(4)
  })

  test('refuses an edition that is not out yet', () => {
    expect(archiveBefore(FACTS, 5, utc('2026-11-06T12:00:00Z'))).toBeNull()
  })
})

describe('handle', () => {
  const now = utc('2026-11-06T06:00:00Z')

  test('GET /api/fact/:number serves a published fact with caching', async () => {
    const response = get('/api/fact/1', now)
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600')
    expect(await response.json()).toMatchObject({
      number: 1,
      question: 'Question 1?',
    })
  })

  test('GET /api/fact/:number 404s before its date starts anywhere', async () => {
    const response = get('/api/fact/3', now)
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  test('GET /api/archive/:number lists past questions', async () => {
    const response = get('/api/archive/2', now)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      entries: [{ number: 1, date: '2026-11-05', question: 'Question 1?' }],
    })
  })

  test('rejects other methods and unknown paths', () => {
    expect(get('/api/fact/1', now, 'POST').status).toBe(405)
    expect(get('/api/fact/abc', now).status).toBe(404)
    expect(get('/api/other', now).status).toBe(404)
  })
})
