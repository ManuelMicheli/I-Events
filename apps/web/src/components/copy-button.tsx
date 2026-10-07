"use client";

import { useEffect, useState } from "react";

/** Copy a link (A6): the icon becomes a tick, then comes back after 1.5 s. */
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [used, setUsed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => navigator.clipboard.writeText(text).then(() => (setUsed(true), setCopied(true)))}>
      <svg key={String(copied)} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className={used ? "icon-in shrink-0" : "shrink-0"}>
        {copied ? (
          <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <>
            <rect x="5.25" y="5.25" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.75 3.25v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </>
        )}
      </svg>
      {copied ? "Copiato" : "Copia"}
    </button>
  );
}
