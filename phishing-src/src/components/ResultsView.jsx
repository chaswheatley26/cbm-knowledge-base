import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import styles from "../styles.js";
import { checkStatus } from "../lib/api.js";
import Section from "./Section.jsx";
import CopyButton from "./CopyButton.jsx";
import VerdictBadge from "./VerdictBadge.jsx";

// Per Rewst's suggested polling schedule: the enrichment chain runs
// 60-90s in the happy path, so there's no point polling immediately or
// aggressively. 3-minute timeout leaves headroom above the happy-path
// range without leaving a tech staring at a spinner indefinitely if
// something actually stalls.
const INITIAL_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 12000;
const TIMEOUT_MS = 3 * 60 * 1000;

// Any enrichment source that failed/timed out is shown as its own visible
// row — never silently dropped or read as "clean". See CLAUDE.md "Known
// failure modes" / project spec section 5.
function SourceRow({ label, source }) {
  if (!source) return null;
  if (source.status === "failed" || source.status === "timeout") {
    return (
      <div style={{ ...styles.errorBox, marginTop: 8 }}>
        <AlertCircle size={14} />
        {label}: {source.status === "timeout" ? "timed out" : "failed"} — not factored into the verdict
      </div>
    );
  }
  // Some enrichment sources have been observed returning a nested object
  // for `summary` instead of a plain string (e.g. Safe Browsing wrapping
  // its own {status, summary}) — stringify anything that isn't already a
  // string so this never throws "Objects are not valid as a React child".
  const summaryText =
    typeof source.summary === "string" ? source.summary : source.summary ? JSON.stringify(source.summary) : JSON.stringify(source);
  return (
    <div style={styles.metaTag}>
      <strong>{label}:</strong>&nbsp;{summaryText}
    </div>
  );
}

function EvidenceForUrl({ entry }) {
  return (
    <div style={{ ...styles.card, marginBottom: 12 }}>
      <div style={styles.cardTitle}>{entry.url}</div>
      {entry.urlscan?.screenshot_url ? (
        <img src={entry.urlscan.screenshot_url} alt={`URLScan screenshot of ${entry.url}`} style={{ ...styles.screenshot, marginTop: 10, marginBottom: 10 }} />
      ) : null}
      <div style={styles.cardMeta}>
        <SourceRow label="VirusTotal" source={entry.virustotal} />
        <SourceRow label="Safe Browsing" source={entry.safe_browsing} />
        <SourceRow label="Domain age (RDAP)" source={entry.rdap} />
      </div>
    </div>
  );
}

export default function ResultsView({ requestId, onBack }) {
  const [status, setStatus] = useState("pending");
  const [verdict, setVerdict] = useState(null);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    startedAtRef.current = Date.now();

    async function poll() {
      if (cancelled) return;
      if (Date.now() - startedAtRef.current > TIMEOUT_MS) {
        setError("This is taking longer than expected (over 3 minutes). The enrichment chain may have stalled — try again, or check this request's execution in Rewst.");
        return;
      }
      try {
        const data = await checkStatus(requestId);
        if (cancelled) return;
        if (data.status === "complete") {
          setStatus("complete");
          setVerdict(data.verdict);
        } else {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Lost connection while checking status.");
      }
    }

    timerRef.current = setTimeout(poll, INITIAL_DELAY_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [requestId]);

  return (
    <div style={styles.heroWrap}>
      <button style={styles.backBtn} onClick={onBack}>
        <ChevronLeft size={16} /> Check another
      </button>

      {error ? (
        <div style={styles.errorBox}>
          <AlertCircle size={16} />
          {error}
        </div>
      ) : status === "pending" ? (
        <div style={styles.centerCol}>
          <Loader2 size={28} style={styles.spinIcon} />
          <div style={styles.centerHint}>Checking — full enrichment can take 60-90 seconds…</div>
        </div>
      ) : (
        <div style={styles.detailCard}>
          <div style={styles.detailHead}>
            <h2 style={styles.detailTitle}>Verdict</h2>
            <VerdictBadge verdict={verdict.verdict} confidence={verdict.confidence} />
          </div>

          <Section label="Reasoning">
            <p style={styles.bodyTextMuted}>{verdict.reasoning}</p>
          </Section>

          <Section label="Recommended action">
            <p style={styles.bodyTextMuted}>{verdict.recommended_action}</p>
          </Section>

          {verdict.email_signals ? (
            <Section label="Email signals">
              <p style={styles.bodyTextMuted}>{verdict.email_signals.notes}</p>
            </Section>
          ) : null}

          <Section label="Raw evidence" action={<CopyButton text={JSON.stringify(verdict, null, 2)} />}>
            {(verdict.urls || []).map((entry) => (
              <EvidenceForUrl key={entry.url} entry={entry} />
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}
