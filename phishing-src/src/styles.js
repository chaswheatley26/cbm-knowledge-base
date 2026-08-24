// Same palette/values as the CBM Knowledge Base tool (cbm-knowledge-base/kb/app-source.jsx)
// for visual consistency across CBM's internal tools. Colors reference CSS
// custom properties defined in index.html (light values on :root, dark
// overrides on :root[data-theme="dark"]) rather than literal hex, so the
// theme toggle in App.jsx repaints the whole app — same token set/values as
// the KB tool, kept in sync deliberately.
const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "var(--text)" },
  header: { background: "var(--surface)", borderBottom: "1px solid var(--border)", flexShrink: 0, zIndex: 10 },
  headerInner: { maxWidth: 880, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 },
  brand: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  homeLink: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13.5, fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none", flexShrink: 0 },
  logoMark: { width: 40, height: 40, borderRadius: 11, background: "var(--logo-bg)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px var(--shadow-md)" },
  brandName: { fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" },
  brandSub: { fontSize: 12.5, color: "var(--text-muted)" },
  themeToggle: { display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", flexShrink: 0 },
  main: { maxWidth: 880, margin: "0 auto", padding: "28px 24px 60px", width: "100%", flex: 1 },

  heroWrap: { maxWidth: 680, margin: "0 auto" },
  heroTitle: { fontSize: 25, fontWeight: 750, margin: "0 0 6px", letterSpacing: "-0.02em" },
  heroSub: { fontSize: 14.5, color: "var(--text-muted)", margin: "0 0 18px", lineHeight: 1.5 },

  pasteCard: { background: "var(--surface)", border: "1px solid var(--border-input)", borderRadius: 14, padding: "18px 20px" },
  field: { marginTop: 0 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 650, color: "var(--text-secondary)", marginBottom: 7 },
  input: { width: "100%", border: "1px solid var(--border-input)", borderRadius: 11, padding: "11px 14px", fontSize: 14.5, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)" },
  textarea: { width: "100%", border: "1px solid var(--border-input)", borderRadius: 11, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", resize: "vertical", color: "var(--text)", lineHeight: 1.55, minHeight: 140 },
  select: { width: "100%", border: "1px solid var(--border-input)", borderRadius: 11, padding: "11px 14px", fontSize: 14.5, fontFamily: "inherit", color: "var(--text)", background: "var(--surface)" },

  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "var(--navy-fill)", color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontSize: 14.5, fontWeight: 650, cursor: "pointer", boxShadow: "0 3px 10px var(--shadow-navy)" },
  primaryBtnDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border-input)", borderRadius: 11, padding: "11px 20px", fontSize: 14.5, fontWeight: 650, cursor: "pointer" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 14px" },

  errorBox: { display: "flex", alignItems: "center", gap: 8, background: "var(--danger-bg)", color: "var(--danger-fg)", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, marginTop: 12 },
  warnBox: { background: "var(--warn-bg-soft)", border: "1px solid var(--warn-border)", borderRadius: 14, padding: "16px" },
  warnHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 650, color: "var(--warn-fg)", marginBottom: 8 },

  card: { textAlign: "left", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", display: "block", width: "100%" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 7 },
  cardTitle: { fontWeight: 650, fontSize: 15.5, letterSpacing: "-0.01em" },
  cardMeta: { display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" },
  metaTag: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-secondary)", background: "var(--chip-bg)", padding: "3px 9px", borderRadius: 7 },
  cardPreview: { margin: 0, fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 },
  pill: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 650, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 },

  center: { display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "var(--navy-text)" },
  centerCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0", color: "var(--navy-text)" },
  centerHint: { fontSize: 13, color: "var(--text-faint)", fontWeight: 600 },

  list: { display: "flex", flexDirection: "column", gap: 12 },

  detailCard: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "26px 28px" },
  detailHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 10 },
  detailTitle: { fontSize: 21, fontWeight: 750, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.3 },
  detailMeta: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" },
  section: { marginTop: 22 },
  sectionLabelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  sectionLabel: { fontSize: 11.5, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 650, color: "var(--text-secondary)", background: "var(--chip-bg)", border: "none", padding: "5px 10px", borderRadius: 7, cursor: "pointer" },
  bodyTextMuted: { fontSize: 14, lineHeight: 1.6, margin: 0, color: "var(--text-muted)" },
  stepsList: { margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 },
  stepItem: { fontSize: 14.5, lineHeight: 1.6, color: "var(--text)" },
  summaryText: { margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", color: "var(--text)", background: "var(--code-bg)", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px" },
  screenshot: { width: "100%", borderRadius: 10, border: "1px solid var(--border)", display: "block" },

  spinIcon: { animation: "spin 0.9s linear infinite" },
};

export default styles;
