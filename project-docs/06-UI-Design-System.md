# 06 — UI Design System

> **Precedence: 7th.** This is the definitive visual language for BushArt. It translates the Constitution's design principles ("artwork is always the primary focus," "performance is a feature," "accessibility is mandatory") into concrete, implementable tokens.

---

## 1. Design Philosophy

BushArt is described, in its own brief, as feeling like **"a digital sketchbook or museum gallery."** That phrase is taken literally as the design's organizing idea, not just a mood board reference:

- **The sketchbook** supplies the material vocabulary — graphite, ink, brass fasteners, warm paper rather than clinical white, the quiet texture of a working artist's tools.
- **The museum gallery** supplies the discipline — generous negative space, a placard-like treatment of metadata (medium, date, dimensions), and UI that steps back so the work itself is what's being lit.

Concretely, this means the palette is not "dark mode with a bright brand accent" — it's built from three specific, functionally-motivated materials (brass, dried conte crayon, india ink), and the one signature interaction in the system is a loading state that behaves like a piece being sketched into existence, not a generic skeleton shimmer. Everything else in the system is deliberately quiet, so those choices carry the personality instead of decoration doing it.

---

## 2. Color Palette

All colors are shipped as CSS custom properties so they're themeable from one place. Dark mode is the only mode at launch (per the Constitution, "dark mode by default" — a light theme is not a Day 1 requirement and is not designed here).

### 2.1 Surfaces & Text ("Ink & Paper")

| Token | Hex | Usage |
|---|---|---|
| `--ink-950` | `#121110` | Page background. Near-black with a whisper of warm graphite, not a clinical pure black. |
| `--ink-900` | `#1B1917` | Card / surface background. |
| `--ink-800` | `#242220` | Raised surface, hover state on cards. |
| `--ink-700` | `#34312C` | Borders, dividers, input outlines. |
| `--ink-600` | `#4A453D` | Disabled text, placeholder text. |
| `--paper-100` | `#F3EFE7` | Primary text. Warm off-white — like paper, never pure `#FFFFFF`. |
| `--paper-300` | `#D6CFC0` | Secondary text (descriptions, body copy on dark surfaces). |
| `--paper-500` | `#A69C8C` | Tertiary text (metadata labels, timestamps). |

### 2.2 Functional Accents ("Studio Materials")

Three accents, each tied to a real functional need in the product — not one generic "brand color" applied everywhere:

| Token | Hex | Usage |
|---|---|---|
| `--accent-brass` | `#B8944F` | Primary interactive accent — links, active filter chips, primary buttons, focus rings. Muted metallic gold, like a drafting compass or a sketchbook's brass corner fittings. Used deliberately sparingly. |
| `--accent-ember` | `#A8543D` | The NSFW badge and its related UI (toggle, confirmation state). A dried red conte-crayon tone — warm, not a stock "danger red." |
| `--accent-ink-blue` | `#4A7A82` | The commission badge, and anything distinguishing commissioned from personal work. A muted teal reminiscent of technical/india ink. |

**Why three accents instead of one:** the product has a genuine need to visually distinguish *at a glance* between ordinary content, NSFW content, and commission status (`01-Product-Definition.md` §6). Solving that with three restrained, material-grounded hues is more honest than solving it with one loud brand color plus ad hoc semantic colors bolted on later.

### 2.3 Contrast Compliance

Every text/background pairing above meets **WCAG 2.1 AA** (4.5:1 for body text, 3:1 for large text/UI components) at the sizes specified in §3. This is verified as a checklist item before any new UI ships, not assumed.

---

## 3. Typography

Three type families, each with one clear job — a deliberate pairing chosen for this project, not a default reached for on any brief:

| Role | Typeface | Why |
|---|---|---|
| **Display** (artist name, section headers, artwork titles in the popup) | **Fraunces** (variable) | A soft-contrast serif with an inked, slightly irregular warmth at higher optical sizes — the one place the design allows itself real character. Used with restraint: headings only, never body copy. |
| **Body / UI** (descriptions, navigation, buttons, forms) | **Inter** | Quiet, extremely legible at small sizes, fast-loading, and gets out of the way — deliberately the "boring" choice so the boldness budget is spent on Fraunces and the sketch-reveal motion instead. |
| **Label / Metadata** (medium, completion date, dimensions, tags — anywhere data reads like a museum placard) | **IBM Plex Mono** | A technical, catalog-card treatment for facts about a piece, distinct from prose about it. |

Both `Fraunces` and `IBM Plex Mono` are loaded via `next/font` (self-hosted, not a runtime Google Fonts request) to protect the Constitution's performance principle.

### Type Scale

