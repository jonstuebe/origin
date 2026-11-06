# Facts are served one edition at a time by the Worker, with an archive

The prototype shipped every fact in the page, so anyone could read ahead. Like Timestack, Origin keeps `facts.json` inside the Cloudflare Worker and serves `GET /api/fact/:number` only once that edition's date has begun somewhere on Earth (UTC+14 is first).

Origin differs from Timestack in two ways:

- **Past editions stay readable.** The archive is part of the product, so the gate is "not in the future anywhere" rather than Timestack's "today somewhere". `GET /api/archive/:number` lists earlier questions without their answers; each answer is fetched when its page is opened.
- **The launch date is shared with the client.** The client works out today's number from its local date (`shared/edition.ts`) so it can link to `/no/:number`. The launch date isn't secret; the facts are.

## Consequences

- Readers need the network once for each fact they open. The service worker caches API responses network-first, so anything already read works offline.
- When the facts run out the API 404s and readers see "Back tomorrow". Facts never loop. The build warns when fewer than 14 remain.
- Facts publish with a deploy. Moving them to KV or D1 would allow publishing without one, if that becomes worth the extra parts.
