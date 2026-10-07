"use client";

import { CalendarIcon, LensIcon, TicketIcon } from "./icons";

/**
 * The icons of the app's sections (A10), as in Carta's sidebar: outlined at rest, filled on the
 * section you are in, and each moves in its own way when pointed at (the link is the `ic-host`).
 * Cut-outs in a filled icon take the colour behind it from `--ic-cut`.
 */
export type NavIconName = "home" | "requests" | "events" | "tasks" | "contacts" | "search" | "links" | "profile" | "team" | "availability";

const CUT = "var(--ic-cut, var(--color-app))";

export function NavIcon({ name, filled }: { name: NavIconName; filled: boolean }) {
  switch (name) {
    case "home":
      return <HomeIcon filled={filled} />;
    case "requests":
      return <InboxIcon filled={filled} />;
    case "events":
      return <TicketIcon filled={filled} size={20} className="nav-tug" />;
    case "tasks":
      return <TasksIcon filled={filled} />;
    case "contacts":
      return <ContactsIcon filled={filled} />;
    case "search":
      return <LensIcon filled={filled} className="shrink-0" />;
    case "links":
      return <LinksIcon filled={filled} />;
    case "profile":
      return <PersonIcon filled={filled} />;
    case "team":
      return <TeamIcon filled={filled} />;
    case "availability":
      return <CalendarIcon filled={filled} play={false} size={20} />;
  }
}

/** Home: the house crouches, hops and lands. */
function HomeIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-home shrink-0">
      <g className="hm-body">
        <path
          d="M3.75 8.75L10 3.5l6.25 5.25v6.75a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill={filled ? "currentColor" : "none"}
        />
        <path d="M8.25 17.25v-3.5a1.75 1.75 0 0 1 3.5 0v3.5" stroke={filled ? CUT : "currentColor"} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Richieste: a request drops into the tray with a turn and the tray gives. */
function InboxIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-inbox shrink-0">
      <g className="ib-tray">
        <path
          d="M2.75 11.25l2.1-5.6a1.75 1.75 0 0 1 1.64-1.15h7.02a1.75 1.75 0 0 1 1.64 1.15l2.1 5.6v3.5a1.75 1.75 0 0 1-1.75 1.75H4.5a1.75 1.75 0 0 1-1.75-1.75Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          fill={filled ? "currentColor" : "none"}
        />
        <path d="M2.75 11.25h3.75l1 1.75h5l1-1.75h3.75" stroke={filled ? CUT : "currentColor"} strokeWidth="1.5" strokeLinejoin="round" />
      </g>
      <path className="ib-sheet" d="M7.5 8.5h5" stroke={filled ? CUT : "currentColor"} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Attività: the tick draws itself again. */
function TasksIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden className="ic-tasks shrink-0">
      <rect x="3.25" y="3.25" width="13.5" height="13.5" rx="3" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
      <path className="ts-tick" d="M6.75 10.25l2.25 2.25 4.25-4.75" stroke={filled ? CUT : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Rubrica: the card on its rings lifts its page and the person on it nods. */
function ContactsIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-contacts shrink-0">
      <g className="ct-card">
        <rect x="4.25" y="2.75" width="12" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
        <g className="ct-person">
          <circle cx="10.25" cy="8.25" r="2" stroke={filled ? CUT : "currentColor"} strokeWidth="1.5" />
          <path d="M7 13.75a3.25 3.25 0 0 1 6.5 0" stroke={filled ? CUT : "currentColor"} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </g>
      <path d="M2.75 6.5h2.5M2.75 13.5h2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Collegate: the two links pull apart a little and snap back together. */
function LinksIcon({ filled }: { filled: boolean }) {
  const w = filled ? "2" : "1.5";
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-links shrink-0">
      <path className="lk-a" d="M9.25 6l1.5-1.5a3.18 3.18 0 0 1 4.5 4.5l-1.5 1.5" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
      <path className="lk-b" d="M10.75 14l-1.5 1.5a3.18 3.18 0 0 1-4.5-4.5l1.5-1.5" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
      <path className="lk-mid" d="M8 12l4-4" stroke="currentColor" strokeWidth={w} strokeLinecap="round" />
    </svg>
  );
}

/** Profilo: the head nods, damped; the shoulders follow. */
function PersonIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-person shrink-0">
      <circle className="ps-head" cx="10" cy="6.75" r="3.25" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
      <path className="ps-body" d="M3.75 17a6.25 6.25 0 0 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={filled ? "currentColor" : "none"} />
    </svg>
  );
}

/** Team: the two heads nod one after the other. */
function TeamIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" overflow="visible" aria-hidden className="ic-team shrink-0">
      <g className="tm-back">
        <circle cx="13.75" cy="6.5" r="2.25" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
        <path d="M13.25 11.3a4.25 4.25 0 0 1 4.5 4.2v.75h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g className="tm-front">
        <circle cx="7.75" cy="7.25" r="2.75" stroke="currentColor" strokeWidth="1.5" fill={filled ? "currentColor" : "none"} />
        <path d="M2.5 16.75a5.25 5.25 0 0 1 10.5 0Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={filled ? "currentColor" : "none"} />
      </g>
    </svg>
  );
}
