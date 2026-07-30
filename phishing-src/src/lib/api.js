// All calls go through the Cloudflare Worker proxy (cloudflare-worker.js,
// deployed as cbm-phishing-proxy), never straight to Rewst — see this
// project's CLAUDE.md "Rewst transport" section for why.
const PROXY_URL = "https://cbm-phishing-proxy.chas-dea.workers.dev";

// Single synchronous call: the Rewst workflow classifies the input,
// enriches it (VirusTotal/URLScan/Safe Browsing/RDAP), gets a Claude
// verdict, and returns it all in one response — no request_id, no
// polling, nothing persisted. Can take up to ~30s (URLScan sandbox scan),
// so callers should show a loading state for the duration of this call.
export async function triage({ submittedInput, submitter, clientTenant }) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      submitted_input: submittedInput,
      submitter: submitter || "",
      client_tenant: clientTenant || "",
    }),
  });
  const rawText = await res.text();
  console.log("Proxy response — status:", res.status, "| raw:", JSON.stringify(rawText).slice(0, 500));
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  if (!rawText) throw new Error("The proxy returned an empty response.");
  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    throw new Error("The proxy response wasn't valid JSON: " + rawText.slice(0, 200));
  }
  // Rewst nests everything under "final_response", with the AI verdict
  // schema (verdict/confidence/reasoning/recommended_action) one level
  // deeper as its own "verdict" key — flatten that here so downstream
  // components (ResultsView, VerdictBadge) can just read verdict.verdict,
  // verdict.confidence, verdict.urls, etc. off one object.
  const fr = data && data.final_response;
  if (!fr || !fr.verdict) throw new Error("The response was missing a verdict.");
  return {
    ...fr.verdict,
    input_type: fr.input_type,
    urls: fr.urls,
    email_signals: fr.email_signals,
  };
}
