/** Email digest of pending notifications: one message per person, whatever the number of updates. */

export type DigestItem = { id: string; title: string; body: string | null; createdAt: string };
export type DigestInput = { fullName: string; locale: string; items: DigestItem[] };
export type Digest = { subject: string; text: string; html: string };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Each item links to /notifiche/{id}, which marks it read and opens the right page in the right account. */
export function buildDigest({ fullName, items }: DigestInput, siteUrl: string): Digest {
  if (items.length === 0) throw new Error("empty digest");
  const base = siteUrl.replace(/\/$/, "");
  const first = items[0]!;
  const subject = items.length === 1 ? first.title : `${items.length} novità su I-Events`;
  const greeting = fullName.trim() ? `Ciao ${fullName.trim().split(/\s+/)[0]},` : "Ciao,";
  const intro = items.length === 1 ? "c'è una novità su I-Events:" : `ci sono ${items.length} novità su I-Events:`;
  const all = `${base}/notifiche`;

  const text = [
    greeting,
    intro,
    "",
    ...items.flatMap((i) => [`• ${i.title}${i.body ? `: ${i.body}` : ""}`, `  ${base}/notifiche/${i.id}`]),
    "",
    `Tutte le notifiche: ${all}`,
    "Puoi disattivare queste email dalla pagina Notifiche.",
  ].join("\n");

  const rows = items
    .map(
      (i) =>
        `<li style="margin:0 0 16px"><a href="${base}/notifiche/${i.id}" style="color:#111;font-weight:600">${escapeHtml(i.title)}</a>` +
        (i.body ? `<br><span style="color:#555">${escapeHtml(i.body)}</span>` : "") +
        `</li>`,
    )
    .join("");
  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:560px">` +
    `<p>${escapeHtml(greeting)}<br>${escapeHtml(intro)}</p><ul style="padding-left:18px">${rows}</ul>` +
    `<p><a href="${all}">Apri tutte le notifiche</a></p>` +
    `<p style="color:#777;font-size:13px">Puoi disattivare queste email dalla pagina Notifiche di I-Events.</p></div>`;

  return { subject, text, html };
}
