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
card style as the KB tool's link. **The landing page's "Pilot" badge was
removed at the user's request (replaced with a "Try it out!" badge) before
an end-to-end test was ever confirmed working** — see History #10. The
`enrich_urls`/`vt_lookup_2` failure loop (History #9) may or may not
actually be resolved; treat "is this tool actually working right now" as
still open until a real submit→poll→result run is verified, regardless of
what the landing page badge says. After editing anything under `src/`,
rerun `npm run build` and commit both `phishing-src/` (source) and
`phishing/` (build output) — this repo has no CI, matching how the rest of
it works.

See `../../phishing-triage-tool-spec.md` (CBM IT Website root, one level
above this repo) for the original product spec — several of its details
have since been superseded (twice — see "Async + poll" section below);
where they conflict, this file and the docs it points to are current.

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

## Async + poll, two webhooks, no persisted history (current, 2026-07-29 — second revision)

This design has gone through two revisions since the original spec:

1. **Original spec:** 3 webhooks (`submit-url`/`check-status`/`list-history`),
   async + polling, backed by persisted/browsable submission history.
2. **First simplification:** the user's actual requirement turned out not to
   need persistence at all — *"There is no data that needs to be stored. I
   just want it to use the 3 api keys and tools then give a report if its
   safe or not."* Collapsed to **one** synchronous `wait_for_results:true`
   webhook, no polling, no history tab.
3. **Current (this section):** the fully-synchronous design hit real timing
   risk — the full enrichment chain (VirusTotal/URLScan/Safe Browsing/RDAP +
   a Claude verdict call) runs 60-90s in the happy path, too long to reliably
   hold one HTTP request open end-to-end. Rewst rebuilt this as **two**
   webhooks: `triage` (kicks off the work, returns fast) and `get_result`
   (looks up the result once ready). This is **not** a return to revision
   1's design — there's still no persisted/browsable history, just a
   short-lived per-request lookup that gets deleted once read.

**Live webhook URLs** (hardcoded in `cloudflare-worker.js`, same convention
as the KB tool's worker keeping its real Rewst URLs only in that file):
```
triage:     https://engine.rewst.io/webhooks/custom/trigger/019faeee-f48e-73dd-9355-b5953c2cdd1f/01976967-f419-7877-9ff8-e4db81c148a6
get_result: https://engine.rewst.io/webhooks/custom/trigger/019fb4de-6471-7f46-ac65-5941e33a5935/01976967-f419-7877-9ff8-e4db81c148a6
```

**How the two calls work** (see `docs/rewst-webhook-contracts.md` for the
full request/response shapes):
- `submit` action (Worker) → `triage` webhook, `wait_for_results: false`,
  fire-and-forget. The Worker generates `request_id` itself
  (`crypto.randomUUID()`) and embeds it in the payload — it never parses or
  depends on this trigger's immediate ack, only whether the POST was
  accepted. This sidesteps a documented Rewst platform issue: async-trigger
  acks can come back completely empty even when the workflow genuinely ran
  (see the KB tool's `CLAUDE.md` History #7/#11-13/#17).
- `poll` action (Worker) → `get_result` webhook, `wait_for_results: true`,
  the proven synchronous pattern (it's a fast lookup, not a long job).
  Rewst stores the triage result transiently (an org variable named after
  `request_id`, or equivalent), and `get_result` **deletes it after a
  successful read** so it doesn't accumulate — this was a deliberate call
  to avoid unbounded org-variable buildup, not an oversight.
- Frontend polling schedule (`ResultsView.jsx`): 5s initial delay, ~12s
  interval, 3-minute timeout — matches Rewst's own suggested cadence for a
  60-90s happy-path job.

**Response shape has already moved once** — the synchronous version's
response came back nested under `final_response` rather than the originally
assumed flat shape. `src/lib/api.js`'s `checkStatus()` deliberately checks a
few plausible wrapper keys (`result`, `final_response`, `output`, `data`)
rather than assuming exactly one, precisely because of that history — keep
that lenient extraction rather than hardcoding one wrapper key if Rewst's
side changes again. Also note: `safe_browsing.summary` has been observed
coming back as a nested object rather than a plain string like the other
three sources — `ResultsView.jsx`'s `SourceRow` defensively stringifies
non-string `summary` values so this can't crash rendering.

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

- Rewst side: `triage` workflow (updated to accept + store by `request_id`)
  and new `get_result` workflow, both published, both webhook triggers
  live (see URLs above).
- Frontend (`src/`): restored `SubmissionForm` → `submitTriage()` →
  `ResultsView` polling → verdict. No history tab — that stays gone, since
  `get_result` only ever returns one transient, self-deleting result, not a
  browsable log.
- `cloudflare-worker.js`: rewritten with two actions, `submit`
  (fire-and-forget to `triage`) and `poll` (synchronous to `get_result`) —
  see "Async + poll" section above.
- `src/lib/api.js` / `App.jsx` / `ResultsView.jsx`: rebuilt around
  `submitTriage()` + `checkStatus()` with the 5s/12s/3min polling schedule.
  Verified the rebuilt frontend builds cleanly with `npm run build`.

## What's NOT done yet

- **Still-unconfirmed blocking bug, Rewst-side (see History #9-10):** the
  `triage` workflow's `enrich_urls` task was failing on its
  `cbm_phishing_enrich_single_url` sub-workflow right after `vt_lookup_2`
  (VirusTotal), with no task ID attached — the engine appeared to be
  killing the sub-workflow's container. Rewst diagnosed this as corrupted
  internal state on the `vt_wait_2` task and recreated it. **A retest
  after that fix still showed the identical symptom** (4th consecutive
  submit+poll test stuck at `{"status":"pending"}` for the full ~3-minute
  window, request_id `f36f4092-8219-48b4-93f5-19ac59826c66`) — the fix was
  never confirmed to actually work, and no follow-up log check happened
  before other work took priority. **Do not assume this is fixed.**
- **Retest end-to-end** (browser → Worker → `triage` → poll → `get_result`
  → back) through the actual live page before trusting the tool at all —
  as of this writing there has never been one single successful completed
  run, only repeated "still pending forever" failures. The response shape
  for a genuinely completed `get_result` call is also still unconfirmed
  for this async version — don't assume `docs/rewst-webhook-contracts.md`'s
  documented shape is correct yet; it's a best guess (see that doc's own
  note on this).
- **Licensing check before real client use** — VirusTotal's and Google Safe
  Browsing's free tiers are non-commercial-use only; CBM is an MSP serving
  paying clients, which is commercial use. Confirm or upgrade before this
  goes live for real client tickets — not blocking build/testing.
- **Optional hardening**: add a secret key to the Rewst trigger and validate
  it in the Worker, so the webhook URL alone (if it ever leaked) isn't
  enough to invoke the workflow directly.

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
   simplified frontend builds cleanly with `npm run build`.
7. Deployed `cbm-phishing-proxy` to Cloudflare, pointed `PROXY_URL` at it,
   rebuilt, and pushed. Live-tested through the actual site: got a real
   response, but it came back nested under `final_response` (not the flat
   `{"verdict":{...}}` shape originally assumed) and `safe_browsing.summary`
   came back as a nested object instead of a plain string — the latter
   would have crashed the results view (React can't render an object as a
   child). Fixed both: `triage()` flattens the real nesting, and
   `SourceRow` defensively stringifies non-string `summary` values. Pushed
   the fix; confirmed via the docs and CLAUDE.md that the contract now
   matches reality rather than the original assumption.
8. Rewst flagged that the fully-synchronous design was risky given the
   60-90s happy-path duration of the full enrichment chain, and proposed
   going back to async + polling — but as two webhooks (`triage` +
   `get_result`), not the original three, since persisted history was
   still correctly identified as unneeded. Agreed to the request-ID
   approach (Worker generates it, never trusts Rewst's fire-and-forget ack)
   given the KB tool's documented history with that exact failure mode.
   Confirmed with the user: `get_result` deletes its stored value after a
   successful read (rather than letting org variables accumulate
   unbounded), and Cloudflare Workers can make unrestricted outbound
   `fetch()` calls (already proven true — `cbm-phishing-proxy` already does
   this today). Rewst built both workflows and provided both trigger URLs.
   Rebuilt `cloudflare-worker.js` (two actions: `submit` fire-and-forget,
   `poll` synchronous), restored `submitTriage()`/`checkStatus()` in
   `src/lib/api.js` (keeping the lenient multi-key response extraction from
   #7's lesson), restored the request_id/polling flow in
   `App.jsx`/`ResultsView.jsx` (5s initial delay, ~12s interval, 3-minute
   timeout — Rewst's suggested cadence), and reverted `SubmissionForm`'s
   "up to 30s" busy hint since submit is fast again (that context now
   lives in `ResultsView`'s polling screen). Verified the rebuild builds
   cleanly with `npm run build`. Still pending: deploying the updated
   Worker and a fresh end-to-end test (see "What's NOT done yet" above).
9. Deployed the two-action Worker to `cbm-phishing-proxy`, confirmed via a
   plain GET (`405 {"error":"Method not allowed"}`). Ran three separate
   `submit` → poll-every-12s-for-~3min tests directly against the Worker
   (bypassing the frontend) — all three stayed `{"status":"pending"}` for
   the entire window, never completing. Traced with the user directly in
   Rewst's execution logs: `triage` DOES run (confirmed execution
   `019fce54-1e0d-7f02-87fd-4e705293cb31` for one test's request_id) but
   errors every time at the `enrich_urls` task
   (`019faeedcb4371038392559616ca057d`) — specifically, the sub-workflow
   `cbm_phishing_enrich_single_url` dies immediately after its `vt_lookup_2`
   step (VirusTotal) succeeds, returning an empty `{}` and killing the
   parent `enrich_urls` task. No task ID is attached to the failure — the
   engine is killing the sub-workflow's container outright, not failing one
   task normally. `store_result` is never reached, which is why `get_result`
   correctly reports "pending" forever — there's nothing wrong with the
   Worker/polling code, there's just never anything to find. This is now
   purely a Rewst-side sub-workflow bug to diagnose (likely candidates:
   oversized VT response tripping a memory ceiling, an unhandled exception
   in whatever step reads `vt_lookup_2`'s output assuming a shape it didn't
   get, or a sub-workflow-level timeout) — nothing actionable on the
   frontend/Worker side until `enrich_urls` actually completes.
10. Sent Rewst a written bug report with the four hypotheses from #9.
    Response: `vt_wait_2` had corrupted internal state from the earlier
    workflow rebuilds, engine couldn't schedule it, killed the container
    with no clean error — deleting and recreating it fresh was reported as
    the fix. Retested: **4th consecutive submit+poll test showed the
    identical symptom** — stuck at `{"status":"pending"}` for the full
    ~3-minute window (request_id `f36f4092-8219-48b4-93f5-19ac59826c66`).
    Asked for a log check on that specific execution to confirm whether it
    hit the same failure point or a new one; no answer was given before
    the user moved on to unrelated work (an unrelated SaaS Alert Tool link
    swap, then later, at the user's explicit request, removing the
    landing-page card's "Pilot" badge and replacing it with "Try it out!"
    — done as asked, but **without any confirmed working end-to-end run**
    backing it up. The badge no longer reflects actual verification status;
    treat the tool as unverified until someone actually gets a completed
    result through the real page.
