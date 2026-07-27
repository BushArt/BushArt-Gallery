# 05 — API Specification

> **Precedence: 6th.** This is the definitive contract for every HTTP endpoint BushArt exposes. It is subordinate to `04-Database-Schema.md` — if a described request/response shape contradicts the schema document, the schema document is correct and this one has a bug.

---

## 1. Conventions

- **Base path:** all routes are served from the same Next.js deployment under `/api`. There is no separate API domain.
- **Versioning:** every route is implicitly `v1`. The route prefix does not currently include a version segment (`/api/artworks`, not `/api/v1/artworks`) because there is only one version — but every Route Handler internally treats its request/response shape as versioned, so that if a breaking change is ever needed, `/api/v2/...` can be introduced alongside the existing routes rather than breaking them. See `12-Decision-Log.md` for this being a deliberate, low-cost future-proofing choice.
- **Format:** all requests and responses are `application/json`, except file bytes, which never pass through this API at all (see §6 Upload Signature and `03-System-Architecture.md` §4).
- **Authentication:** admin-only routes require a valid `bushart_session` httpOnly cookie, set by `POST /api/auth/login`. There is no API-key or bearer-token mode in the MVP — this API is not intended for third-party integration.
- **Dates:** ISO 8601 strings in requests and responses (e.g., `"2026-06-30T00:00:00.000Z"`), BSON `Date` internally.
- **IDs:** MongoDB `ObjectId`s are always serialized as 24-character hex strings.

## 2. Standard Error Format

