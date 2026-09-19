# Changelog

## 2026-09-19 — PDF Tables Follow the Editor's Table Styling

### Changes

**Rich-text tables in generated PDFs (`pdfGenerator.js`)**
- The PDF used its own table look (6px cell padding, forced 14px cell font, plain grey `#f2f4f7` header) and had no Table Style gallery at all, so a table never printed the way it looked in the editor. Editor tables (identified by their `data-table-style` attribute, so attendance/invitee tables are untouched) now use the editor's rules from `globals.css`: `4px 8px` cell padding, the theme-tinted header row (default maroon theme, variables resolved for white paper), and the **grid-blue / bands-gray / crimson-header** styles including their banded rows.
- The forced inline `padding` / `font-size` / header `background-color` / `font-weight` on `<th>` / `<td>` were removed, so a cell's own pasted styling (background, alignment) is what prints.
- Column widths are unchanged: the editor's per-column `colwidth`s already print as proportions of the page width.
- Bumped `PDF_TEMPLATE_VERSION` to `v59` so cached PDFs regenerate.

Known limit: the PDF always uses the default maroon theme colours, whichever theme the editor is showing.

---

## 2026-09-19 — Bijoy → Unicode Converter Fixes (Word Paste)

### Bug Fixes

Found by pasting a real SutonnyMJ Word document (agenda + tables) into the editor. Fixes are in `frontend/lib/bijoyToUnicode.ts`; regression tests in `frontend/lib/bijoyToUnicode.test.ts` use strings from that document.

- **Words split across Word runs** — Word cuts one Bijoy word into several runs (`Uvg`|`©`, `‡`|`gvU`, `me©‡`|`kl`, `wkÿv_x`|`©`) and paste converted each text node alone, stranding pre-base vowels and reph (`মোট` came out as `েমাট`, `টার্ম` lost its `র্`). `convertHtmlBijoyToUnicode` now joins a word that continues across adjacent runs before converting it. Breaks at `<br>`, blocks and table cells are respected, and whitespace-only runs are kept in place.
- **Runs without a font** — a fontless run is judged on its own, as in a plain paste, so a standalone English run (`one`, `grade`) stays English. It is treated as Bijoy only when it touches a Bijoy run with no space between (the same word split by Word).
- **Reph after a vowel sign or conjunct** — `wkÿv_x©` gave `শিক্ষাথীর্`, `KZ…©K` gave `কতৃর্ক`, `cv‡k¦©` gave `পাশ্বের্`. Reph is now moved in front of the trailing vowel sign / conjunct suffix before conversion (`শিক্ষার্থী`, `কর্তৃক`, `পার্শ্বে`). A doubled reph (`Uvg©©`) is collapsed.
- **`ø`** is the ল-ফলা conjunct: `Dwjø…` now gives `উল্লিখিত` (the package produced `উলিস্ন…`).
- **Embedded English** — `Forwarded`, `Add/Drop`, `Thesis-G` (→ `Thesis-এ`) inside Bijoy text used to become gibberish (`ঋড়ৎধিৎফবফ`). English words are detected (vowel density, mid-word capitals, `v` after a consonant, acronyms) and kept, backed by explicit lists for what patterns can't catch: short words (`term`, `faculty`, `Withdraw`), dotted abbreviations kept only with their full stop (`Dept.`, `Dr.`, `No.`, `Arch.`), and uppercase codes (`VC`, `DVC`, `ME`, `ChE`). Department, faculty, institute and officer names from `db/init.sql` are covered; a standalone `&` stays an ampersand. **Force convert** still converts everything (`keepEnglish: false`).
- **English digits are kept as typed** — `2106007`, `2025`, `8.5`, `17-07-2026` are no longer turned into Bangla digits; the Bijoy letters around them still convert (`5wU` → `5টি`).

Known limits: very short English words (`one`, `X grade`) are indistinguishable from Bijoy and are still converted; a bold/italic word split from its neighbour can lose that formatting on the joined fragment.

---

## 2026-09-19 — Council Name in PDF Headings, Font Size Box & Editor Tweaks

### Changes

