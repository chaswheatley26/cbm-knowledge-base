import { useState } from "react";
import { ChevronLeft, Sun, Moon } from "lucide-react";
import styles from "./styles.js";
import CbmMark from "./components/CbmMark.jsx";
import SubmissionForm from "./components/SubmissionForm.jsx";
import ResultsView from "./components/ResultsView.jsx";
import { submitTriage } from "./lib/api.js";

// Shared with the landing page and the KB tool via the same "cbm-theme"
// localStorage key (all three are same-origin GitHub Pages paths, so
// localStorage is genuinely shared) — a theme choice made on any one of
// them applies everywhere. index.html's inline head script already sets
// document.documentElement's data-theme before this app mounts, so reading
// it here on init just picks up whatever was already applied (no flash of
// the wrong theme).
function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute("data-theme") || "light");
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("cbm-theme", next); } catch (e) {}
    setTheme(next);
  }
  return [theme, toggleTheme];
}

// Screens: "submit" (form) -> "results" (polling view for one request_id).
// No history tab — there's still no persisted, browsable submission log
// (Rewst deletes the transient per-request result once ResultsView reads
// it), just a short-lived lookup for the one submission in flight.
export default function App() {
  const [screen, setScreen] = useState("submit");
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [theme, toggleTheme] = useTheme();

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
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <a href="../" style={styles.homeLink}><ChevronLeft size={16} /> CBM IT</a>
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
          <button style={styles.themeToggle} onClick={toggleTheme} aria-label="Toggle dark mode" title="Toggle dark mode">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {screen === "submit" && <SubmissionForm onSubmit={handleSubmit} />}
        {screen === "results" && activeRequestId && <ResultsView requestId={activeRequestId} onBack={backToSubmit} />}
      </main>
    </div>
  );
}