| Token | Size / Line-height | Face | Usage |
|---|---|---|---|
| `--text-display-lg` | 48px / 1.1 | Fraunces, 480 weight | Homepage artist name |
| `--text-display-md` | 32px / 1.15 | Fraunces, 480 weight | Artwork popup title, section headers |
| `--text-display-sm` | 22px / 1.2 | Fraunces, 500 weight | Card titles (detailed list view) |
| `--text-body-lg` | 17px / 1.6 | Inter, 400 | Biography, artwork description |
| `--text-body-md` | 15px / 1.5 | Inter, 400 | Default UI text, buttons, nav |
| `--text-body-sm` | 13px / 1.4 | Inter, 500 | Filter chips, form labels |
| `--text-label` | 12px / 1.3, letter-spacing 0.02em | IBM Plex Mono, 500 | Medium, date, dimensions, tag pills |

---

## 4. Grid & Layout

- **Base grid:** 12-column responsive grid with a max content width of `1400px`, centered, with fluid gutters.
- **Breakpoints** (mobile-first — Constitution §8):

| Token | Width | Notes |
|---|---|---|
| `--bp-sm` | 640px | Two-column gallery grid begins here. |
| `--bp-md` | 768px | Hero switches from stacked to side-by-side (image + bio). |
| `--bp-lg` | 1024px | Three/four-column gallery grid; detailed list view gains a persistent thumbnail column. |
| `--bp-xl` | 1280px | Max gutters reached; layout stops widening further, content area caps out. |

- **Gallery grid:** CSS Grid with `grid-auto-flow: dense` combined with per-item aspect-ratio variance for the masonry feel described in `01-Product-Definition.md`. A JS-computed masonry approach (column-balancing) is used as the implementation strategy rather than depending on native CSS masonry layout, since browser support for `grid-template-rows: masonry` is not yet consistent enough to rely on — see `12-Decision-Log.md` for this being revisited if/when support solidifies.

## 5. Spacing Scale

4px base unit, matching Tailwind's default scale so tokens map directly to utility classes without a custom config layer:

`--space-1: 4px · --space-2: 8px · --space-3: 12px · --space-4: 16px · --space-6: 24px · --space-8: 32px · --space-12: 48px · --space-16: 64px · --space-24: 96px`

## 6. Elevation

Because the palette is dark, elevation is communicated primarily through **surface lightness steps** (`--ink-950` → `--ink-900` → `--ink-800`), not heavy drop shadows, which tend to look muddy on dark backgrounds. A single, subtle shadow token exists for floating elements that sit above the surface stack entirely:

`--shadow-float: 0 8px 24px rgba(0, 0, 0, 0.45)` — used only for the artwork popup and the upload dialog, never for ordinary cards.

## 7. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Tags, badges, form inputs |
| `--radius-md` | 10px | Cards, buttons |
| `--radius-lg` | 16px | Popups, modals |
| `--radius-full` | 9999px | The NSFW/commission badges, the view-mode toggle |

## 8. Cards (Artwork Cards)

- **Grid mode:** thumbnail-forward — image fills the card, title appears on hover/focus (desktop) or as a persistent bottom-gradient caption (touch devices, since there is no hover state to rely on). Commission and NSFW indicators are small badge pills in the top-right corner, using `--accent-ink-blue` and `--accent-ember` respectively, never text-labeled "NSFW" in a way that itself becomes the most prominent element on the card — a small, consistent icon-badge is used instead, to honor the Constitution's "nothing competes visually with the art" principle.
- **Detailed list mode:** thumbnail + `--text-display-sm` title + `IBM Plex Mono` metadata line (medium · date) + a truncated description in `--text-body-md`.
- **Admin upload card:** visually distinct from artwork cards (a dashed `--ink-700` border, centered plus icon, `--accent-brass` on hover) so it reads unambiguously as "not an artwork" — it is the first card in the grid only when an admin session is active.

## 9. Buttons

| Variant | Usage | Style |
|---|---|---|
| Primary | Login submit, upload submit, save | Solid `--accent-brass` background, `--ink-950` text |
| Secondary | Cancel, view-mode toggle | `--ink-800` background, `--paper-100` text, `--ink-700` border |
| Ghost | Download, share, inline icon actions | Transparent, `--paper-300` text, `--ink-800` on hover |
| Destructive | Delete artwork, delete tag | `--accent-ember` text on `--ink-800`, confirmation required before the action fires |

All buttons have a visible focus ring (`2px solid --accent-brass`, offset `2px`) — never `outline: none` without a replacement, per §14 Accessibility.

## 10. Forms

