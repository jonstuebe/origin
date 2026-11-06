# Agent Development Notes

This is a Foldkit app. Read [`FOLDKIT.md`](./FOLDKIT.md) before writing any code in this project. It covers the architecture, the APIs, and the conventions the project is built on.

Foldkit owns `FOLDKIT.md` and replaces it whole on upgrade. This file is yours. Anything you want an agent to know about this project goes below, where an upgrade won't touch it.

`FOLDKIT.md` reads the line below to decide whether it has already offered to vendor the Foldkit source. Leave it in place.

subtree_prompted: false

## Project Notes

Origin is a daily fact site. See `README.md` for the API, deployment and how to add facts, and `docs/adr/` for decisions.

- **Edition**: one day's fact. Edition No. 1 is the launch date in `shared/edition.ts`; numbers count days from there in the reader's local time.
- **Verdict**: the reader's "I knew it" (`Knew`) or "New to me" (`New`).
- `worker/` is a plain Cloudflare Worker, not Foldkit code. It is excluded from `npm run lint`, which applies Foldkit rules.
- `worker/facts.json` is append-only. Never reorder or edit published entries.
- Styles are hand-written CSS in `src/styles.css` (ported from the original design), not Tailwind.
- Before pushing: `npm run lint && npm test && npm run build`. `main` auto-deploys to Cloudflare.
