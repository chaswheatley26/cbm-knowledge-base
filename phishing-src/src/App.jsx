import { useState } from "react";
import styles from "./styles.js";
import CbmMark from "./components/CbmMark.jsx";
import SubmissionForm from "./components/SubmissionForm.jsx";
import ResultsView from "./components/ResultsView.jsx";
import { submitTriage } from "./lib/api.js";

// Screens: "submit" (form) -> "results" (polling view for one request_id).
// No history tab — there's still no persisted, browsable submission log
// (Rewst deletes the transient per-request result once ResultsView reads
// it), just a short-lived lookup for the one submission in flight.
export default function App() {
  const [screen, setScreen] = useState("submit");
  const [activeRequestId, setActiveRequestId] = useState(null);

  async function handleSubmit(payload) {
    const requestId = await submitTriage(payload);
    setActiveRequestId(requestId);
    setScreen("results");
  }

  function backToSubmit() {
    setScreen("submit");
    setActiveRequestId(null);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.brand} onClick={backToSubmit}>
            <div style={styles.logoMark}>
              <CbmMark size={22} />
            </div>
            <div>
              <div style={styles.brandName}>CBM IT</div>
              <div style={styles.brandSub}>Link &amp; Email Triage</div>
            </div>
          </div>
        </div>
      </header>
      <main style={styles.main}>
        {screen === "submit" && <SubmissionForm onSubmit={handleSubmit} />}
        {screen === "results" && activeRequestId && <ResultsView requestId={activeRequestId} onBack={backToSubmit} />}
      </main>
    </div>
  );
}
