// All calls go through the Cloudflare Worker proxy (cloudflare-worker.js,
// deployed as cbm-phishing-proxy), never straight to Rewst — see this
// project's CLAUDE.md "Rewst transport" section for why.
const PROXY_URL = "https://cbm-phishing-proxy.chas-dea.workers.dev";

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
// which is unreliable — see CLAUDE.md). Rewst does the enrichment/verdict
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

// The result object may arrive under a few different keys depending on how
// Rewst wraps its trigger output — this has already changed shape once in
// testing (see CLAUDE.md), so this stays deliberately lenient rather than
// assuming one exact wrapper.
const RESULT_KEYS = ["result", "final_response", "output", "data"];

function extractResult(data) {
  for (const key of RESULT_KEYS) {
    if (data && typeof data[key] === "object" && data[key] !== null) return data[key];
  }
  return data;
}

// Flattens { verdict: { verdict, confidence, reasoning, recommended_action },
// input_type, urls, email_signals } into one object so components can read
// verdict.verdict, verdict.confidence, verdict.urls, etc. directly.
function normalizeVerdict(fr) {
  if (!fr || !fr.verdict) return null;
  return {
    ...fr.verdict,
    input_type: fr.input_type,
    urls: fr.urls,
    email_signals: fr.email_signals,
  };
}

// Polled on an interval by ResultsView while status is "pending".
export async function checkStatus(requestId) {
  const data = await callProxy("poll", { request_id: requestId });
  if (data && data.status === "pending") return { status: "pending" };

  const verdict = normalizeVerdict(extractResult(data));
  if (!verdict) throw new Error("The response was missing a verdict.");
  return { status: "complete", verdict };
}
