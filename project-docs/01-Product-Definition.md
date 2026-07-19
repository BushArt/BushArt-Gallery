# 01 — Product Definition

> **Precedence: 2nd (below the Constitution).** This document answers *what are we building*, deliberately without prescribing *how*. Implementation detail lives in `02-Technical-Specification.md` onward.

---

## 1. Vision

BushArt is a permanent, self-owned home for a working artist's completed pieces — a single URL that is simultaneously a public gallery and a private studio, requiring no technical maintenance beyond occasional dependency updates.

## 2. Purpose

Today, finishing a piece of art means deciding which of several platforms to post it to, each with different audiences, different crops, different lifespans, and none of them actually owned by the artist. BushArt removes that decision: there is one place completed work goes, it looks the way the artist intends it to look, and it stays there.

## 3. Goals

| Goal | Description |
|---|---|
| **Zero-friction publishing** | Uploading a finished piece — including metadata, tags, and an optional timelapse — takes one guided flow and a few minutes, start to finish. |
| **Zero manual maintenance** | No file system, no database console, no manual image resizing, ever, for any routine task. |
| **Artwork-first presentation** | Visitors spend their attention looking at art, not navigating interface. |
| **Durable and cheap to run** | The site should cost nothing at the artist's current output volume, and scale predictably if that changes. |
| **Built to last** | The system should still make sense, unmodified in spirit, after several years and hundreds of uploads. |

## 4. User Personas

### 4.1 The Artist (Administrator)

- The sole owner and operator of the site. Not necessarily technical beyond comfort using a web browser.
- Produces digital artwork on an ongoing basis — some personal, some commissioned — and wants each finished piece permanently archived and presented well.
- Occasionally produces process/timelapse video alongside a finished piece.
- Wants to update their bio, links, and featured work as often as their portfolio evolves, without asking anyone else to make the change.
- Some work is not safe for all audiences and must be clearly separable from the rest without being removed from the site.

### 4.2 The Casual Visitor

- Arrives from a shared link (social media, a direct message, a search result) — frequently on a phone.
- Wants to quickly understand who the artist is and browse recent or representative work.
- Has no account and will never be asked to create one.

### 4.3 The Returning Fan / Collector

- Visits repeatedly, often looking for new uploads or a specific past piece.
- Uses filtering (tags, medium, year) to find work matching a specific interest.
- May want to download a piece (for personal/reference use, per whatever terms the artist sets elsewhere) or share a specific artwork's link with someone else.

### 4.4 The Prospective Client

- Arrives specifically to evaluate the artist for a commission.
- Cares about consistency, professionalism, medium range, and whether commissioned work is distinguished from personal work.
- Wants a fast way to make contact once they've decided.

## 5. User Stories

**Visitor**
- As a visitor, I can browse a gallery of completed artwork without creating an account.
- As a visitor, I can switch between a compact grid view and a detailed list view.
- As a visitor, I can filter the gallery by tag, year, medium, and commission/personal status, with multiple filters active at once.
- As a visitor, I can toggle whether NSFW-marked artwork is visible to me, and my choice persists as I browse.
- As a visitor, I can open a piece to see it enlarged, alongside any additional images, a timelapse video, and its full details.
- As a visitor, I can open an image or video in a distraction-free fullscreen view.
- As a visitor, I can download a piece and share a direct link to it.
- As a visitor, I can keep scrolling and have more artwork load automatically, without clicking "next page."
- As a visitor, I can read the artist's bio, see their social links, and reach a contact method from the top of the page.

**Administrator**
- As the artist, I can log in from an inconspicuous control on the homepage — nothing that invites a casual visitor to try it.
- As the artist, once logged in, I can upload one or more images and an optional timelapse video for a new piece in a single flow.
- As the artist, I can enter a title, description, medium, completion date, and commission/personal status, and mark the piece NSFW if needed.
- As the artist, I can attach existing tags or create new ones on the spot, without leaving the upload flow.
- As the artist, I never manually resize, compress, or rename an image — the system does it.
- As the artist, I can edit or remove any previously uploaded piece.
- As the artist, I can choose which pieces are featured on the homepage, and in what order.
- As the artist, I can edit my banner, profile picture, name, biography, social links, and contact method directly on the homepage.
- As the artist, I can manage the master tag list, including removing tags I no longer use.

## 6. Functional Requirements

