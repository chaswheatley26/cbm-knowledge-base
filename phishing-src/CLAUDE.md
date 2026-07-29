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
card style as the KB tool's link. The landing page card currently shows a
"Pilot" badge — pull it once the tool has been confirmed working end-to-end
(browser → Worker → Rewst → back) with a real test. After editing anything
under `src/`, rerun `npm run build` and commit both `phishing-src/` (source)
and `phishing/` (build output) — this repo has no CI, matching how the rest
of it works.

See `../../phishing-triage-tool-spec.md` (CBM IT Website root, one level
above this repo) for the original product spec — several of its details
(notably the 3-webhook async design) have since been superseded by the
simplification below; where they conflict, this file and the docs it points
to are current.

## Architecture

- Real Vite + React build (`npm install && npm run dev`), plain JS/JSX, no
  TypeScript. Unlike the KB tool, this is NOT a no-build CDN/Babel-in-browser
  single-file app — Vite compiles JSX natively, so there's no need for that
  project's `app-source.jsx` / `sync-app-source.ps1` workaround. Just edit
  files under `src/` directly.
  - `npm`/`node` may not be on `PATH` in every shell on this machine even
    though they're installed (`C:\Program Files\nodejs`) — if `npm` isn't
    found, prepend that folder to `PATH` for the session rather than
    reinstalling.
- `lucide-react` is a normal npm dependency here (`import { X } from
  "lucide-react"`), not the KB tool's CDN UMD-global workaround — that
  workaround was specific to avoiding a build step, which doesn't apply here.
- All backend calls go through a Cloudflare Worker proxy
  (`cloudflare-worker.js`, deployed separately as `cbm-phishing-proxy`) —
  `src/lib/api.js` only ever talks to `PROXY_URL`, never to Rewst directly.

## Single webhook, fully synchronous, no persistence (simplified 2026-07-29)

