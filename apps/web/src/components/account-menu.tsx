"use client";

import { switchOrganization } from "@/lib/org-actions";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "./avatar";
import { LogoutIcon, PlusIcon } from "./icons";

export type AccountOrg = { id: string; name: string; type: string };

type Props = { name: string; email: string; org: AccountOrg; orgs: AccountOrg[]; variant: "side" | "bar" };

const ITEM =
  "ic-host flex min-h-11 w-full items-center gap-2 rounded-[8px] px-2 text-left text-sm text-text outline-none hover:bg-surface focus-visible:bg-surface lg:min-h-8";

/**
 * Who you are and where you work (Carta items 8 and 11): the avatar in the top bar and the user block
 * at the foot of the sidebar open the same menu, with the organisations, Nuovo account and Esci.
 */
export function AccountMenu({ name, email, org, orgs, variant }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();

  const items = () => Array.from(root.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? []);

  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  const onKey = (e: KeyboardEvent) => {
    if (!open) return;
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const go = (i: number) => all[(i + all.length) % all.length]?.focus();
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      go(at + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      go(at - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      go(0);
    } else if (e.key === "End") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={root} onKeyDown={onKey} className={variant === "side" ? "relative" : "relative shrink-0"}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={variant === "bar" ? `Account di ${name}` : undefined}
        onClick={() => setOpen(!open)}
        className={
          variant === "side"
            ? "flex min-h-12 w-full items-center gap-3 rounded-[8px] px-2 text-left hover:bg-surface aria-expanded:bg-surface"
            : "flex size-11 items-center justify-center rounded-full hover:bg-surface aria-expanded:bg-surface"
        }
      >
        <Avatar name={name} />
        {variant === "side" && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted">{org.name}</span>
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-muted">
              <path d="M5 6.25L8 3.5l3 2.75M5 9.75L8 12.5l3-2.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          aria-label="Account"
          className={`absolute z-30 flex w-[280px] max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-ui border border-border bg-bg p-1 shadow-2 ${
            variant === "side" ? "pop-up bottom-full left-0 mb-2" : "pop-down top-full right-0 mt-2"
          }`}
        >
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar name={name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted">{email}</p>
            </div>
          </div>
          <hr className="my-1 border-border" />
          {orgs.length > 1 ? (
            <div role="group" aria-labelledby={`${id}-orgs`}>
              <p id={`${id}-orgs`} className="px-2 pt-1 pb-1 text-xs text-muted">
                Organizzazione
              </p>
              <div className="max-h-60 overflow-y-auto">
              {orgs.map((o) => (
                <form key={o.id} action={switchOrganization}>
                  <input type="hidden" name="orgId" value={o.id} />
                  <button type="submit" role="menuitemradio" aria-checked={o.id === org.id} tabIndex={-1} className={ITEM}>
                    <span className="min-w-0 flex-1 truncate">
                      {o.name} <span className="text-muted">· {o.type}</span>
                    </span>
                    {o.id === org.id && (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
                        <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </form>
              ))}
              </div>
            </div>
          ) : (
            <p className="truncate px-2 py-1 text-xs text-muted">
              {org.name} · {org.type}
            </p>
          )}
          <Link href="/onboarding" role="menuitem" tabIndex={-1} onClick={() => setOpen(false)} className={ITEM}>
            <PlusIcon />
            Nuovo account
          </Link>
          <hr className="my-1 border-border" />
          <form action="/auth/signout" method="post">
            <button type="submit" role="menuitem" tabIndex={-1} className={ITEM}>
              <LogoutIcon />
              Esci
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
