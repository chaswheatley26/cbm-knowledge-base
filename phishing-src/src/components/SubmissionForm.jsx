import { useState } from "react";
import { Loader2, AlertCircle, Send } from "lucide-react";
import styles from "../styles.js";
import Field from "./Field.jsx";

// One box, either a bare URL or a full pasted email — Rewst classifies which
// it got and branches evidence-gathering accordingly. Deliberately not two
// separate modes: techs shouldn't have to pre-classify what they're pasting.
export default function SubmissionForm({ onSubmit }) {
  const [submittedInput, setSubmittedInput] = useState("");
  const [submitter, setSubmitter] = useState("");
  const [clientTenant, setClientTenant] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!submittedInput.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit({ submittedInput: submittedInput.trim(), submitter: submitter.trim(), clientTenant: clientTenant.trim() });
    } catch (err) {
      setError(err.message || "Something went wrong submitting this.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={styles.heroWrap}>
      <h1 style={styles.heroTitle}>Is this safe?</h1>
      <p style={styles.heroSub}>
        Paste a suspicious link, or the entire email if that's what you've got — subject, sender, body, all of it.
      </p>
      <div style={styles.pasteCard}>
        <Field label="Link or email">
          <textarea
            style={styles.textarea}
            placeholder={"https://example.com/suspicious-link\n\n— or —\n\nFrom: \"IT Support\" <support@totally-legit-example.com>\nSubject: Urgent: verify your account\n..."}
            value={submittedInput}
            onChange={(e) => setSubmittedInput(e.target.value)}
            rows={8}
            disabled={busy}
          />
        </Field>
        <div style={{ display: "flex", gap: 14, marginTop: 14 }}>
          <div style={{ flex: 1 }}>
            <Field label="Your name">
              <input style={styles.input} value={submitter} onChange={(e) => setSubmitter(e.target.value)} disabled={busy} placeholder="Optional" />
            </Field>
          </div>
          <div style={{ flex: 1 }}>
            <Field label="Client / tenant">
              <input style={styles.input} value={clientTenant} onChange={(e) => setClientTenant(e.target.value)} disabled={busy} placeholder="Optional" />
            </Field>
          </div>
        </div>
        {error ? (
          <div style={styles.errorBox}>
            <AlertCircle size={16} />
            {error}
          </div>
        ) : null}
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 14 }}>
          <button
            type="submit"
            style={{ ...styles.primaryBtn, ...(busy || !submittedInput.trim() ? styles.primaryBtnDisabled : {}) }}
            disabled={busy || !submittedInput.trim()}
          >
            {busy ? <Loader2 size={16} style={styles.spinIcon} /> : <Send size={16} />}
            {busy ? "Checking…" : "Check it"}
          </button>
          {busy ? <span style={styles.centerHint}>Can take up to 30s for a full URLScan sandbox scan</span> : null}
        </div>
      </div>
    </form>
  );
}
