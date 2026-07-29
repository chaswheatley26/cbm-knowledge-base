import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import styles from "../styles.js";
import VerdictBadge from "./VerdictBadge.jsx";
import { listHistory } from "../lib/api.js";

export default function HistoryTable({ onOpenResult }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listHistory()
      .then(setRows)
      .catch((err) => setError(err.message || "Couldn't load history."));
  }, []);

  if (error) {
    return (
      <div style={styles.errorBox}>
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }
  if (!rows) {
    return (
      <div style={styles.center}>
        <Loader2 size={22} style={styles.spinIcon} />
      </div>
    );
  }
  if (rows.length === 0) {
    return <p style={styles.bodyTextMuted}>No submissions logged yet.</p>;
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Submitted</th>
          <th style={styles.th}>Input</th>
          <th style={styles.th}>Submitter</th>
          <th style={styles.th}>Client</th>
          <th style={styles.th}>Verdict</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.request_id} style={styles.rowClickable} onClick={() => onOpenResult(row.request_id)}>
            <td style={styles.td}>{row.submitted_at}</td>
            <td style={styles.td}>{row.input_preview}</td>
            <td style={styles.td}>{row.submitter || "—"}</td>
            <td style={styles.td}>{row.client_tenant || "—"}</td>
            <td style={styles.td}>
              <VerdictBadge verdict={row.verdict} confidence={row.confidence} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
