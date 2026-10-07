"use client";

import { CopyIcon } from "./icons";
import { useEffect, useState } from "react";

/** Copy a link (A6, A10): a copy slides out of the sheet, the icon becomes a tick, back after 1.5 s. */
export function CopyButton({ text }: { text: string }) {
  const [phase, setPhase] = useState<"idle" | "copying" | "done">("idle");
  useEffect(() => {
    if (phase === "idle") return;
    const t = setTimeout(() => setPhase(phase === "copying" ? "done" : "idle"), phase === "copying" ? 200 : 1500);
    return () => clearTimeout(t);
  }, [phase]);
  return (
    <button type="button" className="ic-host inline-flex items-center gap-1 underline" onClick={() => navigator.clipboard.writeText(text).then(() => setPhase("copying"))}>
      <CopyIcon phase={phase} />
      {phase === "done" ? "Copiato" : "Copia"}
    </button>
  );
}
