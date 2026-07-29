/* =========================================================================
   CBM Phishing/Link Triage — Rewst proxy Worker (cbm-phishing-proxy)

   Sibling to cbm-knowledge-base's cloudflare-worker.js (same CORS-proxy
   shape, same reason for existing — see that file's header comment) but
   NOT identical, because this tool's `submit` call is genuinely slow
   (URLScan sandbox scans can take 10-30+s) where the KB tool's four calls
   are all fast single-shot lookups. That KB tool ultimately eliminated
   polling entirely via wait_for_results:true; that's not an option for
   `submit` here, so this Worker still needs an async-trigger + poll shape
   for that one action — which is exactly the shape that produced the
   empty-trigger-body bug in the KB tool's history (see its CLAUDE.md
   History #7/#11-13/#17: Rewst's wait_for_results:false ack can come back
   completely empty, no execution_id, even when the workflow ran fine).

   Fix applied here: this Worker generates request_id itself
   (crypto.randomUUID()) instead of depending on Rewst to hand one back.
   `submit` fires Rewst's trigger fire-and-forget — carrying that
   request_id in the payload — and never parses or depends on Rewst's ack
   body; it only checks that the POST was accepted (res.ok). Every
   browser-visible response (this submit ack, and every checkStatus /
   listHistory call) goes through the proven wait_for_results:true +
   follow-redirect pattern instead.

   Deploy: Cloudflare dashboard → Workers & Pages → Create → paste this in
   → Deploy. Copy the resulting https://<name>.<subdomain>.workers.dev URL
   into PROXY_URL in src/lib/api.js.
   ========================================================================= */

// Placeholders — the Rewst side of this tool (submit-url / check-status /
// listHistory triggers) doesn't exist yet. Fill these in once built; see
// docs/rewst-webhook-contracts.md for the exact payload/response shapes
// each one needs to implement.
const REWST_WEBHOOKS = {
  submitUrl: "REPLACE_ME_SUBMIT_URL_TRIGGER",
  checkStatus: "REPLACE_ME_CHECK_STATUS_TRIGGER",
  listHistory: "REPLACE_ME_LIST_HISTORY_TRIGGER",
};

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

// Both are the proven-reliable pattern: wait_for_results:true server-to-
// server, following Rewst's 303 redirect ourselves (not subject to CORS),
// and handing the final JSON straight back to the browser.
async function proxySynchronous(rewstUrl, body) {
  let rewstRes;
  try {
    rewstRes = await fetch(rewstUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
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

// Fire-and-forget: never reads/depends on Rewst's response body (that's the
// unreliable part) — only whether the POST was accepted at all.
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
    rewstRes = await fetch(REWST_WEBHOOKS.submitUrl, {
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
    if (action === "checkStatus" || action === "listHistory") {
      const rewstUrl = REWST_WEBHOOKS[action];
      return proxySynchronous(rewstUrl, bodyText);
    }
    return jsonResponse({ error: "Unknown action: " + action }, 400);
  },
};
