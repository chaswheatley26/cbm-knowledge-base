import { useState } from "react";
import { History } from "lucide-react";
import styles from "./styles.js";
import CbmMark from "./components/CbmMark.jsx";
import SubmissionForm from "./components/SubmissionForm.jsx";
import ResultsView from "./components/ResultsView.jsx";
import HistoryTable from "./components/HistoryTable.jsx";
import { submitTriage } from "./lib/api.js";

// Screens: "submit" (form) -> "results" (polling view for one request_id),
// plus a standalone "history" tab. Not a router — this is a single-purpose
// internal tool, plain useState is enough.
export default function App() {
  const [screen, setScreen] = useState("submit");
  const [activeRequestId, setActiveRequestId] = useState(null);

  async function handleSubmit(payload) {
    const requestId = await submitTriage(payload);
    setActiveRequestId(requestId);
    setScreen("results");
  }

  function openResult(requestId) {
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
          <div style={styles.navTabs}>
            <button
              style={{ ...styles.navTab, ...(screen === "submit" || screen === "results" ? styles.navTabActive : {}) }}
              onClick={backToSubmit}
            >
              Check something
            </button>
            <button
              style={{ ...styles.navTab, ...(screen === "history" ? styles.navTabActive : {}) }}
              onClick={() => setScreen("history")}
            >
              <History size={14} /> History
            </button>
          </div>
        </div>
      </header>
      <main style={styles.main}>
        {screen === "submit" && <SubmissionForm onSubmit={handleSubmit} />}
        {screen === "results" && activeRequestId && <ResultsView requestId={activeRequestId} onBack={backToSubmit} />}
        {screen === "history" && (
          <div style={styles.heroWrap}>
            <h1 style={styles.heroTitle}>History</h1>
            <p style={styles.heroSub}>Past submissions and their verdicts.</p>
            <HistoryTable onOpenResult={openResult} />
          </div>
        )}
      </main>
    </div>
  );
}
