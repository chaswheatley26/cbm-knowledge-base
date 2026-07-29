# Rewst Webhook Contract

**Superseded 2026-07-29:** this tool originally specified three triggers
(`submit-url`, `check-status`, `list-history`) for an async-with-polling
design backed by persisted history. That was dropped once it became clear
the actual requirement has no persistence layer at all — nothing needs to be
stored, so there's nothing to poll for and nothing to list. What follows is
the current, live contract: **one** trigger, fully synchronous.

This is now built and live — see `phishing-src/CLAUDE.md` for the deployed
webhook URL and what's still left on the Cloudflare Worker side.

---

## The `triage` trigger

Fired by `cloudflare-worker.js` with `wait_for_results: true` — the proven
pattern from the KB tool (its `CLAUDE.md` History #7/#11-13/#17 documents why
`wait_for_results:false` async acks are unreliable). The trigger blocks until
classification, enrichment, and the Claude verdict call are all done, then
303-redirects to the result; the Worker follows that redirect
server-to-server (not subject to CORS) and hands the JSON straight back to
the browser.

**Input:**
```json
{
  "submitted_input": "either a bare URL or a full pasted email, unknown which until classified",
  "submitter": "optional free-text name",
  "client_tenant": "optional free-text client/tenant"
}
```

**Step 1 — classify `submitted_input`:** treat as an **email** if it contains
header-like lines (`From:`, `To:`, `Subject:`, `Received:`, `Reply-To:`) or is
clearly multi-line prose with an embedded link, rather than being just a bare
URL on its own. Otherwise treat as a **bare URL**.

- **Bare URL path:** enrich that one URL only (VirusTotal, URLScan, Safe
  Browsing, RDAP).
- **Email path:** extract every URL found in the body (regex for
  `https?://\S+`) and run the same four-source enrichment on **each** one;
  additionally pass the full raw email text to the Claude verdict step so it
  can reason over email-content phishing signals (sender/display-name
  mismatch, Reply-To spoofing, urgency language, spelling) — not just link
  reputation. This is the reason the tool asks Claude to reason over email
  content at all, not just URLs; don't drop this path even if it seems
  redundant with per-URL enrichment.

**Step 2 — enrichment, per URL:** explicitly mark any source that failed or
timed out — never leave a field blank or default it to a clean/benign
reading. Suggested per-source shape:
```json
{ "status": "ok", "summary": "5/90 engines flagged" }
{ "status": "failed", "summary": null }
{ "status": "timeout", "summary": null }
```

**Step 3 — Claude verdict call.** See `claude-verdict-prompt.md` for the
system prompt/schema. Feed it: all per-URL evidence (with failed/timeout
sources explicitly marked as such, not omitted), plus the raw email text and
`email_signals` extraction when the input was an email.

**Step 4 — side effects**, independent of what the frontend ever sees: post
verdict + screenshot to Teams; `malicious` → create/update an Autotask
ticket; `suspicious` → internal Autotask note only. (No submission log —
there's no persistence layer; if per-submission logging is wanted later for
false-positive tuning, that's a Rewst-side addition, not a frontend one.)

**Step 5 — return the final response** (this is what the frontend's
`triage()` call receives directly, wrapped once, synchronously):
```json
{
  "verdict": {
    "verdict": "benign | suspicious | malicious | insufficient_data",
    "confidence": 0,
    "reasoning": "string",
    "recommended_action": "string",
    "input_type": "url | email",
    "urls": [
      {
        "url": "string",
        "virustotal": { "status": "ok|failed|timeout", "summary": "string|null" },
        "urlscan": { "status": "ok|failed|timeout", "summary": "string|null", "screenshot_url": "string|null" },
        "safe_browsing": { "status": "ok|failed|timeout", "summary": "string|null" },
        "rdap": { "status": "ok|failed|timeout", "summary": "string|null" }
      }
    ],
    "email_signals": {
      "sender_display_name": "string|null",
      "sender_address": "string|null",
      "reply_to_mismatch": true,
      "urgency_language_detected": true,
      "notes": "string"
    }
  }
}
```
`email_signals` is present only when `input_type` is `"email"`.

---

## Known failure modes to guard against (carried over from the spec)

- Never let a failed/timed-out enrichment source silently read as "clean" —
  `insufficient_data` exists specifically so thin evidence doesn't get
  reported with false confidence.
- VirusTotal free tier: 4 req/min, 500/day. If a submission hits this,
  reflect it in that source's `status`/`summary`, don't silently drop it.
- Both VirusTotal and Google Safe Browsing free tiers are non-commercial-use
  only — CBM is an MSP serving paying clients, which is commercial use.
  Flagged for a licensing decision before any client-facing production use;
  not blocking build/testing.
- **URLScan timing is the main open risk** for a fully synchronous design:
  a full sandbox scan can take up to ~30s, and the whole trigger call blocks
  for that duration. If this proves unreliable in testing (frequent
  timeouts), the fix belongs in the Rewst workflow (e.g. a longer wait or a
  retry loop around the URLScan step) — not a frontend workaround.
