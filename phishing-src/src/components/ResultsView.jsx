import { AlertCircle, ChevronLeft } from "lucide-react";
import styles from "../styles.js";
import Section from "./Section.jsx";
import CopyButton from "./CopyButton.jsx";
import VerdictBadge from "./VerdictBadge.jsx";

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

// Pure display component — the wait already happened inside the single
// synchronous triage() call, so there's nothing left to fetch or poll
// here, just the resolved verdict to render.
export default function ResultsView({ verdict, onBack }) {
  return (
    <div style={styles.heroWrap}>
      <button style={styles.backBtn} onClick={onBack}>
        <ChevronLeft size={16} /> Check another
      </button>

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
    </div>
  );
}
