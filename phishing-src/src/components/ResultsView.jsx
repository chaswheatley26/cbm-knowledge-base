import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import styles from "../styles.js";
import { checkStatus } from "../lib/api.js";
import Section from "./Section.jsx";
import CopyButton from "./CopyButton.jsx";
import VerdictBadge from "./VerdictBadge.jsx";

const POLL_INTERVAL_MS = 4000;

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
  return (
    <div style={styles.metaTag}>
      <strong>{label}:</strong>&nbsp;{source.summary || JSON.stringify(source)}
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

  useEffect(() => {
    let cancelled = false;

    async function poll() {
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

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [requestId]);

  return (
    <div style={styles.heroWrap}>
      <button style={styles.backBtn} onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>

      {error ? (
        <div style={styles.errorBox}>
          <AlertCircle size={16} />
          {error}
        </div>
      ) : status === "pending" ? (
        <div style={styles.centerCol}>
          <Loader2 size={28} style={styles.spinIcon} />
          <div style={styles.centerHint}>Checking — URLScan can take up to 30s for a full sandbox scan…</div>
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
