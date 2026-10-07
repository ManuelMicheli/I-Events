import { EVENT_TYPE_INFO, type CoverPattern, type EventType } from "@i-events/core";
import type { CSSProperties, ReactNode } from "react";

/**
 * The event's ink on screen ("Carta e inchiostro"): the 8 px type square, the neutral type chip,
 * the generated cover and the header band. Inks never go on buttons, links, states or selection.
 */
const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

function inkVars(type: EventType): CSSProperties {
  const { ink } = EVENT_TYPE_INFO[type];
  return { "--ink-fill": ink.fill, "--ink-fill-dark": ink.darkFill } as CSSProperties;
}

/** "Il punto è il live, il quadratino è il tipo": 8x8, radius 2, in the ink's fill tone. */
export function TypeSquare({ type, className }: { type: EventType | null; className?: string }) {
  if (!type) return null;
  return (
    <span
      aria-hidden
      style={inkVars(type)}
      className={cx("inline-block size-2 shrink-0 rounded-[2px] bg-[var(--ink-fill)] dark:bg-[var(--ink-fill-dark)]", className)}
    />
  );
}

/** The type next to a title: a neutral chip with the square, never a coloured pill (those are states). */
export function TypeChip({ type }: { type: EventType | null }) {
  if (!type) return null;
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border-strong bg-bg px-3 text-label">
      <TypeSquare type={type} />
      {EVENT_TYPE_INFO[type].label}
    </span>
  );
}

/** A title with the type square in front, for lists. The type is also read out, not only shown. */
export function TypedTitle({ type, children }: { type: EventType | null; children: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-2">
      {type && (
        <span className="relative top-[-1px] inline-flex">
          <TypeSquare type={type} />
          <span className="sr-only">{EVENT_TYPE_INFO[type].label}: </span>
        </span>
      )}
      <span className="min-w-0">{children}</span>
    </span>
  );
}

/**
 * Generated cover: deep ink background and a tone-on-tone texture. With a title the texture keeps
 * to the right half and the title sits bottom left in white; without one it fills the square.
 */
export function EventCover({ type, title, className }: { type: EventType; title?: string; className?: string }) {
  const { ink, pattern } = EVENT_TYPE_INFO[type];
  return (
    <div
      aria-hidden={title ? undefined : true}
      className={cx("relative shrink-0 overflow-hidden dark:ring-1 dark:ring-[rgba(241,236,228,0.08)] dark:ring-inset", className)}
      style={{ backgroundColor: ink.deep }}
    >
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className={cx("absolute inset-y-0 right-0 h-full", title ? "w-1/2" : "w-full")}
        fill="none"
        stroke="currentColor"
        style={{ color: ink.text }}
        strokeWidth={title ? 3 : 4}
      >
        {/* A8: on hover the texture slides 4 px along the diagonal, as if the ticket moved under the light. */}
        <g className="motion-safe:transition-transform motion-safe:duration-[240ms] motion-safe:ease-out motion-safe:group-hover:translate-x-[8px] motion-safe:group-hover:-translate-y-[8px]">
          <Pattern pattern={pattern} />
        </g>
      </svg>
      {title && (
        <p className="absolute bottom-4 left-4 right-[45%] text-xl font-semibold text-white sm:bottom-6 sm:left-6">{title}</p>
      )}
    </div>
  );
}

/** Six textures from circles, lines and arcs: records, a spotlight, the audience, arcades, the stage, lanes. */
function Pattern({ pattern }: { pattern: CoverPattern }) {
  switch (pattern) {
    case "rings":
      return (
        <>
          {[16, 32, 48, 64, 80, 96, 112, 128].map((r) => (
            <circle key={r} cx={100} cy={100} r={r} />
          ))}
        </>
      );
    case "rays":
      return (
        <>
          {[8, 20, 32, 44, 56, 68, 80].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return <line key={deg} x1={100} y1={0} x2={100 - 160 * Math.cos(a)} y2={160 * Math.sin(a)} />;
          })}
        </>
      );
    case "dots":
      return (
        <g fill="currentColor" stroke="none">
          {Array.from({ length: 49 }, (_, i) => (
            <circle key={i} cx={8 + (i % 7) * 14} cy={8 + Math.floor(i / 7) * 14} r={2.5} />
          ))}
        </g>
      );
    case "arches":
      return (
        <>
          <path d="M8 104V50a20 20 0 0 1 40 0v54M15 104V50a13 13 0 0 1 26 0v54" />
          <path d="M52 104V50a20 20 0 0 1 40 0v54M59 104V50a13 13 0 0 1 26 0v54" />
        </>
      );
    case "frames":
      return (
        <>
          {[6, 18, 30, 42].map((d) => (
            <rect key={d} x={d} y={d} width={100 - 2 * d} height={100 - 2 * d} rx={4} />
          ))}
        </>
      );
    case "lanes":
      return (
        <>
          {Array.from({ length: 13 }, (_, i) => -96 + i * 16).map((x) => (
            <line key={x} x1={x} y1={100} x2={x + 100} y2={0} />
          ))}
        </>
      );
  }
}

/**
 * Header of an event space: the 4 px ink band on top, then the way back, the cover next to the
 * title block and the status on the right. Without a type it is the same header, monochrome.
 */
export function EventHeader({ type, back, aside, children }: { type: EventType | null; back: ReactNode; aside?: ReactNode; children: ReactNode }) {
  return (
    <header className="flex flex-col gap-4">
      {type && <div aria-hidden style={inkVars(type)} className="h-1 rounded-full bg-[var(--ink-fill)] dark:bg-[var(--ink-fill-dark)]" />}
      <div className="flex flex-col gap-2">
        <div>{back}</div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {type && <EventCover type={type} className="size-12 rounded-ui sm:size-16" />}
            <div className="flex min-w-0 flex-col gap-1">{children}</div>
          </div>
          {aside}
        </div>
      </div>
    </header>
  );
}
