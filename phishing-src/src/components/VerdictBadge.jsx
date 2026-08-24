import styles from "../styles.js";

// Same tier-color values as the KB tool's ConfidenceBadge (green/amber/grey),
// extended with a red tier for "malicious" — reusing colors already in this
// design system (red matches styles.errorBox) rather than introducing a new one.
const VERDICT_STYLES = {
  malicious: { bg: "var(--danger-bg)", fg: "var(--danger-fg)", label: "Malicious" },
  suspicious: { bg: "var(--warn-bg)", fg: "var(--warn-fg)", label: "Suspicious" },
  benign: { bg: "var(--success-bg)", fg: "var(--success-fg)", label: "Benign" },
  insufficient_data: { bg: "var(--chip-bg-alt)", fg: "var(--text-secondary)", label: "Insufficient data" },
};

export default function VerdictBadge({ verdict, confidence }) {
  const v = VERDICT_STYLES[verdict];
  if (!v) return null;
  return (
    <span style={{ ...styles.pill, background: v.bg, color: v.fg, fontSize: 13, padding: "6px 14px" }}>
      {v.label}
      {confidence !== undefined && confidence !== null && confidence !== "" ? ` · ${confidence}% confidence` : ""}
    </span>
  );
}
