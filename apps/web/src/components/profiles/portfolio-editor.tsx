"use client";

import { Button, Field, Input, Notice } from "@/components/ui";
import {
  createPortfolioPhoto,
  deletePortfolioItem,
  deletePortfolioPhoto,
  discardPortfolioPhoto,
  finishPortfolioUpload,
  makeCoverPhoto,
  savePortfolioItem,
  type FormState,
} from "@/lib/profile-actions";
import type { PortfolioItem } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/client";
import { isAllowedPortfolioPhoto, PORTFOLIO_ACCEPT, PORTFOLIO_BUCKET, PORTFOLIO_MAX_PHOTOS } from "@i-events/core";
import { useRouter } from "next/navigation";
import { useActionState, useId, useRef, useState, useTransition } from "react";
import { itemMeta } from "./portfolio-format";

/** Title, client, place and month of a job; empty for a new one. */
function ItemForm({ item, onSaved }: { item?: PortfolioItem; onSaved?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const next = await savePortfolioItem(prev, form);
    if (next.ok) onSaved?.();
    return next;
  }, {});
  const f = state.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {item && <input type="hidden" name="id" value={item.id} />}
      <Field label="Nome del lavoro" error={f.title} hint="Ad esempio: Convention annuale, 800 ospiti">
        <Input name="title" defaultValue={item?.title} maxLength={160} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Per chi" error={f.client_name} hint="Facoltativo">
          <Input name="client_name" defaultValue={item?.client_name ?? ""} maxLength={120} />
        </Field>
        <Field label="Dove" error={f.city}>
          <Input name="city" defaultValue={item?.city ?? ""} maxLength={120} />
        </Field>
        <Field label="Quando" error={f.happened_on}>
          <Input name="happened_on" type="month" defaultValue={item?.happened_on?.slice(0, 7) ?? ""} />
        </Field>
      </div>
      <Field label="Racconto" error={f.description} hint="Cosa avete fatto e cosa ha reso speciale il lavoro">
        <textarea
          name="description"
          defaultValue={item?.description}
          rows={3}
          maxLength={2000}
          className="rounded-ui border border-border bg-bg p-3"
        />
      </Field>
      {state.error && !Object.keys(f).length && <Notice tone="error">{state.error}</Notice>}
      {state.ok && item && <Notice tone="success">Lavoro salvato.</Notice>}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        {item ? "Salva" : "Aggiungi al portfolio"}
      </Button>
    </form>
  );
}

/** Uploads photos straight from the browser, after the server has registered each one. */
function PhotoUploader({ itemId, title, room }: { itemId: string; title: string; room: number }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function upload(files: FileList) {
    start(async () => {
      const supabase = createClient();
      const problems: string[] = [];
      const chosen = Array.from(files);
      if (chosen.length > room) problems.push(`Puoi aggiungere ancora ${room === 1 ? "1 foto" : `${room} foto`} a questo lavoro.`);
      for (const file of chosen.slice(0, room)) {
        if (!isAllowedPortfolioPhoto(file.type, file.size)) {
          problems.push(`${file.name}: usa foto JPG, PNG o WebP fino a 10 MB.`);
          continue;
        }
        const created = await createPortfolioPhoto({ itemId, mimeType: file.type, size: file.size });
        if (!created.id || !created.path) {
          problems.push(`${file.name}: ${created.error ?? "caricamento non riuscito."}`);
          continue;
        }
        const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(created.path, file, { contentType: file.type });
        if (error) {
          await discardPortfolioPhoto(created.id);
          problems.push(`${file.name}: caricamento non riuscito.`);
        }
      }
      setErrors(problems);
      if (input.current) input.current.value = "";
      await finishPortfolioUpload();
      router.refresh();
    });
  }

  if (room <= 0) return <p className="text-sm text-muted">Hai raggiunto le {PORTFOLIO_MAX_PHOTOS} foto per questo lavoro.</p>;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        Aggiungi foto<span className="sr-only"> a {title}</span>
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={PORTFOLIO_ACCEPT}
        disabled={pending}
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
        className="text-sm"
      />
      <span className="text-sm text-muted">{pending ? "Caricamento…" : "JPG, PNG o WebP, fino a 10 MB ciascuna."}</span>
      {errors.map((e) => (
        <Notice key={e} tone="error">
          {e}
        </Notice>
      ))}
    </div>
  );
}

function EditableItem({ item }: { item: PortfolioItem }) {
  const [editing, setEditing] = useState(false);
  const meta = itemMeta(item);
  return (
    <li className="flex flex-col gap-4 py-5" aria-label={item.title}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">{item.title}</h3>
          {meta && <p className="text-sm text-muted">{meta}</p>}
          {item.description && <p className="mt-1 whitespace-pre-line text-sm">{item.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing((v) => !v)} aria-expanded={editing}>
            {editing ? "Chiudi" : "Modifica"}
          </Button>
          <form action={deletePortfolioItem}>
            <input type="hidden" name="id" value={item.id} />
            <Button
              type="submit"
              variant="danger"
              aria-label={`Elimina ${item.title}`}
              onClick={(e) => {
                if (!confirm(`Eliminare "${item.title}" e le sue foto dal portfolio?`)) e.preventDefault();
              }}
            >
              Elimina
            </Button>
          </form>
        </div>
      </div>
      {editing && <ItemForm item={item} onSaved={() => setEditing(false)} />}
      {item.photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {item.photos.map((p, i) => (
            <li key={p.id} className="flex flex-col gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, already sized by the upload limit */}
              <img
                src={p.url}
                alt={`${item.title}, foto ${i + 1}`}
                loading="lazy"
                className="aspect-[4/3] w-full rounded-ui border border-border object-cover"
              />
              <div className="flex flex-wrap gap-x-3 text-xs">
                {i === 0 ? (
                  <span className="text-muted">Copertina</span>
                ) : (
                  <form action={makeCoverPhoto}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" className="underline">
                      Usa come copertina
                    </button>
                  </form>
                )}
                <form action={deletePortfolioPhoto}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-danger underline" aria-label={`Elimina foto ${i + 1} di ${item.title}`}>
                    Elimina
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PhotoUploader itemId={item.id} title={item.title} room={PORTFOLIO_MAX_PHOTOS - item.photos.length} />
    </li>
  );
}

/** The owner's portfolio: past jobs with photos, shown on the public profile. */
export function PortfolioEditor({ items }: { items: PortfolioItem[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {items.length > 0 && (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <EditableItem key={item.id} item={item} />
          ))}
        </ul>
      )}
      {adding ? (
        <div className="rounded-ui bg-surface p-4">
          <ItemForm onSaved={() => setAdding(false)} />
        </div>
      ) : (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)} className="self-start">
          Aggiungi un lavoro
        </Button>
      )}
    </div>
  );
}
