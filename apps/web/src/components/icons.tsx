"use client";

import { useEffect, useRef, useState, type Ref } from "react";

/**
 * Icons in motion (A10, "Carta e inchiostro"). Each icon is drawn in parts that move on their own,
 * like paper and metal would: the bell swings from its top and the clapper follows late, the ticket
 * tears along its perforation, the calendar loses a sheet, the compass needle settles. They move
 * only when something happens (an arrival, a tap, a section opened); the CSS is under A10 in
 * globals.css, and with Riduci movimento every icon is simply in its final state.
 */

/** True from the moment `on` turns true after the first render, so a mount never animates. */
export function useBecame(on: boolean) {
  const first = useRef(true);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPlay(on);
  }, [on]);
  return play;
}

/** The bell: the class `is-ringing` swings it once with the clapper and two sound lines; hovering its host nudges it. */
export function BellIcon({ ref }: { ref?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-bell shrink-0">
      <g className="bell-body">
        <path d="M10 1.75V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5 8a5 5 0 0 1 10 0v3.5l1.5 2.5h-13L5 11.5V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path className="bell-clapper" d="M8 16.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <path className="bell-wave" d="M1.75 5.5q-1.25 2.75 0 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <path className="bell-wave bell-wave-r" d="M18.25 5.5q1.25 2.75 0 5.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

const STUB = "M9.5 5.75H5A1.75 1.75 0 0 0 3.25 7.5v2.25a2.25 2.25 0 0 1 0 4.5v2.25A1.75 1.75 0 0 0 5 18.25h4.5";
const BODY = "M9.5 5.75H19a1.75 1.75 0 0 1 1.75 1.75v2.25a2.25 2.25 0 0 0 0 4.5v2.25A1.75 1.75 0 0 1 19 18.25H9.5";
/** The ragged line of a tear, five teeth down the perforation: both halves keep the same line, so they fit. */
const RAGGED = "M9.5 5.75" + " l.6 1.25 -.6 1.25".repeat(5);

/**
 * The ticket: a stub and a body that meet at the perforation. `torn` leaves the stub hanging off a
 * ragged edge (an arrival checked in); `tug` tears it and lets it snap back (the section opened).
 */
export function TicketIcon({ filled = false, torn = false, tug = false, size = 24 }: { filled?: boolean; torn?: boolean; tug?: boolean; size?: number }) {
  const motion = useTearMotion(torn);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" overflow="visible" aria-hidden className={`ic-ticket shrink-0 ${tug ? "is-tug" : motion}`}>
      <g className="tk-body">
        <path d={BODY} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={filled ? "currentColor" : "none"} />
        <path className="tk-perf" d="M9.5 8.5v7" stroke={filled ? "var(--color-app)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1.5 2" />
        <path className="tk-edge" d={RAGGED} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      </g>
      <g className="tk-stub">
        <path d={STUB} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={filled ? "currentColor" : "none"} />
        <path className="tk-edge" d={RAGGED} stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** "is-torn" as first drawn, then "is-tear" or "is-mend" each time the state flips. */
function useTearMotion(torn: boolean) {
  const prev = useRef(torn);
  const [motion, setMotion] = useState(torn ? "is-torn" : "");
  useEffect(() => {
    if (prev.current === torn) return;
    prev.current = torn;
    setMotion(torn ? "is-tear" : "is-mend");
  }, [torn]);
  return motion;
}

/** The compass of Esplora: when the section opens, the needle swings round and settles on north. */
export function CompassIcon({ filled, play }: { filled: boolean; play: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className={`ic-compass shrink-0 ${play ? "is-play" : ""}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
      <path
        className="cp-needle"
        d="M15.5 8.5l-2 5-5 2 2-5 5-2z"
        stroke={filled ? "var(--color-app)" : "currentColor"}
        fill={filled ? "var(--color-app)" : "none"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The calendar: when the section opens, today's sheet tears off the pad and falls away. */
export function CalendarIcon({ filled, play }: { filled: boolean; play: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" overflow="visible" aria-hidden className={`ic-calendar shrink-0 ${play ? "is-play" : ""}`}>
      <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
      <path className="cal-rings" d="M8 3.25v4M16 3.25v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3.75 10h16.5" stroke={filled ? "var(--color-app)" : "currentColor"} strokeWidth="1.5" />
      <path
        className="cal-sheet"
        d="M3.75 10h16.5v7.75a2.5 2.5 0 0 1-2.5 2.5H6.25a2.5 2.5 0 0 1-2.5-2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "var(--color-app)"}
      />
    </svg>
  );
}

/** The lens of a search field: on focus it sweeps once, as if looking around, and catches the light. */
export function LensIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={`ic-lens ${className ?? ""}`}>
      <g className="lens-glass">
        <circle cx="8.5" cy="8.5" r="5.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12.5 12.5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path className="lens-glint" d="M6 7.25a2.75 2.75 0 0 1 2.25-2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Menu: the three lines fold into a cross and back. */
export function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={`ic-menu shrink-0 ${open ? "is-open" : ""}`}>
      <path className="mn-top" d="M3.5 6h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="mn-mid" d="M3.5 10h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="mn-bot" d="M3.5 14h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Copy: tapping slides a copy out of the sheet behind, then the sheets fold into a tick that draws
 * itself; after 1.5 s the sheets come back.
 */
export function CopyIcon({ phase }: { phase: "idle" | "copying" | "done" }) {
  if (phase === "done")
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="ic-copy shrink-0">
        <path className="cp-tick" d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" overflow="visible" aria-hidden className={`ic-copy shrink-0 ${phase === "copying" ? "is-copying" : ""}`}>
      <path className="cp-back" d="M10.75 3.25v-.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect className="cp-front" x="5.25" y="5.25" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** Invia: pointing at it lifts the plane; the class `is-sent` (a message gone) flies it off and brings a new one in. */
export function SendIcon({ ref }: { ref?: Ref<SVGSVGElement> }) {
  return (
    <svg ref={ref} width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-send shrink-0">
      <path className="snd-trail" d="M2.75 17.25l3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <g className="snd-plane">
        <path d="M17.25 2.75L2.75 8.5l5.75 3 3 5.75 5.75-14.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8.5 11.5l8.75-8.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** Messaggio: while the reply field has focus the bubble pops and its three dots type. */
export function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="ic-message shrink-0">
      <g className="bb-body">
        <path d="M5 3.75h10a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2H9.25L5.5 17.25v-3H5a2 2 0 0 1-2-2v-6.5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle className="bb-dot" cx="7" cy="9" r="1" fill="currentColor" />
        <circle className="bb-dot" cx="10" cy="9" r="1" fill="currentColor" />
        <circle className="bb-dot" cx="13" cy="9" r="1" fill="currentColor" />
      </g>
    </svg>
  );
}

/** Elimina: pointing at the button lifts the lid on its hinge, ready to take the item. */
export function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-trash shrink-0">
      <g className="tr-lid">
        <path d="M3.25 5.5h13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7.75 5.5V4A1.25 1.25 0 0 1 9 2.75h2A1.25 1.25 0 0 1 12.25 4v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      <path d="M4.75 5.5l.75 10.25a1.75 1.75 0 0 0 1.75 1.5h5.5a1.75 1.75 0 0 0 1.75-1.5l.75-10.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 8.75v5.25M11.5 8.75v5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Importa: pointing at it drops the arrow into the tray, which gives a little, and a new arrow comes down. */
export function ImportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="ic-import shrink-0">
      <path className="im-arrow" d="M10 2.75v9.25M6.25 8.5L10 12.25l3.75-3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="im-tray" d="M3 12.25v2.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Salva, the draft's sheet: while saving its lines write themselves; once saved they give way to a
 * tick that draws itself (only when a save has just finished, not when the page opens on a saved draft).
 */
export function SaveIcon({ saving, saved }: { saving: boolean; saved: boolean }) {
  const fresh = useBecame(saved && !saving);
  const state = saving ? "is-saving" : saved ? `is-saved ${fresh ? "is-fresh" : ""}` : "";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className={`ic-save shrink-0 ${state}`}>
      <path d="M5.5 2.75h5.75l4 4v9.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.25 2.75v3a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path className="sv-line" d="M7.25 10.5h5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="sv-line sv-line-2" d="M7.25 13.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path className="sv-tick" d="M7 12.25l2.25 2.25 4-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Luogo: pointing at the place, the pin crouches, hops and lands, and the ground answers with a ring. */
export function PlaceIcon({ className }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className={`ic-place shrink-0 ${className ?? ""}`}>
      <ellipse className="pl-ground" cx="10" cy="18.25" rx="3.25" ry="0.75" stroke="currentColor" strokeWidth="1.25" />
      <g className="pl-pin">
        <path d="M10 17.5s5.5-4.6 5.5-9a5.5 5.5 0 0 0-11 0c0 4.4 5.5 9 5.5 9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

const GEAR =
  "M8.75 4.39L9.12 2.55H10.88L11.25 4.39L13.08 5.15L14.64 4.11L15.89 5.36L14.85 6.92L15.61 8.75L17.45 9.12V10.88L15.61 11.25L14.85 13.08L15.89 14.64L14.64 15.89L13.08 14.85L11.25 15.61L10.88 17.45H9.12L8.75 15.61L6.92 14.85L5.36 15.89L4.11 14.64L5.15 13.08L4.39 11.25L2.55 10.88V9.12L4.39 8.75L5.15 6.92L4.11 5.36L5.36 4.11L6.92 5.15Z";

/** Impostazioni: pointing at it turns the gear by one tooth, with the weight of metal: it runs past and settles. */
export function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="ic-gear shrink-0">
      <g className="gr-wheel">
        <path d={GEAR} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      </g>
    </svg>
  );
}
