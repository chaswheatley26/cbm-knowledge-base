# CBM Knowledge Base

A search/submit/browse tool for CBM IT techs to reuse knowledge from
already-resolved tickets instead of re-solving the same problem from
scratch. A tech can:

- **Search** — describe a problem in plain English and get back past
  tickets that were resolved similarly, ranked by relevance.
- **Submit** — paste the full text of a ticket they just closed; an AI
  step extracts the problem, the fix, and metadata, and files it away.
- **Browse** — page through everything in the knowledge base, filterable
  by company and ticket type.

There is no traditional backend or database owned by this project. The
"backend" is a set of **Rewst workflows** that do the AI work and read/write
**IT Glue** (which is the actual system of record for the data). The
**frontend is one static HTML file** with no build step, hosted on GitHub
Pages. A small **Cloudflare Worker** sits in between the two, purely to get
around browser cross-origin (CORS) restrictions that Rewst's response mode
runs into.

```
┌──────────────┐        ┌────────────────────┐        ┌───────────────────┐        ┌──────────┐
│   Browser    │  POST  │  Cloudflare Worker  │  POST  │  Rewst workflows   │  R/W   │ IT Glue  │
│  index.html  │ ─────► │  cloudflare-worker  │ ─────► │  (4 webhooks,      │ ─────► │ (system  │
│  (GitHub     │ ◄───── │  .js — CORS proxy   │ ◄───── │  AI parsing +      │ ◄───── │ of       │
│  Pages)      │  JSON  │                     │  JSON  │  search logic)     │        │ record)  │
└──────────────┘        └────────────────────┘        └───────────────────┘        └──────────┘
```

Read on for how each piece actually works. For the blow-by-blow debugging
history behind *why* the architecture ended up this shape (CORS dead ends,
empty-response bugs, etc.), see [`CLAUDE.md`](../CLAUDE.md) in the parent
folder — this README explains the current, working system; `CLAUDE.md` is
the project's running lab notebook.

---

## 1. The frontend — `index.html`

The entire app is one self-contained HTML file. There's no `npm install`,
no bundler, no `node_modules` — you can open it in a browser directly or
just push it to GitHub Pages as-is.

### Why it's built this way

React, ReactDOM, Babel Standalone, and lucide-react (icons) are all loaded
from CDN (unpkg) at runtime, and the app's own JSX is compiled **in the
browser** by Babel — there is no build/CI step that produces this file, the
file you edit is the file that ships.

This is deliberate, not just "quick and dirty": the app was originally
built to run inside Rewst's App Builder as a pasted "Custom HTML"
component, which has quirks a normal static site doesn't (see below). It
later moved to GitHub Pages, but the single-file approach was kept because
it's genuinely convenient for a small internal tool — one file, no deploy
pipeline, edit and push.

### How it boots, step by step

1. The `<body>` contains a `<div id="root">Loading…</div>` and then two
   `<script>` blocks.