**Council name in every agenda / resolution heading (`pdfGenerator.js`, `pdf-preview/page.tsx`)**
- The regular-meeting sub-title used to read `…তারিখে অনুষ্ঠিতব্য ৪৬০তম সভার আলোচ্যসূচী` with no council. It now names the body: `…অনুষ্ঠিতব্য একাডেমিক কাউন্সিলের ৪৬০তম সভার আলোচ্যসূচী` (or `সিন্ডিকেটের` for syndicate meetings, chosen from `meeting.type`). The supplementary and immediate headings already named the council. A custom meeting title that already contains "কাউন্সিল"/"সিন্ডিকেট" is left as-is so the name is never doubled.
- Bumped `PDF_TEMPLATE_VERSION` to `v58` so every cached PDF regenerates once. The first attempt at this change did not bump it, so meetings with an existing cached PDF kept the old heading.
- `meeting.type` is now part of the PDF cache fingerprint (the heading depends on it), so switching a meeting between academic and syndicate refreshes its cached PDF. Archived agenda snapshots are stored separately and are unchanged.

**Editor ribbon (`RichTextEditor.tsx`, `globals.css`)**
- **Font size box**: the size control is now a preset dropdown plus a typeable box (`FontSizeControl`), accepting any px value (e.g. `13`, `9.5`). It commits once the number is complete and never steals focus, like the line-spacing box. Clicking text shows its size in the box — the explicit size if set, otherwise the size actually rendered at the cursor.
- **Placeholders**: the font and size dropdowns show `Text font` / `Font size` (via the `CustomSelect` `placeholder` prop) when the current value matches no option, instead of "Select option...".
- **Fullscreen**: in fullscreen the ribbon groups stretch to fill the full width (`.ribbon-fullscreen .word-group-box { flex: 1 1 auto }`).
- **No Bijoy font**: the "Bangla (Bijoy Sutonny)" option was removed from the font dropdown so text is always Unicode. The Bijoy→Unicode converters are unchanged; documents saved earlier with a SutonnyMJ font mark keep it until converted.

---

## 2026-09-15 — Rich-Text Table Sizing Fix in Generated PDFs

### Bug Fixes

**Rich-text tables losing their sizing/layout in the PDF (`pdfGenerator.js` → `styleRichTextHtml` → `injectStyle`)**
- Every table coming out of the editor carries a `data-table-style` attribute (default `"none"`). The helper that injects the table's sizing CSS (`table-layout: fixed`, `width`, colgroup honoring, etc.) found an existing `style="..."` attribute to merge into with the regex `/style="([^"]*)"/i` — which, having no word boundary, also matched inside `data-table-style="none"`. The sizing CSS was silently spliced into `data-table-style` instead of a real `style` attribute, which was never added at all.
- Result: every rich-text table in every generated PDF rendered with `table-layout: auto` instead of `fixed`, so the browser ignored authored/resized column widths and sized columns from content instead — breaking table proportions and forcing ugly mid-word wraps in both Bangla and English text. It also broke the Table Style Gallery presets (Blue Grid/Gray Bands/Crimson Header), since their CSS selectors match `data-table-style="grid-blue"` etc. exactly, which was now corrupted.
- Fixed by requiring `style=` to be preceded by whitespace before treating it as a real attribute.

---

## 2026-09-12 — Manual Table Width Choice & Word-Paste Table Fix

### New Features

**Per-table width choice (`RichTextEditor.tsx`, `globals.css`, `pdfGenerator.js`)**
- The Table ribbon now exposes **Stretch to Page** / **Original Size**, stored as the `data-width-mode` table attribute (`full` default, `auto`). `full` keeps the previous always-stretch-to-page behavior; `auto` keeps the table at its authored width (sum of its column widths) so a small table no longer balloons to the full page width. Honored identically in the editor CSS and the PDF renderer.

### Bug Fixes

