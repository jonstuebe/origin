# Origin

One question a day about where everyday words and things come from. Guess, reveal the answer, mark whether you already knew it, and share a spoiler-free line. Past questions live in the archives.

Live at **https://origin.jonstuebe.com**.

- One fact per day, the same for everyone, chosen by the reader's **local** date. No. 1 was November 5, 2026.
- A small Cloudflare Worker serves facts one at a time and refuses any edition whose date hasn't started somewhere on Earth, so future facts can't be read from the page or the API (see [ADR 0001](docs/adr/0001-facts-served-by-worker.md)).
- The client is a [Foldkit](https://foldkit.dev) app (Effect + The Elm Architecture). Reveals, verdicts and streaks live in `localStorage` under `origin:v1`.
- Installable PWA. API responses are cached network-first, so anything already read stays readable offline.

## Develop

```sh
npm install
npm run dev          # Vite dev server, with the Worker API running in workerd
npm run build        # typecheck + build into dist/client (site) and dist/origin (Worker)
npm run preview      # serve the production build, Worker and service worker included
```

## Check

```sh
npm test             # Vitest: Worker date gate, streaks/storage, Foldkit story + scene tests
npm run lint         # oxlint with the Foldkit and Effect rule sets
npm run format       # oxfmt
```

## Deploy

Cloudflare Workers Builds deploys `main` automatically. Connect the repo in the Cloudflare dashboard (Workers & Pages → Create → Import a repository) with:

| Setting        | Value                 |
| -------------- | --------------------- |
| Build command  | `npm run build`       |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/`                   |

`wrangler.jsonc` names the Worker `origin` and attaches the custom domain `origin.jonstuebe.com` (the `jonstuebe.com` zone must be on the same Cloudflare account). Node comes from `.node-version`. To deploy by hand instead: `npm run deploy`.

## API

| Route                      | Returns                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------- |
| `GET /api/fact/:number`    | `{ number, date, question, headline, body }`                                        |
| `GET /api/archive/:number` | `{ entries: [{ number, date, question }] }` for every earlier edition, newest first |

Both 404 when `:number`'s date hasn't begun in any time zone (UTC+14 is first), before launch, or, for facts, after the list runs out. Readers then see "Back tomorrow"; facts never loop.

## Adding facts

Facts live in `worker/facts.json`, in publishing order: entry _n_ is edition No. _n_, published on launch date + _n_ − 1. They never ship in the client bundle. Append new entries and push to `main`. Every build warns when fewer than 14 facts are left after today.

Each fact has:

- `question`: the hook, phrased as a question the reader can guess at.
- `headline`: a one-line answer shown in italics after the reveal.
- `body`: two to four sentences of explanation. Use curly quotes and apostrophes (’ “ ”).

Never reorder or edit published entries: numbers, dates and readers' saved verdicts are tied to position.

## Structure

```
shared/edition.ts    launch date, edition number <-> date
worker/
  index.ts           the two API routes
  facts.ts           publish gate, archive listing
  facts.json         every fact (server only)
src/                 Foldkit app
  entry.ts           boots the runtime, fonts, service worker
  main.ts            Flags (clock + saved progress) and init
  model.ts           Model schema
  message.ts         Messages
  update.ts          update + route loading
  command.ts         fetch, save, share, navigation Commands
  subscription.ts    one-second clock tick (countdown + midnight rollover)
  view.ts            pages: today, past edition, archives
  domain.ts          Fact/Archive/Progress schemas, streak and tallies
  route.ts           /, /archive, /no/:number
  *.test.ts          story (update) and scene (view) tests
tests/worker.test.ts Worker tests
scripts/make-icons.mjs  renders public/icons from public/favicon.svg (needs Playwright)
```
