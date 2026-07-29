import styles from "../styles.js";

// Same tier-color values as the KB tool's ConfidenceBadge (green/amber/grey),
// extended with a red tier for "malicious" — reusing colors already in this
// design system (red matches styles.errorBox) rather than introducing a new one.
const VERDICT_STYLES = {
  malicious: { bg: "#fdeceb", fg: "#b4271e", label: "Malicious" },
  suspicious: { bg: "#fdf0e3", fg: "#a85a16", label: "Suspicious" },
  benign: { bg: "#e6f4ec", fg: "#1b7a44", label: "Benign" },
  insufficient_data: { bg: "#eef1f7", fg: "#5a6479", label: "Insufficient data" },
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