- Inputs use `--ink-900` background, `--ink-700` border, `--paper-100` text, `--radius-sm`.
- Labels are always visible (`--text-body-sm`, `--paper-500`) — never placeholder-only labels, which fail accessibility guidance and disappear exactly when they're most needed (mid-edit).
- The upload form's tag picker supports both "select existing" (a searchable multi-select of current tags) and "create new" (typing a name not in the list surfaces an inline "Create '{name}'" option) in the same control, matching `01-Product-Definition.md`'s tag workflow.
- Validation errors appear inline, directly beneath the offending field, in `--accent-ember` at `--text-body-sm` — never as a disconnected toast that doesn't say which field failed.

## 11. Popups & Modals

- The artwork popup opens as an overlay above a dimmed (`rgba(18,17,16,0.8)`) backdrop, sized to `--radius-lg`, using `--shadow-float`.
- Layout: enlarged image/media sequence on top (or left, on wide viewports), metadata placard below (or right) in the Label typeface, tags as pill chips, download/share as Ghost buttons in a consistent top-right action row.
- No related-artwork module is ever shown in the popup — this is an explicit product requirement (`01-Product-Definition.md`), not an oversight, so it is called out here to prevent a future contributor from "fixing" its apparent absence.
- The fullscreen viewer (opened from within the popup) drops all chrome except a minimal close control and, for multi-image pieces, prev/next arrows — the closest the interface gets to a bare canvas.

## 12. Navigation

There is no persistent top navigation bar — consistent with the Constitution's "one continuously scrolling page" principle. The only always-available navigational elements are:
- The view-mode toggle (grid/list), floating at the top of the gallery section.
- The filter bar, which becomes sticky (`position: sticky`) once scrolled past the hero, so filtering remains available without scrolling back up.
- The hidden admin entry point: a small pencil-nib glyph in the page footer at ~30% opacity (full opacity on hover/focus for discoverability by keyboard/screen-reader users, since "hidden from casual visitors" must not mean "inaccessible to the artist using assistive technology") plus a keyboard shortcut (`Shift+Alt+L`) as a documented backup path.

## 13. Icons

A single consistent icon set (`lucide` — permissively licensed, tree-shakeable, matches the restrained linework the rest of the system uses) at `1.5px` stroke weight. No mixed icon sets. Icons are always paired with an accessible label (visually hidden text or `aria-label`), never color- or shape-alone as the only signal (§14).

## 14. Motion Guidelines

Motion in BushArt has exactly one signature moment, used with intention rather than sprinkled throughout (per the frontend design principle of spending boldness in one place):

**The Sketch-In Reveal.** When an artwork thumbnail enters the viewport and its image is still loading, instead of a generic shimmer/skeleton block, a single thin `--accent-brass` SVG outline animates as though the card's frame is being hand-sketched (a `stroke-dasharray`/`stroke-dashoffset` animation tracing the card's border), and the photograph crossfades in once loaded. This is used in exactly two places: the gallery grid's lazy-load-in and the artwork popup's opening transition (where the popup's frame sketches in around the enlarged image). It is not used for buttons, badges, or routine hover states — those stay quiet.

Everything else follows a restrained, consistent set of transition primitives:

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `--motion-instant` | 100ms | `ease-out` | Hover/focus state changes |
| `--motion-fast` | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Filter chip toggle, badge appearance |
| `--motion-base` | 300ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Card entrance stagger, view-mode switch |
| `--motion-deliberate` | 450ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Popup open/close, fullscreen viewer transition |

`prefers-reduced-motion: reduce` disables the sketch-in trace and all entrance staggers system-wide, falling back to a simple opacity crossfade — this is a hard requirement, not a nice-to-have (Constitution §10).

## 15. Responsive Breakpoints (Summary)

See §4 for the full table. Design work for every screen in `07-User-Flows.md` starts at the 320px viewport and is verified at each breakpoint before being considered complete.

## 16. Accessibility Standards

- **Target:** WCAG 2.1 AA across the product, per the Constitution and `01-Product-Definition.md` §7.
- **Keyboard:** every interactive element (gallery cards, filters, the NSFW toggle, the admin login trigger, the popup, the fullscreen viewer) is reachable and operable via keyboard alone, with a visible focus state at all times.
- **Screen readers:** artwork cards expose title and key metadata as accessible text, not solely as visual layout; the fullscreen viewer announces image position ("Image 2 of 4") on navigation.
- **Color is never the only signal:** the NSFW and commission badges pair color with a distinct icon shape, so the distinction survives grayscale/color-blind viewing.
- **Motion sensitivity:** `prefers-reduced-motion` is respected everywhere, as detailed in §14.
- **Alt text:** every uploaded image requires, at minimum, its artwork `title` as `alt` text automatically; the upload flow allows (but does not require) a more descriptive alt string per image for cases where the title alone doesn't convey the image's content.
