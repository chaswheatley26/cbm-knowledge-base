// Ported verbatim from cbm-knowledge-base/kb/app-source.jsx — keep in sync if
// the KB tool's mark ever changes, so both tools' logos stay identical.
export default function CbmMark({ size = 26 }) {
  const NAVY = "#2b3d6b", GOLD = "#c9a938";
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="CBM">
      <path d="M40 10 L66 10 Q70 10 69 14 L60 44 Q59 48 55 48 L29 48 Q25 48 26 44 L35 14 Q36 10 40 10 Z" fill={GOLD} />
      <path d="M58 40 L80 40 Q84 40 83 44 L72 86 Q71 90 67 90 L45 90 Q41 90 42 86 L53 44 Q54 40 58 40 Z" fill={NAVY} />
      <path d="M58 62 L74 68 L67 71 L72 80 L68 82 L63 73 L57 77 Z" fill="#fff" />
    </svg>
  );
}
