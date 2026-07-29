# Phishing / Malicious Link Triage Tool — Project Context

Internal CBM IT tool for techs to paste a suspicious link **or a full pasted
email** and get an evidence-backed verdict (`benign` / `suspicious` /
`malicious` / `insufficient_data`). Sibling project to the CBM Knowledge Base
tool (`../kb/`) in this same repo — reuses its visual design system and
Rewst-integration lessons, but is a separate app with its own Worker.

**This folder (`phishing-src/`) is SOURCE ONLY, not served.** It builds into
`../phishing/` (a sibling folder at the repo root, matching `kb/`'s pattern)
via `npm run build` — see `vite.config.js`'s `base`/`build.outDir`. GitHub
Pages serves the built output at
`https://chaswheatley26.github.io/cbm-knowledge-base/phishing/`, linked from
the root landing page (`../index.html`) as `href="phishing/"`, same-tab, same
card style as the KB tool's link. After editing anything under `src/`, rerun
`npm run build` and commit both `phishing-src/` (source) and `phishing/`
(build output) — this repo has no CI, matching how the rest of it works.

See `../../phishing-triage-tool-spec.md` (CBM IT Website root, one level
above this repo) for the original product spec — some of its details have
since been refined here; where they conflict, this file and the docs it
points to are current.

## Architecture

- Real Vite + React build (`npm install && npm run dev`), plain JS/JSX, no
  TypeScript. Unlike the KB tool, this is NOT a no-build CDN/Babel-in-browser
  single-file app — Vite compiles JSX natively, so there's no need for that
  project's `app-source.jsx` / `sync-app-source.ps1` workaround. Just edit
  files under `src/` directly.
- `lucide-react` is a normal npm dependency here (`import { X } from
  "lucide-react"`), not the KB tool's CDN UMD-global workaround — that
  workaround was specific to avoiding a build step, which doesn't apply here.
- All backend calls go through a Cloudflare Worker proxy
  (`cloudflare-worker.js`, deployed separately as `cbm-phishing-proxy`) —
  `src/lib/api.js` only ever talks to `PROXY_URL`, never to Rewst directly.

## Single-input design (decided 2026-07-29, before any code existed)

The frontend has **one textarea** (`SubmissionForm.jsx`) that accepts either
a bare URL or a full pasted email — not two separate modes. Techs receive
"is this safe?" tickets in an unpredictable shape (sometimes just a link,
sometimes a whole forwarded email), so the tool shouldn't force them to
pre-classify what they're pasting before submitting.

The classification (bare URL vs. email) and the resulting branch in
evidence-gathering happen **entirely in the Rewst `submit-url` workflow**,
not the frontend — see `docs/rewst-webhook-contracts.md` for the exact rule
and what each path does differently. The key point: when the input is an
email, Claude's verdict step reasons over BOTH per-URL enrichment AND raw
email-content phishing signals (sender/display-name mismatch, Reply-To
spoofing, urgency language) — link reputation alone misses signals that only
live in the email itself.

## Async result delivery + avoiding the KB tool's empty-trigger-body bug

Async-with-polling (spec's original decision, kept): `submit-url` can take
10-30+s (URLScan sandbox scan), so the frontend gets an immediate ack and
polls `check-status` — unlike the KB tool, which eliminated polling entirely
because all four of ITS calls are fast enough for a single synchronous
`wait_for_results:true` proxy call. That option isn't available for `submit`
here.

This matters because the KB tool's own history (see its CLAUDE.md
History #7/#11-13/#17) found Rewst's `wait_for_results:false` async-trigger
ack is unreliable — it can return completely empty with no `execution_id`,
even when the workflow demonstrably ran. A naive "submit and get a
request_id back" flow depends on exactly that unreliable mechanism.

**Fix used here:** `cloudflare-worker.js`'s `submit` action generates
`request_id` itself (`crypto.randomUUID()`) and never parses or depends on
Rewst's trigger response body — it fires the request fire-and-forget and
returns `{ request_id }` to the browser as soon as the POST is accepted
(`res.ok`), regardless of what (if anything) Rewst's ack contained. Every
browser-visible response — this submit ack, `checkStatus`, and
`listHistory` — otherwise goes through the proven `wait_for_results:true` +
follow-redirect pattern. Only the fire-and-forget submit trigger uses
`wait_for_results:false`, and its response is never trusted for anything.

Rewst's workflow persists the verdict keyed by that same `request_id`
somewhere `check-status`/`list-history` can look it up (a Rewst data table or
IT Glue record — a Rewst-side decision, not built in this repo).

## Third webhook added beyond the original spec: `list-history`

The original spec (section 3) only defined `submit-url` and `check-status` —
it didn't account for the frontend's History tab needing a way to list past
submissions so other techs can see what's already been checked. Added a
third action, `listHistory`, mirroring the KB tool's `browse` action: a fast
synchronous lookup (`wait_for_results:true`, no polling) against the same
store `submit-url` writes results to. See `docs/rewst-webhook-contracts.md`
section 3.

## What's NOT built yet (by design — see "Next build steps" in the spec)

- The actual Rewst workflows/triggers for `submit-url`, `check-status`,
  `list-history` — this repo has no Rewst API access, so
  `docs/rewst-webhook-contracts.md` and `docs/claude-verdict-prompt.md` are
  the handoff contract, not live Rewst config.
- The real Cloudflare Worker deployment — `cloudflare-worker.js` has
  placeholder `REWST_WEBHOOKS` trigger URLs until those exist (Rewst
  workflows aren't built yet). `ALLOWED_ORIGIN` is already filled in
  (`https://chaswheatley26.github.io` — see "Hosting" below).
- `src/lib/api.js`'s `PROXY_URL` is still a placeholder
  (`cbm-phishing-proxy.REPLACE_ME.workers.dev`) until the Worker is actually
  deployed to Cloudflare.

## Hosting (decided 2026-07-29)

Same GitHub Pages site as the KB tool and landing page — this repo
(`cbm-knowledge-base`), not a separate repo/origin, so the existing landing
page can link to it same-tab like it does `kb/`. See the note at the top of
this file for the `phishing-src/` (source) vs `phishing/` (build output)
split this required.

## Design system (shared with the KB tool, for consistency)

Same values as `cbm-knowledge-base/kb/app-source.jsx` — see `src/styles.js`,
which was ported directly from it (not re-derived):
- Palette: navy `#2b3d6b`, gold `#c9a938`, background `#f5f7fb`, borders
  `#e6eaf2`/`#d8deea`, text `#1a2238`
- Font: Inter/system sans
- `CbmMark` (`src/components/CbmMark.jsx`) is the same inline SVG logo,
  ported verbatim — keep in sync if the KB tool's mark ever changes.
- `Section`/`Field`/`CopyButton` ported verbatim from the KB tool.
- `VerdictBadge` (`src/components/VerdictBadge.jsx`) repurposes the KB
  tool's 3-tier green/amber/grey `ConfidenceBadge` colors for this tool's 4
  verdict states, adding a red tier (reusing `styles.errorBox`'s red) for
  `malicious` — not a new color introduced to the system.

## History (chronological, condensed)

1. Spec written (`phishing-triage-tool-spec.md`), assuming a single pasted
   URL as input and a two-webhook (`submit-url`/`check-status`) design.
2. Discussed real-world ticket shape with the user — techs get "is this
   safe?" tickets as a link, an email, or a description, unpredictably.
   Decided on one textarea accepting either, with Rewst-side classification,
   instead of forcing techs to pick a mode up front.
3. Planned and built the frontend (Vite+React) + a new Cloudflare Worker
   (`cbm-phishing-proxy`, separate from the KB tool's `cbm-kb-proxy` per
   user's choice) + Rewst webhook contract docs + Claude verdict prompt.
   Added the `list-history` action, not in the original spec, to support the
   frontend's History tab.
4. Node.js wasn't installed on the dev machine — installed via
   `winget install OpenJS.NodeJS.LTS` before scaffolding, so `npm install`/
   `npm run dev` could actually be verified rather than shipped untested.
5. User asked for this to appear on the same landing page as the KB tool and
   SaaS Alert Tool. Moved the project into the `cbm-knowledge-base` repo as
   `phishing-src/` (source) building into `phishing/` (served output,
   `href="phishing/"` on the landing page — same pattern as `kb/`), set
   `ALLOWED_ORIGIN` to the real shared GitHub Pages origin, and added a third
   card to the root `index.html`. Chose manual `npm run build` + commit over
   GitHub Actions CI, per user's preference, matching how the rest of this
   site already works.
