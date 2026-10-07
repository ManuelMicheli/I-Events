"use client";

import { useState } from "react";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** An agency's or supplier's logo on a square tile; its initials when there is none or it fails to load. */
export function OrgLogo({ name, src, size = "m" }: { name: string; src: string | null; size?: "m" | "l" }) {
  const [failed, setFailed] = useState(false);
  const box = size === "l" ? "size-16 text-xl" : "size-10 text-sm";
  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center overflow-hidden rounded-ui border border-border bg-bg font-semibold text-muted`}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- logos come from the organizations' own sites, any host
        <img
          src={src}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain p-1.5"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
