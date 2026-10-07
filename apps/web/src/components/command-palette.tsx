"use client";

import { searchApp, type SearchHit } from "@/lib/search-actions";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { LensIcon } from "./icons";
import { NavIcon, type NavIconName } from "./nav-icons";
import type { NavItem } from "./shell-nav";

type Row = { href: string; title: string; meta?: string; group: string; icon: NavIconName };

const GROUP_ICON: Record<SearchHit["group"], NavIconName> = { Richieste: "requests", Eventi: "events", Rubrica: "contacts" };
const noSubscribe = () => () => {};
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Search (Carta item 22, A3): the field in the top bar, or ⌘K / Ctrl K anywhere, opens a palette that
 * goes to a section or finds requests, events and contacts by name. Results cascade in.
 */
export function CommandPalette({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const mac = useSyncExternalStore(noSubscribe, () => /Mac|iPhone|iPad/.test(navigator.userAgent), () => true);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Ask the server 150 ms after the last key; an older answer never overwrites a newer one.
  const asked = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const type = (value: string) => {
    setQuery(value);
    setActive(0);
    clearTimeout(timer.current);
    const q = value.trim();
    const n = ++asked.current;
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const found = await searchApp(q).catch(() => []);
      if (n !== asked.current) return;
      setHits(found);
      setActive(0);
      setSearching(false);
    }, 150);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const rows = useMemo<Row[]>(() => {
    const q = fold(query.trim());
    const sections = items.filter((i) => !q || fold(i.label).includes(q)).map((i) => ({ href: i.href, title: i.label, group: q ? "Sezioni" : "Vai a", icon: i.icon }));
    return [...sections, ...hits.map((h) => ({ ...h, icon: GROUP_ICON[h.group] }))];
  }, [items, query, hits]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    type("");
    trigger.current?.focus();
  };
  const go = (row: Row | undefined) => {
    if (!row) return;
    setOpen(false);
    type("");
    router.push(row.href);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(rows[active]);
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  const groups = rows.reduce<{ name: string; rows: (Row & { i: number })[] }[]>((acc, r, i) => {
    const last = acc[acc.length - 1];
    if (last?.name === r.group) last.rows.push({ ...r, i });
    else acc.push({ name: r.group, rows: [{ ...r, i }] });
    return acc;
  }, []);
  const shortcut = mac ? "⌘K" : "Ctrl K";

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Trova richieste, eventi e contatti"
        aria-keyshortcuts="Meta+K Control+K"
        className="ic-host flex size-11 shrink-0 items-center justify-center rounded-ui text-muted hover:bg-surface hover:text-text md:h-10 md:w-[280px] md:justify-start md:gap-2 md:border md:border-border-strong md:bg-bg md:px-3 md:hover:border-control md:hover:bg-bg"
      >
        <LensIcon className="shrink-0" />
        <span className="hidden flex-1 truncate text-left text-sm md:block">Cerca…</span>
        <kbd className="hidden h-6 items-center rounded-[4px] border border-border-strong px-1.5 font-mono text-xs text-muted md:inline-flex">{shortcut}</kbd>
      </button>
      {open &&
        createPortal(
        <div className="fixed inset-0 z-40 px-4 pt-[min(12vh,96px)]" onKeyDown={onKey}>
          <div className="veil absolute inset-0" onClick={close} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Cerca" className="palette relative mx-auto flex max-h-[min(560px,calc(100dvh-120px))] w-full max-w-[640px] flex-col overflow-hidden rounded-card border border-border bg-bg shadow-3">
            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
              <LensIcon className="shrink-0 text-muted" />
              <input
                ref={input}
                value={query}
                onChange={(e) => type(e.target.value)}
                role="combobox"
                aria-expanded
                aria-controls={`${id}-list`}
                aria-activedescendant={rows[active] ? `${id}-${active}` : undefined}
                aria-autocomplete="list"
                aria-label="Cerca sezioni, richieste, eventi e contatti"
                placeholder="Cerca richieste, eventi, contatti…"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
              />
              <button type="button" onClick={close} className="flex h-8 shrink-0 items-center rounded-[4px] border border-border-strong px-1.5 font-mono text-xs text-muted hover:text-text">
                Esc
              </button>
            </div>
            <div ref={list} id={`${id}-list`} role="listbox" aria-label="Risultati" className="min-h-0 flex-1 overflow-y-auto p-2">
              {groups.map((g) => (
                <div key={g.name} role="group" aria-label={g.name} className="mb-1 last:mb-0">
                  <p aria-hidden className="px-2 pt-2 pb-1 text-xs text-muted">
                    {g.name}
                  </p>
                  <div className="cascade">
                    {g.rows.map((r) => (
                      <div
                        key={`${r.group}-${r.href}`}
                        id={`${id}-${r.i}`}
                        data-i={r.i}
                        role="option"
                        aria-selected={r.i === active}
                        onPointerMove={() => setActive(r.i)}
                        onClick={() => go(r)}
                        className={`ic-host flex min-h-11 cursor-pointer items-center gap-3 rounded-[8px] px-2 text-sm [--ic-cut:var(--color-surface)] ${r.i === active ? "bg-surface" : ""}`}
                      >
                        <span className="text-muted">
                          <NavIcon name={r.icon} filled={false} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{r.title}</span>
                        {r.meta && <span className="hidden max-w-[45%] shrink-0 truncate text-xs text-muted sm:block">{r.meta}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {searching && rows.length === 0 && <p className="px-2 py-6 text-center text-sm text-muted">Cerco…</p>}
              {!searching && rows.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted">
                  Nessun risultato per <span className="text-text">“{query.trim()}”</span>
                </p>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