1. Public gallery with grid and detailed-list view modes.
2. Artwork detail popup with an image sequence, optional timelapse video, and full metadata.
3. Distraction-free fullscreen viewer for any image or video.
4. Multi-select tag filtering, plus filtering by year, medium, and commission/personal status.
5. Client-side NSFW visibility toggle, defaulting to hidden (SFW).
6. Infinite scroll with lazy-loaded media.
7. Hidden/unobtrusive admin entry point with username/password login.
8. In-page administrator mode that reveals an "Upload Artwork" affordance and edit controls, without navigating away from the gallery.
9. Guided upload flow: multi-image upload, optional timelapse upload, metadata entry, tag selection/creation.
10. Automatic thumbnail generation and media optimization on upload — no manual step.
11. Editable homepage hero (banner, profile picture, artist name, biography, social links, contact button, featured artwork selection).
12. Tag management: create, assign, and remove tags from a master list.
13. Download and share actions on every artwork.
14. Shareable, directly-linkable URL for every individual artwork.

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Initial gallery view interactive in under 2.5s on a mid-tier mobile connection; see `02-Technical-Specification.md` §Performance Targets for measured budgets. |
| **Responsiveness** | Fully usable from a 320px-wide viewport up through desktop widths, with layouts designed mobile-first. |
| **Accessibility** | WCAG 2.1 AA as the working standard across color contrast, keyboard operability, and screen-reader semantics. |
| **Availability** | No formal SLA (single-operator hobby-scale project), but the architecture must not have single points of failure that lose uploaded data. |
| **Security** | Admin surface is meaningfully protected against casual and automated attack; public surface exposes no write capability. |
| **Cost** | Runs within free-tier infrastructure at current scale; any point at which a paid tier becomes necessary is visible and documented before it's a surprise bill. |
| **Data portability** | Artwork metadata and media are never locked into a proprietary format that would block migrating providers later. |

## 8. Project Scope

**In scope for the initial release (see `11-Project-Roadmap.md` for the MVP milestone):**
- Everything listed in §6 Functional Requirements.
- A single-administrator model (schema supports more; UI assumes one).
- Image and short video (timelapse) media types.

**Explicitly out of scope for the initial release**, but architected for (see §9 Future Vision and `11-Project-Roadmap.md`):
- Blog posts.
- Automatic color palette extraction.
- Collections/series grouping.
- Rich free-text search.
- One-click social sharing previews (Open Graph images) beyond basic shareable links.
- Multiple simultaneous administrators.

## 9. Future Vision

BushArt's long-term shape is a **definitive, permanently archived home** for the artist's complete body of work — one where a finished piece goes from "done" to "published, optimized, tagged, and discoverable" in a few clicks, and stays that way indefinitely. Planned expansions (detailed in `11-Project-Roadmap.md`) include a blog for process writing, automatic palette extraction for aesthetic browsing, richer collections for multi-part work, and improved search as the archive grows past what tag-filtering alone can navigate comfortably.

## 10. Constraints

- **Budget:** effectively $0 at current scale; the technology choices in `02-Technical-Specification.md` are made under this constraint, with honest documentation of where free tiers have real limits.
- **Team size:** one administrator, no dedicated ops or design team — the system must be operable solo.
- **Technical maintenance capacity:** minimal; the system should not require regular manual intervention to keep running.

## 11. Success Metrics

Because this is a single-operator creative portfolio rather than a growth-driven product, success is measured differently than typical SaaS metrics:

| Metric | Target |
|---|---|
| Time to publish a finished piece | Under 2 minutes for a standard single-image upload |
| Manual file/database interventions per month | Zero, under normal operation |
| Gallery load performance | Meets the budgets in `02-Technical-Specification.md` §Performance Targets |
| Infrastructure cost at current scale | $0–low single digits per month (see `12-Decision-Log.md` ADR-009 for the honest cost picture) |
| Visitor ability to find specific work | A visitor can isolate a specific piece using tag/medium/year filters without needing full-text search |

## 12. Out-of-Scope Features (by design)

The following are deliberately **not** goals of BushArt, now or in the roadmap, because they conflict with the Constitution's focus on a single artist's curated body of work:

- User accounts, comments, likes, or follower systems for visitors.
- Multi-artist marketplace functionality.
- E-commerce / checkout (commission inquiries route to direct contact, not an in-app cart).
- Algorithmic feed ranking or engagement-optimized surfacing of content.
