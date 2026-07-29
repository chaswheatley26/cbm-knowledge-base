/* =========================================================================
   CBM Phishing/Link Triage — Rewst proxy Worker (cbm-phishing-proxy)

   Sibling to cbm-knowledge-base's cloudflare-worker.js (same CORS-proxy
   shape, same reason for existing — see that file's header comment: a
   browser can't use Rewst's wait_for_results:true trigger mode directly,
   because it responds with a 303 redirect to a results endpoint that
   doesn't carry CORS headers, and browsers enforce CORS on redirect hops
   too. This Worker's server-to-server fetch isn't subject to CORS, so it
   can follow that redirect itself and hand the final JSON straight back.

   Simplified 2026-07-29: there is no persistence layer for this tool (no
   history, nothing to poll for) — a single Rewst workflow does
   classification + enrichment (VirusTotal/URLScan/Safe Browsing/RDAP) +
   the Claude verdict call, and returns the finished verdict in one
   synchronous response. That's why this Worker is a single-endpoint
   proxy rather than the KB tool's ?action= router — there's only ever
   one thing to call. (An earlier draft of this tool planned 3 separate
   triggers — submit-url/check-status/list-history — for async polling
   and history browsing; that's been dropped along with the persistence
   layer it depended on. If history/async ever comes back, re-introduce
   that shape then, not preemptively.)

   Deploy: Cloudflare dashboard → Workers & Pages → Create → paste this in
   → Deploy (not just Save — see the KB tool's CLAUDE.md for why that
   distinction matters). Copy the resulting
   https://<name>.<subdomain>.workers.dev URL into PROXY_URL in
   src/lib/api.js.
   ========================================================================= */

const REWST_WEBHOOK_URL = "https://engine.rewst.io/webhooks/custom/trigger/019faeee-f48e-73dd-9355-b5953c2cdd1f/01976967-f419-7877-9ff8-e4db81c148a6";

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

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await request.text();

    let rewstRes;
    try {
      // wait_for_results:true — the trigger blocks until classification,
      // enrichment, and the Claude verdict call are all done, then
      // 303-redirects to the result. redirect:"follow" resolves that hop
      // server-to-server, where CORS doesn't apply.
      rewstRes = await fetch(REWST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        redirect: "follow",
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to reach Rewst: " + e.message }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await rewstRes.text();
    return new Response(data, {
      status: rewstRes.status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
