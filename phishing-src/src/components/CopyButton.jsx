import { useState } from "react";
import { Copy, CheckCircle2 } from "lucide-react";
import styles from "../styles.js";

export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      return; // clipboard permission denied or unavailable — fail silently
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button style={styles.copyBtn} onClick={copy}>
      {copied ? (
        <>
          <CheckCircle2 size={13} /> Copied
        </>
      ) : (
        <>
          <Copy size={13} /> Copy
        </>
      )}
    </button>
  );
}