2. The **first** script block has `type="text/plain"` — the browser treats
   it as inert text, not code. It contains the entire React app as JSX
   source (components, styles, the works). Sitting it here as plain text
   is what lets a plain inline script compile it deliberately, in a
   controlled order (see gotcha #2 below), rather than relying on the
   browser to somehow execute JSX natively (it can't).
3. The **second** script block is the real bootstrap logic. It runs an
   async `boot()` function that:
   - Loads React, ReactDOM, and Babel Standalone from unpkg, **one at a
     time, awaiting each `<script>`'s load event** before moving to the
     next.
   - Aliases `window.react = window.React` (lowercase) — lucide-react's
     UMD build expects the lowercase global.
   - Loads lucide-react from unpkg.
   - Reads the inert JSX text out of the `#app-source` element.
   - Compiles it with `Babel.transform(source, { presets: [["react", {
     runtime: "classic" }]] })`.
   - Injects the compiled output as a **new** `<script>` element and
     appends it to `<body>`, which actually executes it.
   - Any failure at any step replaces `#root`'s contents with a visible
     error message (`showFatal`) instead of silently leaving the page
     stuck on "Loading…".

### Two hard-won rules baked into this design

These aren't stylistic choices — both caused real outages when violated,
so don't "clean them up":

- **JSX must compile with the `classic` runtime, never the default
  `automatic` one.** The automatic runtime emits `import { jsx as _jsx }
  from "react/jsx-runtime"` — a real ES module import, which throws
  `Cannot use import statement outside a module` in a plain script and
  kills the entire app silently (this is exactly what the `text/plain` +
  manual-Babel-compile dance above exists to avoid).
- **No static `<script src="...">` tags for React/ReactDOM/Babel/lucide
  in `<head>`.** Some hosting contexts (this was hit specifically inside
  Rewst App Builder) re-inject pasted `<script>` tags in a way that
  breaks the normal browser guarantee that head scripts run in order,
  before anything after them. Loading everything from one inline script
  that explicitly awaits each load event sidesteps that entirely — which
  is also why it's still done this way even now that the app lives on
  GitHub Pages, a normal static host that wouldn't have this problem.

### The app itself

Once booted, it's an ordinary small React app with three pages plus a
detail view, all client-side state (`useState`/`useEffect`), no router:

| Page | Component | What it does |
|---|---|---|
| Search | `SearchPage` | Free-text query → calls the `search` action → renders ranked results with a color-coded confidence badge (green 8–10, amber 5–7, grey 4). |
| Submit | `SubmitPage` | Paste raw ticket text + optional ticket #  → calls the `submit` action → Rewst's AI does the parsing, nothing comes back but success/failure. |
| Browse | `BrowsePage` | Lists all records, with company/ticket-type filter chips and a client-side keyword filter over whatever's already loaded. |
| Detail | `DetailView` | Opened from a Search or Browse card → calls `getRecord` for full detail (steps, tags, error messages, affected systems). |

All four network calls funnel through one function, `callProxyWebhook(action, body)`,
which POSTs to the Cloudflare Worker (see §2) and does the response
handling: reads the raw text first (so a network-level empty response
produces a clear error instead of a cryptic JSON-parse crash), then parses
it as JSON, then unwraps whichever of `output`/`result`/`data`/`workflow_output`
the Rewst workflow happened to nest the real payload under.

Field values coming back from Rewst (`resolution_steps`, `tags`) are always
**plain strings**, never arrays — `splitSteps`/`splitTags` handle turning
`"1. do this\n2. do that"` or `"tag1, tag2"` into lists for rendering.

### Versioning

Look for the `BUILD_TAG` constant near the top of the JSX source — it's
shown in the app header ("build X.Y") so a deploy can be visually
confirmed as live without opening devtools. **Bump it on every change.**
Scheme (numbers, not dates, ordered as real numbers so `1.12 < 1.2`):

- Small tweak (copy, minor fix): append/increment a trailing digit —
  `1.1` → `1.11` → `1.12` … `1.19`.
- Bigger change (new feature, architecture change): bump the first
  decimal digit and reset — `1.1` → `1.2` → `1.3`, with small tweaks under
  that becoming `1.21`, `1.22`, etc.

### Deploying the frontend

There's no build step — GitHub Pages serves `index.html` directly.
Committing and pushing to the branch GitHub Pages is configured against
(this repo) is the entire deploy. Live at:
**https://chaswheatley26.github.io/cbm-knowledge-base/**

---

## 2. The Cloudflare Worker proxy — `cloudflare-worker.js`

### The problem it solves

Rewst's webhook triggers support a `wait_for_results: true` mode, which is
what you actually want here — the caller POSTs and gets the finished
workflow output back in the same response, no polling. But a **browser**
can't use it directly: a synchronous trigger responds with `303 See Other`,
redirecting to a separate results endpoint, and that redirect target
doesn't carry CORS headers. Browsers enforce CORS on every hop of a
redirect, not just the first request, so the fetch fails cross-origin no
matter how the first request is configured.

Falling back to Rewst's async mode (`wait_for_results: false` +
execution-id polling) avoided the redirect/CORS problem, but that path had
its own reliability bug — trigger responses on several workflows came back
as a `200` with a **completely empty body** (no execution_id at all), even
though the workflow had genuinely run to completion server-side. That was
chased for a while as a per-workflow Rewst config issue, but it hit enough
of the four workflows that a structural fix made more sense than chasing
it one workflow at a time (full detail in `CLAUDE.md`'s History section if
you want the blow-by-blow).

### The fix: a tiny server-to-server relay

The Worker is the only thing that ever talks to Rewst directly. The
browser only ever talks to the Worker. Concretely:

1. Browser → POST `https://cbm-kb-proxy.chas-dea.workers.dev?action=search`
   (or `submit` / `browse` / `getRecord`), with a JSON body.
2. The Worker looks up `action` in its own `REWST_WEBHOOKS` map to get the
   real Rewst trigger URL (these raw URLs live **only** in this file now —
   `index.html` has no knowledge of them).
3. The Worker does a server-to-server `fetch()` to Rewst with
   `redirect: "follow"`. Server-to-server requests aren't subject to CORS
   at all, so following that `303` is completely safe here even though the
   browser could never do it itself.
4. The Worker takes Rewst's final JSON response and returns it to the
   browser, stamped with its own CORS headers
   (`Access-Control-Allow-Origin: https://chaswheatley26.github.io`).

No execution IDs, no polling, on any of the four calls — the Worker
resolves the whole round-trip in one request from the browser's point of
view.

### The four actions it proxies

```js
const REWST_WEBHOOKS = {
  search:    "...",
  submit:    "...",
  browse:    "...",
  getRecord: "...",
};
```

All four require Rewst's trigger to be set to `wait_for_results: true` on
Rewst's side — that's the whole point of routing through the Worker
instead of straight to Rewst.

### Deploying / updating the Worker

1. Cloudflare dashboard → Workers & Pages → open the `cbm-kb-proxy`
   Worker → **Edit code**.
2. Select all, delete, paste in the full contents of
   `cloudflare-worker.js` → **Deploy** (not just "Save" — on this
   dashboard those can be two different buttons, and a "Save" without a
   "Deploy" leaves whatever was previously live still running, e.g. the
   Cloudflare "Hello World!" default template).
3. Sanity check: load `https://cbm-kb-proxy.chas-dea.workers.dev/`
   directly in a browser (a plain GET). It should return
   `{"error":"Method not allowed"}`. If you see "Hello World!" instead,
   the deploy didn't take — go back to step 2.
4. If you change which Rewst URLs are targeted, edit `REWST_WEBHOOKS`
   (and `ALLOWED_ORIGIN` if the frontend's origin ever changes) in
   `cloudflare-worker.js` and redeploy via the same paste-and-deploy flow.

Current deployment: Worker name `cbm-kb-proxy`, URL
`https://cbm-kb-proxy.chas-dea.workers.dev`, wired into `index.html` via
the `PROXY_URL` constant.

---

## 3. The Rewst side (workflows + IT Glue)

Rewst is where all the actual "intelligence" and storage live — the
frontend and Worker are both just plumbing around this. There are four
Rewst workflows, each exposed as a webhook trigger, each doing one job:

| Action | Request body | What the workflow does | Response shape |
|---|---|---|---|
| `search` | `{ search_query }` | Runs an AI relevance search over existing IT Glue records for the query text, scores each match. | `{ search_results: [{ id, company, ticket_type, problem_summary, resolution_steps, relevance_score, relevance_reason }] }` |
| `submit` | `{ raw_ticket_text, source_ticket_id }` | An AI step reads the raw pasted ticket text, extracts problem summary / resolution steps / tags / affected systems / error messages, and writes a new record into IT Glue. | No meaningful body — success just means the workflow completed without erroring. |
| `browse` | `{ filter_company, filter_ticket_type }` (empty string = no filter) | Reads matching records straight out of IT Glue, no AI step involved. | `{ records: [{ id, company, ticket_type, problem_summary, resolution_steps, tags, source_ticket_id }] }` |
| `getRecord` | `{ record_id }` | Fetches one full record by ID from IT Glue. | `{ record: [{ ...all fields..., error_messages, affected_systems }] }` — **always an array of one**, the frontend reads `record[0]`. |

A few things worth knowing about this layer:

- **IT Glue is the actual database.** Rewst workflows are just the access
  layer — they read/write IT Glue records and (for `search`/`submit`) run
  an AI step on top. There is no other datastore anywhere in this system.
- **Every field is a plain string**, never a JSON array, even when it
  conceptually holds a list (resolution steps, tags). That's why the
  frontend has its own string-splitting logic (`splitSteps`/`splitTags`)
  rather than just mapping over an array.
- **`relevance_score` is an integer 0–10.** Rewst's search workflow never
  returns anything scored below 4 — the frontend's amber/green/grey tiers
  only ever need to handle 4 through 10.
- **All four triggers must be set to `wait_for_results: true`** to work
  with the current Cloudflare Worker architecture (§2). If a workflow is
  ever recreated or a trigger re-added in Rewst, this setting is the one
  thing that has to be set correctly for it to keep working through the
  proxy.
- **Known non-blocking issue:** the quality of AI-generated
  `resolution_steps` text on `submit` isn't great yet. That's a
  prompt/summarization tuning problem on the Rewst workflow side, not a
  frontend or transport bug — nothing here needs to change to fix it.

---

## 4. Putting a change out end-to-end

Depending on what you're changing, here's what actually needs touching:

- **UI/copy/frontend logic change:** edit `index.html`, bump `BUILD_TAG`,
  commit and push. GitHub Pages picks it up automatically.
- **Changing what a Rewst workflow does** (AI prompt, IT Glue fields,
  search logic): all done inside Rewst itself — nothing in this repo
  changes, unless the response shape changes, in which case `index.html`'s
  parsing (`extractOutput`, `splitSteps`/`splitTags`, the field names read
  off each record) needs to match.
- **Adding a new webhook/action, or changing a Rewst trigger URL:** edit
  `REWST_WEBHOOKS` in `cloudflare-worker.js`, redeploy the Worker (§2
  steps), then wire the new `?action=` value up on the `index.html` side
  (`callProxyWebhook("newAction", {...})`).
- **Worker CORS misbehaving after a frontend URL change:** update
  `ALLOWED_ORIGIN` in `cloudflare-worker.js` to match wherever
  `index.html` is actually served from, then redeploy.

---

## 5. Where to look when something breaks

- **Browser console** — `callProxyWebhook` logs `"Proxy response for
  {action} — status/raw"` on every single call. This is the fastest way
  to tell whether a failure is: the Worker unreachable, the Worker
  reachable but Rewst returning an error/empty body, or Rewst returning
  something the frontend didn't expect to parse.
- **Cloudflare dashboard** → the `cbm-kb-proxy` Worker's logs, for
  server-to-server failures between the Worker and Rewst that never make
  it back to the browser console.
- **Rewst's own execution logs**, per workflow, if the Worker got a
  response but it looks wrong (e.g. `{"search_results": []}` when you
  expected matches) — that tells you whether the workflow itself is at
  fault versus the transport.
- **[`CLAUDE.md`](../CLAUDE.md)** in the parent folder — the full gotcha
  list and chronological debugging history behind every design decision
  in this README. If something looks like it should obviously be "fixed"
  (e.g. "why doesn't this just call Rewst directly?"), check there first —
  it's very likely already the scar tissue from a previous bug.
