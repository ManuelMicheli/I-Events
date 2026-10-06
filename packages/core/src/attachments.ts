/** Files on requests and proposals. The same limits are enforced by the storage bucket. */
export const ATTACHMENTS_BUCKET = "attachments";
export const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
  "application/zip",
] as const;

/** Extensions offered by the file picker; browsers sometimes report an empty type for these. */
export const ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip";

export function isAllowedAttachment(type: string, size: number): boolean {
  return size > 0 && size <= ATTACHMENT_MAX_BYTES && (ATTACHMENT_MIME_TYPES as readonly string[]).includes(type);
}

/** Storage keys allow a restricted alphabet: "Planimetria sala è.pdf" becomes "Planimetria-sala-e.pdf". */
export function storageSafeName(name: string): string {
  const safe = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|-+$/g, "");
  if (!safe) return "file";
  if (safe.length <= 120) return safe;
  const dot = safe.lastIndexOf(".");
  const ext = dot > 0 && safe.length - dot <= 10 ? safe.slice(dot) : "";
  return safe.slice(0, 120 - ext.length) + ext;
}

export function formatBytes(bytes: number, locale = "it-IT"): string {
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${fmt.format(bytes / 1024)} KB`;
  return `${fmt.format(bytes / 1024 / 1024)} MB`;
}
