import type { PortfolioItem } from "@/lib/profiles";
import { itemMeta } from "./portfolio-format";

/** Past jobs as visitors see them: cover photo first, then the others. */
export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  return (
    <ul className="flex flex-col gap-8">
      {items.map((item) => {
        const meta = itemMeta(item);
        return (
          <li key={item.id} className="flex flex-col gap-3" aria-label={item.title}>
            <div>
              <h3 className="font-medium">{item.title}</h3>
              {meta && <p className="text-sm text-muted">{meta}</p>}
            </div>
            {item.photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {item.photos.map((p, i) => (
                  <li key={p.id} className={i === 0 ? "col-span-2 row-span-2" : undefined}>
                    <a href={p.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- public Storage URL, already sized by the upload limit */}
                      <img
                        src={p.url}
                        alt={`${item.title}, foto ${i + 1}`}
                        loading="lazy"
                        className="h-full w-full rounded-ui border border-border object-cover aspect-[4/3]"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {item.description && <p className="whitespace-pre-line text-sm">{item.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}
