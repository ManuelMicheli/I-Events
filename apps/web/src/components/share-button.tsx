"use client";

import { ShareIcon } from "./icons";
import { useEffect, useRef, useState } from "react";

/**
 * Share a link (A10): on phones it opens the system share sheet, elsewhere it copies the link and
 * says so for 1.5 s. Each tap sends the wave from the sharing node.
 */
export function ShareButton({ label, text, url }: { label: string; text: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const icon = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const share = async () => {
    const svg = icon.current?.firstElementChild;
    if (svg) {
      svg.classList.remove("is-play");
      void svg.getBoundingClientRect();
      svg.classList.add("is-play");
    }
    if (navigator.share) {
      // A cancelled share sheet rejects: nothing to do.
      await navigator.share({ text, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };

  return (
    <button type="button" className="ic-host inline-flex items-center gap-1 underline" onClick={share}>
      <span ref={icon} className="inline-flex">
        <ShareIcon />
      </span>
      <span aria-live="polite">{copied ? "Link copiato" : label}</span>
    </button>
  );
}