**This replaces the original 3-webhook async+polling design** (`submit-url` /
`check-status` / `list-history`, described in the product spec and in this
tool's own earlier history). The user's actual requirement turned out to be
simpler than what was originally scoped: *"There is no data that needs to be
stored. I just want it to use the 3 api keys and tools then give a report if
its safe or not."* No persistence means nothing to poll for and nothing to
list, so the whole async/history apparatus was unnecessary complexity — it's
been removed, not just left dormant. If history or async processing is ever
wanted later, build that back in then, not preemptively.

**Current shape:** one Rewst workflow, one webhook trigger, called with
`wait_for_results: true` — the same proven-reliable pattern the KB tool
uses for all its calls (see KB tool's `CLAUDE.md` History #7/#11-13/#17 for
why `wait_for_results:false` async acks are unreliable and best avoided
entirely rather than worked around). The trigger blocks while the workflow
classifies the input, runs enrichment, gets a Claude verdict, and returns the
finished result in one response — up to ~30s for a full URLScan sandbox
scan. `cloudflare-worker.js` is a single-endpoint proxy: POST body in, follow
Rewst's 303 redirect server-to-server (not subject to CORS), hand the final
JSON straight back. No `request_id`, no `action` routing, no fire-and-forget.

**Live webhook URL** (hardcoded in `cloudflare-worker.js`, same convention as
the KB tool's worker keeping its real Rewst URLs only in that file):
```
https://engine.rewst.io/webhooks/custom/trigger/019faeee-f48e-73dd-9355-b5953c2cdd1f/01976967-f419-7877-9ff8-e4db81c148a6
```

**Response contract:** the workflow returns `{ "verdict": { ... } }`, where
the inner object matches the schema in `docs/claude-verdict-prompt.md` plus
the `urls`/`email_signals` evidence fields — see
`docs/rewst-webhook-contracts.md` for the exact shape. `src/lib/api.js`'s
`triage()` reads `data.verdict` directly; there is no `status: "pending"`
state to handle anymore since the call doesn't return until the workflow is
actually done.

## Single-input design (decided before any code existed)

The frontend has **one textarea** (`SubmissionForm.jsx`) that accepts either
a bare URL or a full pasted email — not two separate modes. Techs receive
"is this safe?" tickets in an unpredictable shape (sometimes just a link,
sometimes a whole forwarded email), so the tool shouldn't force them to
pre-classify what they're pasting before submitting.

The classification (bare URL vs. email) and the resulting branch in
evidence-gathering happen **entirely in the Rewst workflow**, not the
frontend — see `docs/rewst-webhook-contracts.md` for the exact rule and what
each path does differently. The key point: when the input is an email,
Claude's verdict step reasons over BOTH per-URL enrichment AND raw
email-content phishing signals (sender/display-name mismatch, Reply-To
spoofing, urgency language) — link reputation alone misses signals that only
live in the email itself.

## What's done

- Rewst side: sub-workflow + main workflow built and published, webhook
  trigger enabled with `wait_for_results: true` (see URL above).
- Frontend (`src/`): single submit form → one synchronous `triage()` call →
  results view. No history tab, no polling, nothing keyed by request_id —
  all of that was removed along with the persistence layer it depended on.
- `cloudflare-worker.js`: rewritten as a single-endpoint synchronous proxy
  (see "Single webhook" section above).
- **Worker deployed** to Cloudflare as `cbm-phishing-proxy`, live at
  `https://cbm-phishing-proxy.chas-dea.workers.dev` — sanity-checked with a
  plain GET (`405 {"error":"Method not allowed"}`, confirming the real code
  is live, not the "Hello World!" default).
- `src/lib/api.js`'s `PROXY_URL` updated to the real Worker URL above,
  rebuilt (`npm run build`), and committed.

## What's NOT done yet

- **Test end-to-end** (browser → Worker → Rewst → back) with a real
  known-benign URL through the actual live page before trusting it, then
  pull the landing page's "Pilot" badge.
- **Licensing check before real client use** — VirusTotal's and Google Safe
  Browsing's free tiers are non-commercial-use only; CBM is an MSP serving
  paying clients, which is commercial use. Confirm or upgrade before this
  goes live for real client tickets — not blocking build/testing.
- **Optional hardening**: add a secret key to the Rewst trigger and validate
  it in the Worker, so the webhook URL alone (if it ever leaked) isn't
  enough to invoke the workflow directly.
- **Unknown until tested**: whether URLScan consistently returns within the
  ~30s window the Worker/Rewst trigger allows. If it times out often, that
  needs a Rewst-side fix (e.g. a longer wait or a retry), not a frontend one.

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
   Added a `list-history` action, not in the original spec, to support a
   frontend History tab.
4. Node.js wasn't installed on the dev machine — installed via
   `winget install OpenJS.NodeJS.LTS` before scaffolding, so `npm install`/
   `npm run dev` could actually be verified rather than shipped untested.
5. User asked for this to appear on the same landing page as the KB tool and
   SaaS Alert Tool. Moved the project into the `cbm-knowledge-base` repo as
   `phishing-src/` (source) building into `phishing/` (served output,
   `href="phishing/"` on the landing page — same pattern as `kb/`), set
   `ALLOWED_ORIGIN` to the real shared GitHub Pages origin, and added a third
   card to the root `index.html`, flagged "Pilot" since the backend wasn't
   live yet.
6. User built the Rewst side and confirmed the trigger live — but as ONE
   webhook, not the originally-planned three. Clarified this wasn't a
   mistake: the actual requirement never needed persistence ("no data needs
   to be stored... just use the 3 api keys and tools then give a report"),
   so `check-status` (polling a pending result) and `list-history` (listing
   stored submissions) had nothing to do without a store behind them.
   Simplified to a single synchronous `wait_for_results:true` webhook —
   rewrote `cloudflare-worker.js` as a single-endpoint proxy, rewrote
   `src/lib/api.js` down to one `triage()` call, removed the History tab and
   `HistoryTable.jsx` entirely (nothing to list), and removed the
   request_id/polling state from `App.jsx`/`ResultsView.jsx`. Verified the
   simplified frontend builds cleanly with `npm run build`. Still pending:
   deploying the Worker and pointing `PROXY_URL` at it (see "What's NOT done
   yet" above).
