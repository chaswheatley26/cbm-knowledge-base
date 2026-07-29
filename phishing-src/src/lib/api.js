// All calls go through the Cloudflare Worker proxy (cloudflare-worker.js,
// deployed as cbm-phishing-proxy), never straight to Rewst — see this
// project's CLAUDE.md "Rewst transport" section for why.
const PROXY_URL = "https://cbm-phishing-proxy.REPLACE_ME.workers.dev";

async function callProxy(action, body) {
  const res = await fetch(`${PROXY_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  console.log("Proxy response for", action, "— status:", res.status, "| raw:", JSON.stringify(rawText).slice(0, 500));
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  if (!rawText) throw new Error("The proxy returned an empty response.");
  try {
    return JSON.parse(rawText);
  } catch (e) {
    throw new Error("The proxy response wasn't valid JSON: " + rawText.slice(0, 200));
  }
}

// Kicks off triage in the background; the Worker generates and returns the
// request_id itself (never relies on Rewst's fire-and-forget trigger ack,
// which is unreliable — see CLAUDE.md). Rewst does its enrichment/verdict
// work asynchronously and stores the result keyed by this request_id.
export async function submitTriage({ submittedInput, submitter, clientTenant }) {
  const data = await callProxy("submit", {
    submitted_input: submittedInput,
    submitter: submitter || "",
    client_tenant: clientTenant || "",
  });
  if (!data || !data.request_id) throw new Error("The proxy didn't return a request_id.");
  return data.request_id;
}

// Polled on an interval by ResultsView while status is "pending".
export async function checkStatus(requestId) {
  const data = await callProxy("checkStatus", { request_id: requestId });
  if (!data || !data.status) throw new Error("The proxy response was missing a status field.");
  return data; // { status: "pending" } | { status: "complete", verdict: {...} }
}

// Not in the original spec's two-webhook design — added because the History
// table needs a way to list past submissions for other techs, same as the KB
// tool's "browse" action. This is a fast synchronous lookup (wait_for_results:
// true), no polling needed.
export async function listHistory({ clientTenant } = {}) {
  const data = await callProxy("listHistory", { client_tenant: clientTenant || "" });
  return (data && data.submissions) || [];
}