Every error response, regardless of endpoint, uses the same envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "details": { "field": "title" }
  }
}
```

| HTTP Status | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body/query failed Zod validation. |
| 401 | `UNAUTHENTICATED` | No valid session cookie present. |
| 403 | `FORBIDDEN` | Authenticated but not permitted (reserved for future multi-role use). |
| 404 | `NOT_FOUND` | Resource (artwork, tag) does not exist. |
| 409 | `CONFLICT` | Uniqueness violation (e.g., duplicate tag name). |
| 423 | `LOCKED` | Admin account is temporarily locked after repeated failed logins. |
| 500 | `INTERNAL_ERROR` | Unexpected server-side failure. |
| 503 | `SERVICE_UNAVAILABLE` | A dependency (MongoDB Atlas, Cloudinary) is unreachable. |

## 3. Pagination Format

List endpoints that support pagination (`GET /api/artworks`) share one shape:

**Request:** `?cursor=<opaque-string>&limit=24`
**Response:**
```json
{
  "items": [ /* ... */ ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA3LTAxVDA5OjEyOjQ0LjAwMFoiLCJfaWQiOiI2NmExZjJiM2M0ZDVlNmY3YThiOWMwZDEifQ==",
  "hasMore": true
}
```

`nextCursor` is a base64-encoded `{ sortValue, _id }` pair, where `sortValue` is the ISO string of the sort field (`completionDate` for the default "recent" and "oldest" modes). It is opaque by contract: clients pass it back verbatim and must not construct or parse it themselves. `nextCursor` is `null` and `hasMore` is `false` on the last page.

Spec correction: an earlier draft described this payload as `{ createdAt, _id }`; the actual encoded field is the active sort value, defaulting to `completionDate`, so the accurate description is `{ sortValue, _id }`.

---

## 4. Public Endpoints

### 4.1 `GET /api/artworks`

**Purpose:** the primary gallery feed — list artwork with filtering, sorting, and cursor pagination.
**Auth:** none.

**Query Parameters**

| Param | Type | Notes |
|---|---|---|
| `tags` | `string` (comma-separated tag slugs) | Multiple tags = AND match (artwork must have all listed tags). |
| `year` | `number` | Filters by `completionDate` year. |
| `medium` | `string` | Exact match against `medium`. |
| `type` | `"personal" \| "commission"` | |
| `nsfw` | `"include" \| "exclude"` | Default `"exclude"` — the API itself defaults to SFW-safe, matching `01-Product-Definition.md`'s SFW-default requirement; the client always sends this explicitly based on the visitor's local toggle rather than relying on the default in practice. |
| `sort` | `"recent" \| "oldest"` | Default `"recent"` (by `completionDate`, tie-broken by `_id`). |
| `cursor` | `string` | Opaque, from a previous response. |
| `limit` | `number` | Default `24`, max `60`. |

**Response `200`**
```json
{
  "items": [
    {
      "id": "66a1f2b3c4d5e6f7a8b9c0d1",
      "slug": "moth-study-in-blue",
      "title": "Moth Study in Blue",
      "medium": "Gouache on paper",
      "type": "personal",
      "nsfw": false,
      "completionDate": "2026-06-30T00:00:00.000Z",
      "coverImage": {
        "publicId": "bushart/artworks/moth-study-in-blue/main",
        "width": 3200,
        "height": 4000
      },
      "tagSlugs": ["gouache", "insects"]
    }
  ],
  "nextCursor": "eyJjcmVhdGVkQXQiOiIuLi4ifQ==",
  "hasMore": true
}
```

Note: the list response intentionally omits `description`, the full `images[]` array, and `timelapse` — those are fetched only when an artwork is opened (`GET /api/artworks/:slug`), keeping the feed payload lean for infinite scroll.

**Errors:** `400 VALIDATION_ERROR` (malformed `cursor`, out-of-range `limit`, invalid `type`/`sort` value).

---

### 4.2 `GET /api/artworks/:slug`

**Purpose:** full detail for a single artwork (the popup / fullscreen source of truth).
**Auth:** none.

**Response `200`**
```json
{
  "id": "66a1f2b3c4d5e6f7a8b9c0d1",
  "slug": "moth-study-in-blue",
  "title": "Moth Study in Blue",
  "description": "A restrained gouache study exploring wing symmetry.",
  "medium": "Gouache on paper",
  "type": "personal",
  "nsfw": false,
  "completionDate": "2026-06-30T00:00:00.000Z",
  "images": [
    { "publicId": "bushart/artworks/moth-study-in-blue/main", "width": 3200, "height": 4000, "order": 0 },
    { "publicId": "bushart/artworks/moth-study-in-blue/detail-1", "width": 3200, "height": 2400, "order": 1 }
  ],
  "timelapse": {
    "publicId": "bushart/artworks/moth-study-in-blue/timelapse",
    "durationSeconds": 47,
    "width": 1920,
    "height": 1080
  },
  "tags": [
    { "id": "66a1e0a0c4d5e6f7a8b9c0aa", "name": "Gouache", "slug": "gouache" },
    { "id": "66a1e0a0c4d5e6f7a8b9c0ab", "name": "Insects", "slug": "insects" }
  ]
}
```

**Errors:** `404 NOT_FOUND` if the slug doesn't exist, or if it exists but is `nsfw: true` and the request explicitly signals SFW-only context — see implementation note below.

> **Implementation note:** unlike the list endpoint, the detail endpoint does not silently filter NSFW content, since a direct/shared link should resolve deterministically. NSFW gating for direct links happens in the **UI** (an interstitial confirmation before rendering NSFW media to a visitor whose local toggle is set to SFW), not by the API returning 404 for content that legitimately exists. This keeps sharing behavior predictable.

---

### 4.3 `GET /api/artworks/:slug/download`

**Purpose:** download the original-quality file for a specific asset belonging to an artwork.
**Auth:** none (downloads are a public feature per `01-Product-Definition.md`).

**Query Parameters**

| Param | Type | Notes |
|---|---|---|
| `image` | `number` | Index into the artwork's `images[]` array. Defaults to `0` (the primary image) if omitted. |
| `asset` | `"image" \| "timelapse"` | Defaults to `"image"`. |

**Response:** `302 Found` redirect to a Cloudinary `fl_attachment` URL for the requested original asset. BushArt does not proxy the file bytes itself.

**Errors:** `404 NOT_FOUND` (artwork, or the requested image index/timelapse doesn't exist).

---

### 4.4 `GET /api/tags`

**Purpose:** the full master tag list, for filter UI and the admin tag picker.
**Auth:** none.

**Response `200`**
```json
{
  "items": [
    { "id": "66a1e0a0c4d5e6f7a8b9c0aa", "name": "Gouache", "slug": "gouache", "usageCount": 12 },
    { "id": "66a1e0a0c4d5e6f7a8b9c0ab", "name": "Insects", "slug": "insects", "usageCount": 4 }
  ]
}
```

No pagination — the tag list is expected to stay small (tens, not thousands, of entries) for a single artist's practice.

---

### 4.5 `GET /api/settings`

**Purpose:** public hero/homepage content.
**Auth:** none.

**Response `200`**
```json
{
  "artistName": "Bush",
  "tagline": "Digital Sketchbook & Gallery",
  "biography": "I make quiet, restrained work in gouache and digital media...",
  "profileImage": { "publicId": "bushart/site/profile", "width": 800, "height": 800 },
  "bannerImage": null,
  "socialLinks": [{ "platform": "Instagram", "url": "https://instagram.com/example" }],
  "contactEmail": "hello@example.com",
  "contactUrl": null
}
```

---

## 5. Authentication Endpoints

### 5.1 `POST /api/auth/login`

**Purpose:** authenticate the administrator and start a session.
**Auth:** none (this is how auth begins).

**Request**
```json
{ "username": "bush", "password": "••••••••" }
```

**Response `200`:** empty body; sets the `bushart_session` cookie (see `02-Technical-Specification.md` §4).

**Errors:**
- `400 VALIDATION_ERROR` — missing/malformed fields.
- `401 UNAUTHENTICATED` — wrong username or password. The response is intentionally identical whether the username or the password was wrong, to avoid leaking which one was incorrect.
- `423 LOCKED` — five or more recent failed attempts; response includes a `details.retryAfterSeconds` hint.

### 5.2 `POST /api/auth/logout`

**Purpose:** end the current session.
**Auth:** none required to call it (calling it with no session is a harmless no-op), but it only has an effect if a session cookie is present.
**Response `200`:** empty body; clears the `bushart_session` cookie.

### 5.3 `GET /api/auth/me`

**Purpose:** lets the client determine whether to render admin UI, on every page load.
**Auth:** reads the session cookie if present; does not require it.

**Response `200` (authenticated):**
```json
{ "id": "66a1d0a0c4d5e6f7a8b9c099", "username": "bush" }
```
**Response `200` (not authenticated):** `{ "authenticated": false }` — this endpoint deliberately returns `200`, not `401`, for the unauthenticated case, since "not logged in" is the expected default state for every visitor, not an error.

---

## 6. Upload Signature Endpoint

### 6.1 `POST /api/upload/signature`

**Purpose:** mint short-lived, scoped parameters that authorize the admin's browser to upload directly to Cloudinary, without the server ever handling the file bytes (`03-System-Architecture.md` §4).
**Auth:** admin session required.

**Request**
```json
{ "resourceType": "image", "folder": "bushart/artworks/moth-study-in-blue" }
```

**Response `200`**
```json
{
  "signature": "b7e4...c1",
  "timestamp": 1751500000,
  "apiKey": "142857396215",
  "cloudName": "bushart",
  "folder": "bushart/artworks/moth-study-in-blue"
}
```

The signature is computed server-side using `CLOUDINARY_API_SECRET`, which never leaves the server. The signature is valid only for the exact parameters it was generated for and expires per Cloudinary's own signature timestamp window.

**Errors:** `401 UNAUTHENTICATED`.

---

## 7. Admin — Artwork Management

### 7.1 `POST /api/artworks`

**Purpose:** create a new artwork record after media has already been uploaded to Cloudinary via §6.
**Auth:** admin session required.

**Request**
```json
{
  "title": "Moth Study in Blue",
  "description": "A restrained gouache study exploring wing symmetry.",
  "medium": "Gouache on paper",
  "type": "personal",
  "nsfw": false,
  "completionDate": "2026-06-30",
  "tagIds": ["66a1e0a0c4d5e6f7a8b9c0aa", "66a1e0a0c4d5e6f7a8b9c0ab"],
  "images": [
    { "publicId": "bushart/artworks/moth-study-in-blue/main", "url": "https://...", "width": 3200, "height": 4000, "order": 0 }
  ],
  "timelapse": null
}
```

**Response `201`:** the full created artwork, in the same shape as §4.2.

**Validation:** enforced via Zod against the rules in `04-Database-Schema.md` §3 — at least one image, valid `type` enum, well-formed `tagIds` that must each reference an existing tag (an unknown tag id is rejected with `400`, not silently dropped — the artist should never end up with a tag reference that quietly vanished). On success, `tags.usageCount` is incremented for every referenced tag in the same logical operation.

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`.

### 7.2 `PATCH /api/artworks/:id`

**Purpose:** edit an existing artwork — including toggling `featured`/`featuredOrder`, which intentionally has no separate endpoint (see `12-Decision-Log.md` for why a dedicated `/feature` route was considered and rejected as unnecessary surface area).
**Auth:** admin session required.

**Request:** any subset of the creatable fields from §7.1 (partial update).

**Response `200`:** the full updated artwork.

**Validation:** identical field-level rules to §7.1, applied only to fields present in the request. If `tagIds` is included, tag `usageCount` values are reconciled (decremented for removed tags, incremented for newly added ones) in the same operation.

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `404 NOT_FOUND`.

### 7.3 `DELETE /api/artworks/:id`

**Purpose:** permanently remove an artwork.
**Auth:** admin session required.

**Behavior:** deletes the MongoDB document, decrements `usageCount` on every referenced tag, and issues Cloudinary `destroy` calls for every associated image and the timelapse (if present) so orphaned media doesn't silently consume the Cloudinary storage quota (`02-Technical-Specification.md` §11).

**Response `200`:** `{ "deleted": true, "id": "66a1f2b3c4d5e6f7a8b9c0d1" }`

**Errors:** `401 UNAUTHENTICATED`, `404 NOT_FOUND`.

---

## 8. Admin — Tag Management

### 8.1 `POST /api/tags`

**Purpose:** create a new tag (usable both from a dedicated tag-management view and inline during upload, per `01-Product-Definition.md`).
**Auth:** admin session required.

**Request:** `{ "name": "Gouache" }`
**Response `201`:** `{ "id": "...", "name": "Gouache", "slug": "gouache", "usageCount": 0, "createdAt": "..." }`
**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `409 CONFLICT` (case-insensitive duplicate name).

### 8.2 `DELETE /api/tags/:id`

**Purpose:** remove a tag from the master list.
**Auth:** admin session required.

**Behavior:** cascades — pulls the tag id from every artwork's `tagIds` array, then deletes the tag document (`04-Database-Schema.md` §4). No confirmation step exists at the API layer; the admin UI is responsible for confirming destructive intent before calling this.

**Response `200`:** `{ "deleted": true, "id": "..." }`
**Errors:** `401 UNAUTHENTICATED`, `404 NOT_FOUND`.

---

## 9. Admin — Site Settings

### 9.1 `PATCH /api/settings`

**Purpose:** update any part of the homepage hero content.
**Auth:** admin session required.

**Request:** any subset of the fields in `04-Database-Schema.md` §6 (partial update against the singleton document).

**Response `200`:** the full updated settings object, in the same shape as §4.5 plus `contactEmail`/`contactUrl` (private-safe fields are the same ones already public — `site_settings` has no field that is admin-only to *read*, only to *write*).

**Errors:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`.

---

## 10. Endpoint Summary Table

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/artworks` | Public | Paginated, filterable gallery feed |
| GET | `/api/artworks/:slug` | Public | Full artwork detail |
| GET | `/api/artworks/:slug/download` | Public | Redirect to original-quality download |
| GET | `/api/tags` | Public | Master tag list |
| GET | `/api/settings` | Public | Homepage hero content |
| POST | `/api/auth/login` | Public | Start admin session |
| POST | `/api/auth/logout` | Public | End admin session |
| GET | `/api/auth/me` | Public (reads session) | Current session identity, if any |
| POST | `/api/upload/signature` | Admin | Mint a signed direct-upload authorization |
| POST | `/api/artworks` | Admin | Create artwork |
| PATCH | `/api/artworks/:id` | Admin | Edit artwork (incl. featured status) |
| DELETE | `/api/artworks/:id` | Admin | Delete artwork + its media |
| POST | `/api/tags` | Admin | Create tag |
| DELETE | `/api/tags/:id` | Admin | Delete tag (cascading) |
| PATCH | `/api/settings` | Admin | Edit homepage hero content |

## 11. Versioning Policy

Because this API has exactly one consumer (BushArt's own frontend, deployed as one unit with the API), strict semantic versioning is unnecessary — frontend and backend always ship together. The versioning discipline that *does* apply: additive changes (new optional fields, new endpoints) are preferred over breaking ones (removed/renamed fields, changed types), so that historical API documentation snapshots (e.g., in Git history) remain a reliable record of what a given deployed commit actually did.