**Word paste destroying tables and mangling text (`RichTextEditor.tsx` → `handlePaste`, `transformPastedHTML`)**
- The Bijoy→Unicode auto-convert heuristic used to run against the flattened plain-text half of every paste regardless of source. Pasting a table (or any rich content) from Word could get the *entire* selection replaced with one converted plain-text node — discarding all `<table>`/`<tr>`/`<td>` structure, and, since different cells' text got concatenated into one blob, sometimes breaking apart Bengali juktakkhor (conjunct) sequences that need to stay adjacent to reassemble correctly, or false-positive-converting ordinary English into Bangla-looking gibberish.
- `handlePaste` now bails out (`return false`) whenever the clipboard carries `text/html` — true for any real rich paste — so table structure goes through TipTap's normal HTML→schema parsing untouched. Bijoy conversion for rich pastes now runs via `transformPastedHTML` → `convertHtmlBijoyToUnicode`, which walks the parsed HTML node-by-node and only converts individual text nodes that match the heuristic, so one cell's content can no longer contaminate another's.

---

## 2026-09-10 — Print Each Resolution on Separate Page Option

### New Features

**Separate-page resolution PDF generation (`MaterialsView.tsx`, `pdfGenerator.js`, `meetingController.js`, `pdf-preview/page.tsx`)**
- Added an option in **Meeting Materials** (`MaterialsView.tsx`) to generate and download the Resolution PDF with each resolution printed on a separate page via the **PDF (Separate Page per Resolution)** button.
- Added `separatePages` layout override parameter in `pdfGenerator.js` (`DEFAULT_PDF_LAYOUT`, `normalizePdfLayout`, `buildMeetingHtml`).
- When `separatePages` is active for resolution documents, each resolution item (and its category header, if present) is rendered with `page-break-before: always; break-before: page;` so Page 1 retains the cover header, description, and attendance list, and each resolution begins on its own sheet.
- Integrated the `separatePages` toggle into the interactive **PDF Preview** route (`/workspace/meetings/[id]/pdf-preview`) for live paper preview and download.
- Bumped `PDF_TEMPLATE_VERSION` to `v57` for clean cache isolation.

---

## 2026-09-09 — বিবিধ Numbering, Immediate Syndicate Meetings & Full-Width PDF Tables

### Changes

**বিবিধ labelled with its serial everywhere (`pdfGenerator.js`, `frontend/app/workspace/meetings/[id]/pdf-preview/page.tsx`, `AgendaView.tsx`, `ResolutionView.tsx`, `frontend/app/meetings/[id]/page.tsx`)**
- The বিবিধ ("miscellaneous") item is now labelled `বিবিধ : <serial>` — the serial it would take, `mainAgendaCount + 1` — in every view and every generated document: agenda, resolution, resolution-status, and both on-screen previews. The resolution documents previously printed a bare `বিবিধ :`.
- An empty বিবিধ (no imported আলোচ্যসূচি text and no recorded সিদ্ধান্ত) still appears **only in the agenda PDF**; it stays omitted from the resolution and resolution-status documents.
- The বিবিধ-title stripping regex was narrowed to `বিবিধ [separator] [digits]` across the frontend and `pdfGenerator.js`, so a word that merely follows "বিবিধ" is never eaten.

**Duplicate বিবিধ rows prevented (`agendaController.js` → `ensureBibidhaAgenda`, `db/migrations/2026_09_dedupe_bibidha_agenda.sql`)**
- `ensureBibidhaAgenda()` runs on every `GET /agendas`. Two concurrent requests could both see "no বিবিধ row" and both `INSERT` one (there is no unique constraint), leaving a meeting with a duplicated `বিবিধ :` item. The check-and-insert is now serialised on a per-meeting, transaction-scoped `pg_advisory_xact_lock`, and any duplicates an earlier race produced are cleaned up on load.
- One-off migration deletes existing duplicate বিবিধ rows, keeping the earliest-created one per meeting.

**Immediate syndicate meetings (`meetingController.js`, `frontend/app/workspace/meetings/page.tsx`, `MeetingInfoView.tsx`, `NoticeView.tsx`, `pdfGenerator.js`)**
- Syndicate meetings can now be **Regular or Immediate**. `createMeeting` / `updateMeeting` no longer force `is_regular = true` for `type === 'syndicate'`, and the meeting-type selectors in the manage-meetings form and `MeetingInfoView` expose both options.
- Notice prefill: Immediate meetings (academic **and** syndicate) share one body wording that differs only by council name (`সিন্ডিকেটের` vs `একাডেমিক কাউন্সিলের`); Immediate meetings still have no invitation notice.

