# 07 — User Flows

> **Precedence: 9th (part of "remaining documents").** This document translates `01-Product-Definition.md`'s user stories into concrete, step-by-step journeys, grounded in the screens described in `06-UI-Design-System.md` and the endpoints in `05-API-Specification.md`.

---

## Visitor Flows

### 1. Browse Gallery → Filter → Open Artwork

This is the primary, highest-traffic journey in the product, so it's documented as a single connected flow rather than three disconnected ones — in practice, visitors move fluidly between browsing, filtering, and opening pieces.

```mermaid
flowchart TD
    A["Land on homepage\n(direct visit or shared link)"] --> B["Hero renders:\nbanner, name, bio, links, featured work"]
    B --> C["Scroll into gallery section"]
    C --> D{"Apply a filter?\n(tag / year / medium / type)"}
    D -- "Yes" --> E["Select filter(s)\ngallery re-queries instantly, no reload"]
    E --> F["Grid updates with animated transition"]
    D -- "No" --> F
    F --> G{"Reached bottom of loaded items?"}
    G -- "Yes" --> H["Sentinel enters viewport\nnext page fetched via cursor"]
    H --> F
    G -- "No" --> I["Click / tap an artwork card"]
    F --> I
    I --> J["Route intercepted → popup opens\nover the still-mounted gallery"]
    J --> K["URL updates to /artwork/[slug]\n(shareable, no full reload)"]
```

**Notes:**
- Switching the grid/list view mode (`06-UI-Design-System.md` §8) can happen at any point in this flow without resetting scroll position or active filters.
- The NSFW toggle (SFW default) is a persistent control available throughout browsing, not a one-time gate — see Flow 6.

### 2. Fullscreen Viewer

```mermaid
flowchart LR
    A["Artwork popup open"] --> B["Click / tap the enlarged image or timelapse"]
    B --> C["Fullscreen viewer opens\n(all chrome removed except close + prev/next)"]
    C --> D{"Multiple images?"}
    D -- "Yes" --> E["Prev / next arrows or swipe\ncycle through images[] in order"]
    E --> C
    D -- "No" --> F["Single image/video shown"]
    C --> G["Esc / close control / swipe-down"]
    G --> A
```

### 3. Download

```mermaid
flowchart TD
    A["Artwork popup open,\nviewing a specific image or the timelapse"] --> B["Click Download"]
    B --> C["GET /api/artworks/:slug/download\n?image=&lt;index&gt; or ?asset=timelapse"]
    C --> D["302 redirect to Cloudinary\nfl_attachment original-quality URL"]
    D --> E["Browser downloads the file directly"]
```

The application server is never in the file's data path (`03-System-Architecture.md` §4) — the download button's only job is producing the correct redirect.

### 4. Share

```mermaid
flowchart TD
    A["Artwork popup open"] --> B["Click Share"]
    B --> C{"Web Share API available?\n(mobile / supporting browsers)"}
    C -- "Yes" --> D["Native OS share sheet opens\nwith the artwork's canonical /artwork/[slug] URL"]
    C -- "No" --> E["URL copied to clipboard\n+ inline confirmation shown"]
```

Because every artwork has a real, server-renderable route (`03-System-Architecture.md` §6), the shared link opens correctly for the recipient even if they've never visited BushArt before — it is not a fragile client-side-only deep link.

### 5. NSFW Toggle

```mermaid
flowchart LR
    A["Visitor arrives\n(SFW mode is default)"] --> B["Toggle NSFW Mode control\n(persistently visible near filters)"]
    B --> C["Preference saved client-side\n(persists across the session)"]
    C --> D["Gallery re-queries with nsfw=include\nNSFW-marked artwork now appears, unbadged-hidden"]
```

