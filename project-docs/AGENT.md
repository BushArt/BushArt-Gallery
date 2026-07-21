# AGENT.md

*Operational entry point for AI agents and human contributors working on BushArt. Read this first, every session.*

## What This Is

BushArt is a single-artist digital art gallery and CMS: a public browsing gallery plus an admin-only publishing surface, built as one Next.js 16 application. MongoDB Atlas holds metadata, Cloudinary holds media — the app stores no files itself and requires no manual database work for any routine task.

Full vision and rationale live in `project-docs/`. This file does not restate it — it tells you where to look, and what not to violate while you work.

## Start Here, Every Session

Read these two in full before writing any code. They're short, and they change your behavior globally:

1. **`project-docs/PROJECT-CONSTITUTION.md`** — the non-negotiable principles everything else is judged against.
2. **`project-docs/TODO.md`** — what's currently in flight, what's already done, what's next.

Everything else is read **on demand**, scoped to whatever the current task actually touches. Don't read the whole `project-docs/` folder to make a small change — use the map below.

## Documentation Map

All paths relative to `project-docs/`.

| Need to... | Read |
|---|---|
| Confirm a feature/behavior is in scope | `01-Product-Definition.md` |
| Touch the stack, auth, caching, env vars | `02-Technical-Specification.md` |
| Touch upload flow, routing, pagination | `03-System-Architecture.md` |
| Touch any MongoDB read/write, add a field | `04-Database-Schema.md` |
| Add or change an endpoint / its contract | `05-API-Specification.md` |
| Touch visual design, tokens, motion | `06-UI-Design-System.md` |
| Implement a user-facing flow | `07-User-Flows.md` |
| Decide where a new file belongs | `08-Project-Structure.md` |
| Write any code at all | `09-Coding-Standards.md` |
| Touch deploy config or hosting | `10-Deployment-Guide.md` |
| Decide if something is MVP or later | `11-Project-Roadmap.md` |
| Understand *why* something was built this way | `12-Decision-Log.md` |
| Check what's shipped and when | `CHANGELOG.md` |

## Precedence

If two documents conflict, the earlier one wins:

`PROJECT-CONSTITUTION` → `01-Product-Definition` → `02-Technical-Specification` → `03-System-Architecture` → `04-Database-Schema` → `05-API-Specification` → `06-UI-Design-System` → `09-Coding-Standards` → everything else.

Never resolve a conflict by guessing — if two docs disagree in a way that blocks the task, surface it and ask. Full rationale: `README.md` §5.

This file carries no precedence of its own. Where it summarizes a rule, the source doc wins if they ever diverge — treat that as a bug in this file, and fix this file, not the rule.

## Hard Constraints

The mistakes most likely to slip past a first read of the docs. Treat these as absolute.

**Product & architecture**
- Every admin action must be reachable through the website. A feature that only works via a script or a manual DB write isn't done.
- Media bytes never touch MongoDB — only Cloudinary `publicId`/URL references are stored (`04-Database-Schema.md` §3).
- Thumbnails are transformation **URLs**, never separately stored files (`12-Decision-Log.md` ADR-008). Don't build a resize/thumbnail pipeline.
- No related-artwork module in the artwork popup, ever — a deliberate, explicit non-feature, not an oversight (`01-Product-Definition.md`).
- The homepage stays one continuously scrolling page. New content is a section or an overlay, never a new top-level route with its own nav.
- Don't add a paid dependency or service without flagging the cost — the project runs on free tiers by default (`02-Technical-Specification.md` §11).

**Security**
- `proxy.ts` is a UX convenience only, never the security boundary. Every admin-mutating Route Handler must independently re-verify the session server-side — this mitigates a real, disclosed vulnerability class (CVE-2025-29927), not a style preference (`02-Technical-Specification.md` §4).
- Never log a plaintext password or a Cloudinary API secret, at any log level.

**Process**
- Don't invent a new collection, endpoint, or field on the fly. If a task genuinely needs one, that's a signal to update the relevant doc as part of the work — not to freelance around it.
- Before "fixing" something that looks wrong, check `12-Decision-Log.md`. It may be a deliberate trade-off with a written reason.
- ADRs in `12-Decision-Log.md` are never edited or deleted once written. A reversed decision gets a new, dated entry that supersedes the old one.

## The TODO.md Workflow

Work is staged in `project-docs/TODO.md`, not invented ad hoc.

- Pick up or create items following the rules and template already defined there.
- Log notes and results **as you go**, in the item's own Notes/Results field — not only at the end.
- When every success condition and test passes, set the item's status to `Done — Awaiting Close-Out` and **stop.**
- Do not erase the item, write to `CHANGELOG.md`, or update other docs on your own judgment that the work is finished. That entire sequence requires the user's explicit permission, given per item — never inferred from silence or from the conversation moving on. Full procedure: `TODO.md` §2–§3.

## Working in the Repo

- **Structure:** `08-Project-Structure.md` is authoritative for where a file goes. When unsure, match an existing sibling rather than inventing a new pattern.
- **Commands** (once the repo is scaffolded, per `TODO-001`): `npm run dev`, `npm run build`, `npm run db:setup` (create indexes), `npm run seed:admin` (bootstrap the first admin, run once — see `02-Technical-Specification.md` §9). Check `package.json` for the current test-runner scripts rather than assuming a specific tool.
- **Before calling anything done:** it meets its TODO item's success conditions, it has the test coverage `09-Coding-Standards.md` §13 calls for at that risk level, and it doesn't contradict a higher-precedence doc.
- **Commits:** Conventional Commits — `feat`, `fix`, `docs`, `refactor`, `chore`, `test` (`09-Coding-Standards.md` §14).

## When You're Unsure

1. Check the Documentation Map above for the doc that governs this.
2. Check `12-Decision-Log.md` — the ambiguity may already be a resolved, deliberate trade-off.
3. Check `TODO.md` for related in-flight or planned work.
4. Still unresolved? Say so and ask, rather than guessing and shipping a silent assumption. A wrong guess here is the architectural drift this file exists to prevent.

## Quick Reference

| | |
|---|---|
| Stack | Next.js 16 (App Router) · TypeScript strict · Tailwind CSS · Framer Motion · MongoDB Atlas M0 · Cloudinary |
| Auth | Custom JWT in an httpOnly cookie — not Auth.js (`12-Decision-Log.md` ADR-004) |
| Collections | `artworks`, `tags`, `admins`, `site_settings` (`04-Database-Schema.md`) |
| Media uploads | Signed, direct from the admin's browser to Cloudinary (`03-System-Architecture.md` §4) |
| Shareable artwork URLs | Intercepting routes at `/artwork/[slug]` (`12-Decision-Log.md` ADR-005) |
| Hosting | See `10-Deployment-Guide.md` §6 for the current platform and setup |

---

*Keep this file short enough to read every session. If it starts growing past a skim, the new detail belongs in the doc it's about — leave a pointer here instead.*