**Full-width rich-text tables in PDFs (`pdfGenerator.js` → `styleRichTextHtml`)**
- Every rich-text table is laid out at `width: 100%; max-width: 100%; table-layout: fixed; min-width: 0`, so a table drawn wider than the page in the editor can no longer be clipped at the right page edge. Author column widths are preserved as *proportions* (emitted as percentages of their sum); `min-width: 0` clears any `min-width` prosemirror-tables writes onto the table.
- `page-break-inside: auto` lets a tall table flow onto the next page.

---

## 2026-09-06 — PDF Preview, Colourful Themes, Archived Agenda & Markdown Table Fix

### New Features

**Interactive PDF Preview page (`frontend/app/workspace/meetings/[id]/pdf-preview/page.tsx`, `pdfGenerator.js`, `meetingController.js`)**
- New full-bleed route under the meeting workspace (linked from the Materials tab) that renders the agenda / supplementary agenda / resolution / resolution-status document with a live paper preview.
- **Per-request page-layout overrides**: page size (A3/A4/A5/Letter/Legal/Tabloid), orientation, individual margins (mm), whole-document scale (0.7–1.6×), optional global line-height, and an `inline` vs `heading` agenda-number style. All values are validated and clamped server-side in `normalizePdfLayout()`.
- Custom layouts get their own PDF cache slot and fingerprint dimension, so they never overwrite the canonical default-layout PDF used by email attachments and status sync. Only the default-layout PDF is mirrored to the meeting filesystem.
- Inline cell editing of agenda content / resolution / description / conclusion directly from the preview, gated by the same `meetingAccess` permission helpers as the main workspace.

**Colourful themes (`globals.css`, `ThemeProvider.tsx`, `ThemeToggle.tsx`)**
- Added 3 vibrant two-hue themes aimed at an educational-office setting: **Teal Horizon** (teal `#0d9488` + coral), **Indigo Scholar** (indigo `#4f46e5` + gold), **Emerald Meadow** (emerald `#059669` + sky blue). Theme count is now 13.
- Theme picker list is capped at `60vh` with `overflow-y-auto` so every theme (including the last, Midnight Dark) stays reachable; the scrollbar is themed via the existing global `::-webkit-scrollbar` rules.

**Archived Agenda view (`frontend/components/meetings/ArchivedAgendaView.tsx`)**
- New `archived-agenda` workspace view + sidebar nav entry (Archive icon) for browsing, restoring, and deleting archived agenda snapshots without opening the modal.

**Editor `Ctrl`/`Cmd`+`S` save hook (`RichTextEditor.tsx`)**
- `RichTextEditor` accepts an `onSave` callback, fired on `Ctrl`/`Cmd`+`S` from anywhere in the editing panel (content area, toolbar, or a nearby field) via a window-level listener, without re-instantiating the editor.

### Bug Fixes

