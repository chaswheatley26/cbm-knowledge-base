import styles from "../styles.js";

export default function Section({ label, action, children }) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionLabelRow}>
        <div style={styles.sectionLabel}>{label}</div>
        {action}
      </div>
      {children}
    </div>
  );
}
