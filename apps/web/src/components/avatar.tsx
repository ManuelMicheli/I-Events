/** Avatar (Carta item 8): initials on carta/100 in 24, 32, 40 or 56, optionally with the live dot. */
const SIZE = {
  24: "size-6 text-[10px]",
  32: "size-8 text-xs",
  40: "size-10 text-label",
  56: "size-14 text-lg",
} as const;

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? "?").slice(0, 2);
}

export function Avatar({ name, size = 32, live = false, className = "" }: { name: string; size?: keyof typeof SIZE; live?: boolean; className?: string }) {
  return (
    <span aria-hidden className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-surface font-medium uppercase text-text ${SIZE[size]} ${className}`}>
      {initials(name)}
      {live && (
        <span className="absolute -right-0.5 -bottom-0.5 flex rounded-full border-2 border-app">
          <span className="live-dot size-2 rounded-full bg-accent" />
        </span>
      )}
    </span>
  );
}
