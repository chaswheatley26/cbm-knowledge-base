// Same palette/values as the CBM Knowledge Base tool (cbm-knowledge-base/kb/app-source.jsx)
// for visual consistency across CBM's internal tools.
const styles = {
  page: { minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f7fb", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: "#1a2238" },
  header: { background: "#fff", borderBottom: "1px solid #e6eaf2", flexShrink: 0, zIndex: 10 },
  headerInner: { maxWidth: 880, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 },
  brand: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer" },
  logoMark: { width: 40, height: 40, borderRadius: 11, background: "#fff", border: "1px solid #e6eaf2", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(20,30,60,0.08)" },
  brandName: { fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" },
  brandSub: { fontSize: 12.5, color: "#7a8499" },
  navTabs: { display: "flex", gap: 4, background: "#f5f7fb", borderRadius: 12, padding: 4 },
  navTab: { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", borderRadius: 9, padding: "8px 14px", fontSize: 13.5, fontWeight: 650, color: "#5a6479", cursor: "pointer" },
  navTabActive: { background: "#fff", color: "#2b3d6b", boxShadow: "0 1px 4px rgba(20,30,60,0.08)" },
  main: { maxWidth: 880, margin: "0 auto", padding: "28px 24px 60px", width: "100%", flex: 1 },

  heroWrap: { maxWidth: 680, margin: "0 auto" },
  heroTitle: { fontSize: 25, fontWeight: 750, margin: "0 0 6px", letterSpacing: "-0.02em" },
  heroSub: { fontSize: 14.5, color: "#7a8499", margin: "0 0 18px", lineHeight: 1.5 },

  pasteCard: { background: "#fff", border: "1px solid #d8deea", borderRadius: 14, padding: "18px 20px" },
  field: { marginTop: 0 },
  fieldLabel: { display: "block", fontSize: 12.5, fontWeight: 650, color: "#5a6479", marginBottom: 7 },
  input: { width: "100%", border: "1px solid #d8deea", borderRadius: 11, padding: "11px 14px", fontSize: 14.5, fontFamily: "inherit", color: "#1a2238", background: "#fff" },
  textarea: { width: "100%", border: "1px solid #d8deea", borderRadius: 11, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", resize: "vertical", color: "#1a2238", lineHeight: 1.55, minHeight: 140 },
  select: { width: "100%", border: "1px solid #d8deea", borderRadius: 11, padding: "11px 14px", fontSize: 14.5, fontFamily: "inherit", color: "#1a2238", background: "#fff" },

  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#2b3d6b", color: "#fff", border: "none", borderRadius: 11, padding: "11px 20px", fontSize: 14.5, fontWeight: 650, cursor: "pointer", boxShadow: "0 3px 10px rgba(43,61,107,0.25)" },
  primaryBtnDisabled: { opacity: 0.55, cursor: "not-allowed", boxShadow: "none" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: "#5a6479", border: "1px solid #d8deea", borderRadius: 11, padding: "11px 20px", fontSize: 14.5, fontWeight: 650, cursor: "pointer" },
  backBtn: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: "#5a6479", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "0 0 14px" },

  errorBox: { display: "flex", alignItems: "center", gap: 8, background: "#fdeceb", color: "#b4271e", borderRadius: 10, padding: "11px 14px", fontSize: 13.5, marginTop: 12 },
  warnBox: { background: "#fdf6e9", border: "1px solid #f0dfae", borderRadius: 14, padding: "16px" },
  warnHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 650, color: "#a85a16", marginBottom: 8 },

  card: { textAlign: "left", background: "#fff", border: "1px solid #e6eaf2", borderRadius: 14, padding: "16px 18px", display: "block", width: "100%" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 7 },
  cardTitle: { fontWeight: 650, fontSize: 15.5, letterSpacing: "-0.01em" },
  cardMeta: { display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" },
  metaTag: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#5a6479", background: "#f0f3f9", padding: "3px 9px", borderRadius: 7 },
  cardPreview: { margin: 0, fontSize: 13.5, color: "#6b7488", lineHeight: 1.5 },
  pill: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 650, padding: "4px 10px", borderRadius: 20, whiteSpace: "nowrap", flexShrink: 0 },

  center: { display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", color: "#2b3d6b" },
  centerCol: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "60px 0", color: "#2b3d6b" },
  centerHint: { fontSize: 13, color: "#9aa3b5", fontWeight: 600 },

  list: { display: "flex", flexDirection: "column", gap: 12 },

  detailCard: { background: "#fff", border: "1px solid #e6eaf2", borderRadius: 16, padding: "26px 28px" },
  detailHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 10 },
  detailTitle: { fontSize: 21, fontWeight: 750, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.3 },
  detailMeta: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6, alignItems: "center" },
  section: { marginTop: 22 },
  sectionLabelRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  sectionLabel: { fontSize: 11.5, fontWeight: 700, color: "#9aa3b5", textTransform: "uppercase", letterSpacing: "0.06em" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 650, color: "#5a6479", background: "#f0f3f9", border: "none", padding: "5px 10px", borderRadius: 7, cursor: "pointer" },
  bodyTextMuted: { fontSize: 14, lineHeight: 1.6, margin: 0, color: "#7a8499" },
  stepsList: { margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 },
  stepItem: { fontSize: 14.5, lineHeight: 1.6, color: "#2a3346" },
  summaryText: { margin: 0, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", color: "#2a3346", background: "#fafbfe", border: "1px solid #e6ecf7", borderRadius: 9, padding: "12px 14px" },
  screenshot: { width: "100%", borderRadius: 10, border: "1px solid #e6eaf2", display: "block" },

  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "#9aa3b5", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 12px", borderBottom: "1px solid #e6eaf2" },
  td: { padding: "12px 12px", fontSize: 14, color: "#1a2238", borderBottom: "1px solid #eef1f7" },
  rowClickable: { cursor: "pointer" },

  spinIcon: { animation: "spin 0.9s linear infinite" },
};

export default styles;
