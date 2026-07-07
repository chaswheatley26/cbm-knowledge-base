/* =========================================================================
   CBM Knowledge Base — Rewst proxy Worker

   Why this exists: the browser can't use Rewst's wait_for_results:true
   trigger mode directly, because a synchronous trigger responds with a
   303 redirect to a separate results endpoint, and that redirect target
   doesn't carry CORS headers — browsers enforce CORS on redirect hops
   too, so the fetch fails cross-origin no matter what. Falling back to
   wait_for_results:false (async + poll) avoided that, but trigger
   responses have separately been unreliable (empty bodies on some
   workflows — see CLAUDE.md "Unresolved").

   This Worker sits between the browser and Rewst. The browser only ever
   talks to this Worker (so the Worker fully controls CORS). The Worker
   talks to Rewst server-to-server, where CORS doesn't apply at all, so
   it can safely use wait_for_results:true and just follow the 303
   redirect itself before handing the final JSON back to the browser.

   Deploy: Cloudflare dashboard → Workers & Pages → Create → paste this
   in as the Worker's code → Deploy. Copy the resulting
   https://<name>.<subdomain>.workers.dev URL into PROXY_URL in
   index.html.

   Only `search` is wired up on the frontend for now (see CLAUDE.md) —
   submit/browse/getRecord are listed here so migrating them later is
   just flipping which WEBHOOKS entry index.html points at, no Worker
   changes needed.
   ========================================================================= */

const REWST_WEBHOOKS = {
  search: "https://engine.rewst.io/webhooks/custom/trigger/019f3d3f-6058-7fc1-ac1b-ff0459453f45/01976967-f419-7877-9ff8-e4db81c148a6",
  submit: "https://engine.rewst.io/webhooks/custom/trigger/019f3d41-1b97-7c9b-a640-90428869b601/01976967-f419-7877-9ff8-e4db81c148a6",
  browse: "https://engine.rewst.io/webhooks/custom/trigger/019f3d42-9452-7181-b74d-9cd202860b1d/01976967-f419-7877-9ff8-e4db81c148a6",
  getRecord: "https://engine.rewst.io/webhooks/custom/trigger/019f3d43-ffa6-77f9-93ef-4f792a80d2a4/01976967-f419-7877-9ff8-e4db81c148a6",
};

// Must match the origin index.html is actually served from.
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

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const rewstUrl = REWST_WEBHOOKS[action];

    if (!rewstUrl) {
      return new Response(JSON.stringify({ error: "Unknown action: " + action }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const body = await request.text();

    let rewstRes;
    try {
      // redirect: "follow" is the default, but explicit here since
      // following the wait_for_results:true 303 is the entire point of
      // this proxy — a browser can't do this hop itself (see header
      // comment), but a server-to-server fetch isn't subject to CORS.
      rewstRes = await fetch(rewstUrl, {
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
