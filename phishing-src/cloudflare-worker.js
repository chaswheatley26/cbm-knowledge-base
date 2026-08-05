/* =========================================================================
   CBM Phishing/Link Triage — Rewst proxy Worker (cbm-phishing-proxy)

   Sibling to cbm-knowledge-base's cloudflare-worker.js (same CORS-proxy
   shape, same reason for existing — see that file's header comment: a
   browser can't use Rewst's wait_for_results:true trigger mode directly,
   because it responds with a 303 redirect to a results endpoint that
   doesn't carry CORS headers, and browsers enforce CORS on redirect hops
   too. Server-to-server fetches aren't subject to CORS, so this Worker can
   follow that redirect itself and hand the final JSON straight back.

   Async + poll (restored 2026-07-29, second time): the fully-synchronous
   single-webhook design that was live before this hit real timing risk —
   the full enrichment chain (VirusTotal/URLScan/Safe Browsing/RDAP + a
   Claude verdict call) can run 60-90s in the happy path, too long to hold
   one HTTP request open end-to-end reliably. Rewst rebuilt this as two
   workflows: `submit` kicks off triage and returns fast; `poll` looks up
   the result by request_id once it's ready. This does NOT bring back the
   original 3-webhook history/browsing design (that's still gone — no
   list-history, no persisted submission log) — it's just these two calls.

   Known landmine this sidesteps: Rewst's async-trigger ack
   (wait_for_results:false) has a documented history of coming back
   completely empty — no execution_id, nothing — even when the workflow
   genuinely ran (see the KB tool's CLAUDE.md History #7/#11-13/#17). Fix
   applied here, same as the very first draft of this tool: the Worker
   generates request_id itself (crypto.randomUUID()) and never parses or
   depends on the triage webhook's immediate response body — only whether
   the POST was accepted (res.ok). The poll call, by contrast, goes through
   the proven wait_for_results:true + follow-redirect pattern, since it's a
   fast lookup-and-return, not a long-running job.

   Deploy: Cloudflare dashboard → Workers & Pages → cbm-phishing-proxy →
   Edit code → paste this in → Deploy (not just Save — see the KB tool's
   CLAUDE.md for why that distinction matters).
   ========================================================================= */

const TRIAGE_WEBHOOK_URL = "https://engine.rewst.io/webhooks/custom/trigger/019faeee-f48e-73dd-9355-b5953c2cdd1f/01976967-f419-7877-9ff8-e4db81c148a6";
const GET_RESULT_WEBHOOK_URL = "https://engine.rewst.io/webhooks/custom/trigger/019fb4de-6471-7f46-ac65-5941e33a5935/01976967-f419-7877-9ff8-e4db81c148a6";

// Hosted at https://chaswheatley26.github.io/cbm-knowledge-base/phishing/ —
// same GitHub Pages origin as the KB tool (CORS is origin-based, not
// path-based, so this is the same value the KB tool's worker uses even
// though the served path differs).
const ALLOWED_ORIGIN = "https://chaswheatley26.github.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// Fire-and-forget: never reads/depends on Rewst's response body (that's the
// unreliable part) — only whether the POST was accepted at all. Returns the
// Worker's own request_id immediately so the frontend can start polling.
async function submitAction(bodyText) {
  const requestId = crypto.randomUUID();
  let payload;
  try {
    payload = JSON.parse(bodyText);
  } catch (e) {
    return jsonResponse({ error: "Request body wasn't valid JSON." }, 400);
  }
  payload.request_id = requestId;

  let rewstRes;
  try {
    rewstRes = await fetch(TRIAGE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return jsonResponse({ error: "Failed to reach Rewst: " + e.message }, 502);
  }
  if (!rewstRes.ok) {
    return jsonResponse({ error: `Rewst rejected the submission (${rewstRes.status}).` }, 502);
  }
  return jsonResponse({ request_id: requestId });
}

// Proven-reliable pattern: wait_for_results:true server-to-server, following
// Rewst's 303 redirect ourselves (not subject to CORS), handing the final
// JSON straight back to the browser. This is a fast lookup, not a
// long-running job, so there's no reason to fire-and-forget this one.
async function pollAction(bodyText) {
  let rewstRes;
  try {
    rewstRes = await fetch(GET_RESULT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyText,
      redirect: "follow",
    });
  } catch (e) {
    return jsonResponse({ error: "Failed to reach Rewst: " + e.message }, 502);
  }
  const data = await rewstRes.text();
  return new Response(data, {
    status: rewstRes.status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const bodyText = await request.text();

    if (action === "submit") {
      return submitAction(bodyText);
    }
    if (action === "poll") {
      return pollAction(bodyText);
    }
    return jsonResponse({ error: "Unknown action: " + action }, 400);
  },
};