**Markdown tables not converting in PDFs (`pdfGenerator.js` → `convertMarkdownTablesToHtml`)**
- A header pre-processing loop exploded every multi-column header row into separate one-cell lines, leaking the first cell out as a stray paragraph and dropping the rest of the header — so a normal `| Name | Role |` table rendered as broken. Removed the loop.
- Detection hardened: entity-encoded pipes (`&#124;`, `&vert;`), non-breaking / exotic spaces, autocorrected en/em-dash separator rows, and single-dash separators (`| - | - |`) now parse. Prose containing a stray `|` still stays prose.
- Generated tables now carry self-contained cell borders + `word-wrap` (the agenda stylesheet's `th, td { border: none }` was leaving them gridless).

---

## 2026-09-06 — Word-Style Page Layout Tab, Table Design Tools & Editor Fixes

### New Features

**Page Layout Ribbon Tab (RichTextEditor.tsx, globals.css)**
- **Page Setup**: Margins (Normal/Narrow/Moderate/Wide presets + custom mm inputs), Orientation (Portrait/Landscape), Size (A4/Letter/Legal/A3) — the "Word A4 Page" view now reflects these settings live (dimensions, padding, ruler).
- **Columns & Breaks**: two/three-column layout insert, Page Break, Column Break, consolidated into dropdowns.
- **Page Background**: Watermark (custom text/color/opacity, diagonal overlay), Page Color, Page Borders (style/width/color) applied to the printable page surface.

**Table Design Tools (RichTextEditor.tsx, globals.css)**
- **Cell Shading**: background color picker for selected table cells.
- **Vertical Alignment**: Top/Middle/Bottom text alignment within table cells.
- **Table Style Gallery**: four built-in presets (Plain, Blue Grid, Gray Bands, Crimson Header) applying header/banded-row coloring via a new `data-table-style` table attribute.
- **Table Alignment**: Left/Center/Right positioning of a (resized) table on the page via a new `data-align` table attribute.

**Always-Visible Shortcuts Button**
- Added a persistent "Shortcuts" button next to Find/Full Screen in the ribbon header (previously the keyboard-shortcuts guide was only reachable via Ctrl+/ or a button buried in the Home tab's Editing group, which could scroll out of view).

### Bug Fixes

**Ribbon dropdown clipping (globals.css, RichTextEditor.tsx)**
- The ribbon toolbar's `overflow-x-auto` was — per the CSS overflow-x/overflow-y coupling rule — silently forcing `overflow-y: auto` too, clipping any dropdown/popover (Shading, Highlight, Table Borders, and all of the new Page Layout popovers) that needed more vertical space than the ribbon's own height. Fixed by introducing a portal-based `LayoutPopover` component that renders outside the clipped ancestor via `document.body` with `position: fixed`.

**Table cell style clobbering (RichTextEditor.tsx)**
- Row Height, Cell Shading, and Vertical Alignment all wrote to the same cell `style` attribute wholesale, so applying one silently erased the others. Introduced a `mergeCellStyle` helper that parses, patches, and re-serializes the existing declaration list so each control only touches its own CSS property.

---

## 2026-09-03 — Dynamic List Ribbon Controls, Navigation & Multi-Theme System

### New Features

**Dynamic Single List Ribbon Control (RichTextEditor.tsx)**
- Replaced separate English (`1, 2, 3`) and Bangla (`১, ২, ৩`) list buttons with a **single dynamic toggle button**.
- Icon/prefix automatically updates to match whichever style is selected in the list dropdown (`•`, `◦`, `▪`, `1.`, `১.`, `I.`, `a.`).
- Clicking the single button toggles that exact list style on/off in the document editor.

**Multi-Theme Color System (globals.css & ThemeToggle.tsx)**
- Added 4 complete application themes:
  - 🍷 **BUET Maroon** (`maroon`): Classic Maroon (`#800000`) & cream theme.
  - 🌊 **Ocean Blue** (`blue`): White & Blue theme featuring Royal Blue (`#2563eb`).
  - 🖤 **Monochrome** (`monochrome`): White & Black minimalist theme (`#09090b`).
  - 🌙 **Midnight Dark** (`dark`): Dark mode with deep crimson highlights (`#c45c5c`).
- Built an interactive multi-theme switcher in `ThemeToggle.tsx` with live color dots, theme badges, and real-time switching.
- Updated table headers and container borders to adapt dynamically using `color-mix` CSS variables.

**Public Meeting View Navigation**
- Updated the "View" (eye icon) action on meeting tables in `ManageMeetingsPage` to open `/meetings/[id]` (public view) directly without the administrative `/workspace/` prefix.

**Administrative UI Cleanup**
- Removed redundant "Archive Agenda Lock Level" setting from `MeetingPermissionsView.tsx`.

---

## 2026-09-02 — Resolution Status & Archive Features

### New Features

**Resolution Status Section (ResolutionView.tsx)**
- Added execution status tracking for past meetings with resolution text:
  - Radio buttons: "Not Executed" (default) / "Executed" — toggles `is_executed` via `PUT /api/agendas/resolutions/:resId/execution`
  - Checkbox: "Submit to Next Meeting" — copies agenda to archive (`is_archived=true`) and sets `is_submitted_for_next_meeting=true` on original
  - Custom status: Rich text editor for detailed execution notes, saved to `execution_status`

**Archive for Next Meeting**
- New `is_submitted_for_next_meeting` column on `agenda` table (`db/migrations/2026_09_add_is_submitted_for_next_meeting.sql`)
- Backend endpoint `PUT /api/agendas/:id/copy-to-archive` — creates a copy of the agenda in archive (`agendaController.copyToArchive`)
- Backend endpoint `PUT /api/agendas/:id/remove-from-archive` — deletes archived copy and unsets `is_submitted_for_next_meeting` (`agendaController.removeFromArchive`)
- Archiving does NOT change agenda serial numbers (removed `reindexAgendas` and `ensureBibidhaAgenda` from `archiveAgendam`)
- `ensureBibidhaAgenda` now filters out archived copies to prevent serial renumbering

**Resolution Status PDF**
- Bengali status text in resolution-status PDF: executed → বাস্তবায়িত, not executed → অবাস্তবায়িত, submitted → পরবর্তী মিটিং এ উপস্থাপন এর জন্য আবেদন করা হল
- PDF template version bumped from `v49` to `v50`

### API Endpoints Added
| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/api/agendas/:id/copy-to-archive` | Copy agenda to archive for next meeting |
| `PUT` | `/api/agendas/:id/remove-from-archive` | Remove archived copy and unset submitted flag |

### Database Changes
- New column: `agenda.is_submitted_for_next_meeting BOOLEAN DEFAULT false`

---

## 2026-07-16 — Session Summary

A large batch of features, security fixes, and infrastructure hardening across `frontend`, `meeting_service`, `auth_service`, `nginx`, and `db`.

---

### New Features

**Audit log ("who did what")**
- New `audit_logs` table (`db/init.sql`), written by both services (they share one database):
  - `meeting_service/middlewares/auditMiddleware.js` — generic logger mounted on `meetingRoutes.js` and `agendaRoutes.js`; records every mutating (POST/PUT/DELETE) request with user, action, entity type/id, IP.
  - `auth_service/auditLog.js` — explicit logging on signup, signin (success **and** failed attempts), signout, signout-all, user updates, CSV bulk import, and self profile updates.
- Admin-only API: `GET /api/audit-logs` (`meeting_service/controllers/auditLogController.js`, `routes/auditLogRoutes.js`) with filters for **username, action, entity type, and date range**, paginated.
- Admin-only page: `frontend/app/admin/audit-log/page.tsx` — filterable table, linked from the sidebar (admin-only, both frontend nav gating and backend `requireRole('admin')`).
- **Weekly archives**: `meeting_service/utils/auditArchiver.js` exports each completed ISO week's logs to `audit-log-archives/<YYYY-Www>.json` in object storage; idempotent (skips weeks already archived, skips empty weeks). Listed/downloadable from the audit-log page via `GET /api/audit-logs/archives`.
  - Runs inside `meeting_service/index.js`'s own always-on process — **not** the optional `embedding_worker` (an earlier bug had it coupled there, silently disabling it whenever the `embeddings` Compose profile was off; fixed since audit logging has nothing to do with embeddings).

**Bulk JSON meeting import**
- `frontend/components/meetings/JsonImportDialog.tsx` rewritten to accept **multiple files at once** (previously: paste-only, then single-file-upload-only).
- Each file is parsed and checked independently against existing departments/offices; mapping or creating a department/office **propagates across every file in the batch** that references the same name, so you resolve each one once, not per-file.
- Per-file status tracking (Needs attention → Ready → Importing → Imported/Failed) with a final summary; partial failures don't block the rest of the batch.

**Viewer role gets a real read-only area**
- New routes `frontend/app/viewer/meetings/page.tsx` and `.../[id]/page.tsx` (thin re-exports of the existing public, already-read-only `/` and `/meetings/[id]` pages — no duplicated logic).
- `AdminLayoutWrapper.tsx` redirects `role === 'viewer'` to `/viewer/meetings` instead of letting them into `/admin/*` with hidden buttons.
- Login now redirects **by role** instead of always to `/`: viewers land on `/viewer/meetings`, admins/moderators land on `/admin/meetings` (`app/login/page.tsx`, reading `role` straight from the signin response).
- "Dashboard" link in `UserDropdown.tsx` is role-aware to match.

**`/admin/meetings` gained Academic/Syndicate tabs**
- Same tabbed filtering as the public `/` dashboard, added to the existing admin meetings management table (`app/admin/meetings/page.tsx`) rather than a new/duplicate page — so the Add/Edit/Delete/JSON-import tooling admins and moderators already use is unchanged, it's just tab-filterable now.

**Collapsible presentee list**
- `frontend/app/meetings/[id]/page.tsx` — "উপস্থিত সদস্যবৃন্দ" (present members) is now collapsed by default with a chevron toggle, instead of always rendering.

**Collapsible left navigation + non-blocking overlay**
- Left sidebar (`components/Sidebar.tsx`, the meeting-workspace step nav, and `profile/layout.tsx`) is **hidden by default at every screen size**, toggled by a persistent hamburger button (`components/SidebarToggleButton.tsx`).
- The toggle button uses `position: fixed` (anchored to the viewport, not any particular scrolling element) so it never scrolls away regardless of what actually scrolls on the page, and sits above the sidebar's `z-50`, sliding to just past its edge when open — earlier versions had it trapped underneath the opened sidebar and unclickable.
- Opening the sidebar **no longer shows a dimming backdrop that blocks the rest of the page** — it overlays with a drop shadow, but everything beside/behind it stays fully clickable and scrollable.
- The toggle button (and the top `Header.tsx`) both dim to near-transparent once the page is scrolled, restoring full opacity on hover.
- Fixed a real bug found along the way: `Sidebar.tsx`'s active-link check used `pathname.startsWith(href + '/')`, which made "Profile" (`/profile`) light up as active on **any** `/profile/*` route, including `/profile/sessions`. Now prefers an exact match among the sidebar's own links before falling back to prefix-matching.

**Search box relocation and scoping**
- Moved out of the main navbar row into its own row directly underneath it, within the same sticky/dimming header block (`components/Header.tsx`).
- Hidden entirely on pages where it doesn't apply: `/admin/members`, `/admin/faculties`, `/admin/users`, `/admin/departments`, `/admin/offices`, `/admin/audit-log`, and `/profile*`. Still shown on `/`, `/admin/meetings`, meeting detail pages, and the viewer area.

---

### Security Fixes

**No CSRF protection on cookie-authenticated routes (flagged by GitHub code scanning)**
- Both `auth_service` and `meeting_service` authenticate via a `session_token` cookie but had no CSRF defense beyond the cookie's `sameSite: 'strict'` attribute, and their CORS config (`cors({ origin: true, credentials: true })`) reflected *any* request origin while allowing credentials — a real weakening of that protection.
- Added `auth_service/csrfMiddleware.js` and `meeting_service/middlewares/csrfMiddleware.js`: an Origin/Referer allowlist check (OWASP's recommended CSRF defense for cookie-authenticated JSON APIs) applied to every state-changing request (POST/PUT/DELETE/PATCH) in both services. GET/HEAD/OPTIONS are unaffected.
- Tightened CORS in both services from `origin: true` to the same allowlist (`ALLOWED_ORIGINS` env var, comma-separated, defaults to `http://localhost:9001` matching the nginx-fronted app URL).
- Verified: legitimate same-origin requests succeed (200/201), forged cross-origin requests are rejected (403), GET requests are unaffected.

**Public file storage was completely unauthenticated**
- `nginx/nginx.conf` used to proxy `/storage/` straight to MinIO — anyone with a file's URL (materials, annexures) could fetch it, no login required.
- Added an authenticated streaming route: `meeting_service/routes/storageRoutes.js` + `controllers/storageController.js` (gated by the existing `authMiddleware`), and repointed nginx at that instead of MinIO directly. MinIO's bucket ACL also set back to private (`docker-compose.yml`'s `createbuckets` step).

**Annexure uploads: unrestricted type/size**
- `meeting_service/config/annexureUpload.js` — single place defining an allowed-extension whitelist (currently PDF/DOCX, easy to add/remove) with matching MIME-type cross-check, and a configurable size cap (`MAX_ANNEXURE_SIZE_MB` env var). Wired into `agendaRoutes.js`'s multer config.
- Raised nginx's `client_max_body_size` (was the real, silent 1MB default bottleneck) and mapped `MulterError` to a clean 400 in `errorHandler.js` instead of a generic 500.

**Delete permissions were too broad**
- Whole-meeting delete is now **admin-only** (`meetingRoutes.js`, `MeetingInfoView.tsx`, admin meetings list).
- Agenda/resolution/annexure delete remain **admin + moderator** (unchanged from original behavior, confirmed intentional).

---

### Bug Fixes

- **Search triggered on every keystroke** instead of on Enter (`frontend/app/search/page.tsx`) — typing now only updates local state; the URL (and the actual search request) updates on submit. Tag/date/scope filters remain reactive.
- **Draft meetings were publicly visible** on the home dashboard (`frontend/app/page.tsx`) — now filtered out alongside the existing type filter.
- **Admin password seed didn't match documentation**: the bcrypt hash in `db/init.sql` didn't correspond to the password the README claimed (`buet_admin_pass`), so a fresh install's documented login would silently fail. Regenerated the hash to actually match; also updated to the project's current default (`123456`) per later request.
- **nginx cached upstream container IPs at startup** and never re-resolved — after any upstream (e.g. `frontend`) restarted with a new Docker-assigned IP, nginx kept hammering the dead old IP (502s) until nginx itself was restarted. Fixed with `resolver 127.0.0.11 valid=10s;` (Docker's embedded DNS) plus `set $upstream ...; proxy_pass $upstream;` in every location block, so nginx re-resolves per request.

---

### Infrastructure / DevOps

- **`embedding_service` / `embedding_worker` are now optional** (`docker-compose.yml`, Compose `profiles: ["embeddings"]`). `meeting_service` no longer hard-depends on `embedding_service` being healthy to start — every code path that calls it (`searchController.js`, `searchIndexer.js`) already degrades gracefully to keyword-only search if it's unreachable.
  - Lightweight (no ML model, much less CPU/RAM): `docker compose up -d`
  - Full stack with semantic search: `docker compose --profile embeddings up -d`
- **Database schema drift fix**: this environment's DB volume predated the search feature — missing `tags`, `agenda_chunks`, `resolution_chunks`, `search_cache` tables and `agenda.content_plain`/`resolution_plain`/`*_tsv` columns. Applied the missing DDL to bring it in line with `db/init.sql`; the existing self-healing background indexer (`utils/backgroundIndexer.js`) backfills old rows automatically once the schema exists — no manual data migration needed.
- Added `audit_logs` table + indexes to `db/init.sql` for fresh installs.

---

### Files Changed (non-exhaustive, by area)

**Frontend**: `app/page.tsx`, `app/login/page.tsx`, `app/search/page.tsx`, `app/meetings/[id]/page.tsx`, `app/admin/meetings/page.tsx`, `app/admin/audit-log/page.tsx` (new), `app/viewer/meetings/page.tsx` (new), `app/viewer/meetings/[id]/page.tsx` (new), `app/admin/meetings/[id]/layout.tsx`, `app/profile/layout.tsx`, `components/Header.tsx`, `components/Sidebar.tsx`, `components/SidebarToggleButton.tsx` (new), `components/AdminLayoutWrapper.tsx`, `components/UserDropdown.tsx`, `components/meetings/JsonImportDialog.tsx`, `components/meetings/MeetingInfoView.tsx`, `components/meetings/AgendaView.tsx`, `components/meetings/AnnexureList.tsx`.

**meeting_service**: `routes/storageRoutes.js` (new), `routes/auditLogRoutes.js` (new), `routes/meetingRoutes.js`, `routes/agendaRoutes.js`, `controllers/storageController.js` (new), `controllers/auditLogController.js` (new), `middlewares/auditMiddleware.js` (new), `middlewares/csrfMiddleware.js` (new), `middlewares/errorHandler.js`, `config/annexureUpload.js` (new), `utils/storageService.js`, `utils/auditArchiver.js` (new), `index.js`, `worker.js`.

**auth_service**: `auditLog.js` (new), `csrfMiddleware.js` (new), `routes.js`, `index.js`.

**Infra**: `nginx/nginx.conf`, `docker-compose.yml`, `db/init.sql`, `.env.example`.
