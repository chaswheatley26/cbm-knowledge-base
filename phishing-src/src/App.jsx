import { useState } from "react";
import styles from "./styles.js";
import CbmMark from "./components/CbmMark.jsx";
import SubmissionForm from "./components/SubmissionForm.jsx";
import ResultsView from "./components/ResultsView.jsx";
import { triage } from "./lib/api.js";

// Screens: "submit" (form, stays mounted through the ~30s wait so a failed
// request doesn't lose what the tech typed) -> "results" (the verdict).
// No history tab and nothing keyed by request_id — there's no
// persistence layer, so there's nothing to poll for or list.
export default function App() {
  const [screen, setScreen] = useState("submit");
  const [verdict, setVerdict] = useState(null);

  async function handleSubmit(payload) {
    const result = await triage(payload);
    setVerdict(result);
    setScreen("results");
  }

  function backToSubmit() {
    setScreen("submit");
    setVerdict(null);
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
        {screen === "results" && verdict && <ResultsView verdict={verdict} onBack={backToSubmit} />}
      </main>
    </div>
  );
}