If a visitor follows a shared link directly to an NSFW-marked artwork while still in SFW mode, the detail route still resolves (per `05-API-Specification.md` §4.2's implementation note) but the UI shows a brief interstitial confirmation before rendering the media, rather than a bare 404 — this keeps direct links reliable while still respecting the visitor's stated preference.

---

## Administrator Flows

### 6. Login

```mermaid
flowchart TD
    A["Artist locates the hidden entry point\n(footer glyph or Shift+Alt+L)"] --> B["Login modal opens\nover the current page state — no navigation"]
    B --> C["Enter username + password"]
    C --> D["POST /api/auth/login"]
    D --> E{"Valid, account not locked?"}
    E -- "Yes" --> F["Session cookie set\nAdmin UI unlocks in place:\nupload card, edit controls, settings access"]
    E -- "No" --> G["Inline error shown\n(5 failures → 15-minute lock)"]
    G --> C
```

### 7. Upload Artwork

```mermaid
flowchart TD
    A["Admin mode active"] --> B["Click the Upload Artwork card\n(first card in the gallery, admin-only)"]
    B --> C["Upload dialog opens"]
    C --> D["Add one or more images\n+ optional timelapse video"]
    D --> E["Enter title, description, medium,\ncompletion date"]
    E --> F["Choose Commission or Personal"]
    F --> G["Mark NSFW if applicable"]
    G --> H["Select existing tags and/or\ncreate new ones inline"]
    H --> I["Submit"]
    I --> J["Media uploads directly to Cloudinary\nusing a signed, admin-authorized signature"]
    J --> K["Metadata + asset references\nposted to POST /api/artworks"]
    K --> L["New artwork appears in the gallery\nimmediately — no manual refresh"]
```

This is the flow the Constitution's "frictionless uploads" principle and `01-Product-Definition.md`'s "under 2 minutes for a standard upload" success metric are measured against. See `03-System-Architecture.md` §4 for the technical sequence behind steps J–K.

### 8. Edit Artwork

```mermaid
flowchart LR
    A["Admin mode active"] --> B["Open an existing artwork's popup"]
    B --> C["Edit control visible\n(admin-only, absent for visitors)"]
    C --> D["Popup switches to edit state\nsame fields as upload, pre-filled"]
    D --> E["Change any field\n(including adding/removing images)"]
    E --> F["Save → PATCH /api/artworks/:id"]
    F --> G["Popup returns to view state\nwith updated content"]
```

### 9. Manage Tags

```mermaid
flowchart TD
    A["Admin mode active"] --> B{"Where?"}
    B -- "Inline, during upload/edit" --> C["Type a tag name\nmatch existing or 'Create new'"]
    B -- "Dedicated tag manager" --> D["View master tag list\nwith usage counts"]
    D --> E["Remove an unused or unwanted tag"]
    E --> F["DELETE /api/tags/:id\ncascades: pulled from every artwork automatically"]
    C --> G["POST /api/tags if new\nattached to the artwork being edited"]
```

### 10. Update Homepage

```mermaid
flowchart LR
    A["Admin mode active"] --> B["Hero section shows\nedit affordances on each element\n(banner, profile picture, name, bio, links, contact)"]
    B --> C["Edit a field directly in place"]
    C --> D["Save → PATCH /api/settings"]
    D --> E["Hero updates immediately\nfor the admin; live for all visitors"]
```

### 11. Manage Featured Artwork

```mermaid
flowchart TD
    A["Admin mode active"] --> B["Open an artwork's edit state\n(Flow 8) or a dedicated featured-selection view"]
    B --> C["Toggle Featured on/off"]
    C --> D{"Featured = true?"}
    D -- "Yes" --> E["Set / adjust its position\namong other featured pieces"]
    E --> F["Save → PATCH /api/artworks/:id\n{ featured, featuredOrder }"]
    D -- "No" --> F
    F --> G["Homepage featured section\nreflects the change immediately"]
```

---

## Cross-Flow Notes

- Every admin flow above (6–11) assumes Flow 6 (Login) has already succeeded — none of them are reachable without a valid session, and every corresponding API call in `05-API-Specification.md` independently re-verifies that session server-side, per `02-Technical-Specification.md` §4.
- No flow in this document ever requires leaving the single continuously-scrolling homepage, except the fullscreen viewer (Flow 2) and the artwork detail route (Flow 1, step K) — both of which are overlays/route-interceptions rather than true navigations away from the gallery, consistent with the Constitution.
